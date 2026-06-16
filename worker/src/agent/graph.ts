import { Annotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { allTools, setActivePage, setRunId } from "./tools.js";
import { getPage } from "../browser.js";
import { log } from "../logger.js";

export interface ScrapeResult {
  videos: {
    url: string;
    comments: { author: string; text: string; likes: string }[];
  }[];
}

const SYSTEM_PROMPT = `You are a TikTok research agent with access to a single browser tab. Follow these steps exactly and NEVER call multiple tools in parallel:

STEP 1: Call get_tiktok_video_links with the user's query. Pick the first 5 URLs from the result.

For EACH of the first 5 video URLs, in order, do these three things before moving on:
  1. call navigate_to with the video URL
  2. call get_comments_html
  3. extract the comments from that HTML, then call save_video with the url and the extracted comments

get_comments_html returns the raw, sanitized HTML of the comments section. YOU must read that HTML and extract up to 15 real comments. For each comment pull:
- "author": the commenter's @username/handle
- "text": the actual comment text
- "likes": the like count as a string (a number like "42"); use "0" if you can't tell
Ignore UI noise like "Reply", "View N replies", "Creator", timestamps, and anything that isn't a real comment. If a video has no readable comments, call save_video with an empty comments array.

save_video saves the video to the database immediately. If it returns an error, read the message: fix the data and call save_video again, OR if it tells you to skip, move on to the next video.

When all 5 videos have been saved, reply with a short confirmation like "Done — saved 5 videos." Do NOT dump the comments again.

CRITICAL: You share ONE browser tab. Never call navigate_to more than once at a time. Always navigate_to, THEN get_comments_html, THEN save_video before moving to the next video.`;

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

function shouldContinue(state: typeof AgentState.State) {
  const last = state.messages.at(-1);
  if (!last) return "__end__";
  const msg = last as BaseMessage & { tool_calls?: unknown[] };
  return msg.tool_calls && msg.tool_calls.length > 0 ? "tools" : "__end__";
}

export function parseScrapeResultFromAgentOutput(text: string): ScrapeResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { videos: [] };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ScrapeResult>;
    if (!parsed || !Array.isArray(parsed.videos)) {
      return { videos: [] };
    }

    return parsed as ScrapeResult;
  } catch {
    return { videos: [] };
  }
}

function createGraph() {
  const llm = new ChatOpenAI({
    model: "gpt-4.1-mini",
    temperature: 0,
  }).bindTools(allTools);
  const toolNode = new ToolNode(allTools);

  return new StateGraph(AgentState)
    .addNode("agent", async (state) => {
      const step = state.messages.length;
      log.agent(`step ${step} — invoking LLM`);
      const response = await llm.invoke(state.messages);
      const msg = response as BaseMessage & { tool_calls?: { name: string }[] };

      // The model often narrates what it sees / plans to do alongside its tool
      // calls — surface that so the run is readable live (e.g. during the demo).
      const narration = msg.content?.toString().trim();
      if (narration) {
        log.think(narration);
      }

      if (msg.tool_calls?.length) {
        log.agent(
          `step ${step} — calling tools: ${msg.tool_calls.map((t) => t.name).join(", ")}`,
        );
      } else {
        log.agent(`step ${step} — final answer`);
      }
      return { messages: [response] };
    })
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "agent")
    .compile();
}

let graph: ReturnType<typeof createGraph> | undefined;

function getGraph() {
  if (!graph) {
    graph = createGraph();
  }

  return graph;
}

// The agent shares ONE browser tab and a global active-page ref (see tools.ts),
// so two scrapes running at once would stomp on each other's page. Queue them.
let scrapeChain: Promise<unknown> = Promise.resolve();

export function runScrapeAgent(query: string, runId: string): Promise<void> {
  const run = scrapeChain.then(() => executeScrape(query, runId));
  // keep the chain alive even if one run rejects, so the next one still proceeds
  scrapeChain = run.catch(() => {});
  return run;
}

async function executeScrape(query: string, runId: string): Promise<void> {
  log.info(`Agent started — query: "${query}" (run ${runId})`);
  const page = await getPage();
  setActivePage(page);
  setRunId(runId);

  try {
    await getGraph().invoke(
      {
        messages: [
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(query),
        ],
      },
      { recursionLimit: 40 },
    );
    log.ok(`Agent done — run ${runId}`);
  } finally {
    await page.close();
  }
}
