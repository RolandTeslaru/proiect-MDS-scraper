import { Annotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { allTools, setActivePage } from "./tools.js";
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

STEP 2: For the FIRST video URL — call navigate_to, then call scrape_comments (maxComments=15).
STEP 3: For the SECOND video URL — call navigate_to, then call scrape_comments (maxComments=15).
STEP 4: For the THIRD video URL — call navigate_to, then call scrape_comments (maxComments=15).
STEP 5: For the FOURTH video URL — call navigate_to, then call scrape_comments (maxComments=15).
STEP 6: For the FIFTH video URL — call navigate_to, then call scrape_comments (maxComments=15).

STEP 7: Return ONLY a valid JSON object, no other text:
{
  "videos": [
    {
      "url": "https://www.tiktok.com/@user/video/123456",
      "comments": [
        { "author": "username", "text": "comment text", "likes": "42" }
      ]
    }
  ]
}

CRITICAL: You share ONE browser tab. Never call navigate_to more than once at a time. Always navigate_to THEN scrape_comments before moving to the next video.`;

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
    model: "gpt-4o",
    temperature: 0,
  }).bindTools(allTools);
  const toolNode = new ToolNode(allTools);

  return new StateGraph(AgentState)
    .addNode("agent", async (state) => {
      const step = state.messages.length;
      log.agent(`step ${step} — invoking LLM`);
      const response = await llm.invoke(state.messages);
      const msg = response as BaseMessage & { tool_calls?: { name: string }[] };
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

export async function runScrapeAgent(query: string): Promise<ScrapeResult> {
  log.info(`Agent started — query: "${query}"`);
  const page = await getPage();
  setActivePage(page);

  try {
    const result = await getGraph().invoke({
      messages: [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(query),
      ],
    });

    const last = result.messages.at(-1);
    const text = last?.content?.toString() ?? "{}";
    const parsed = parseScrapeResultFromAgentOutput(text);
    log.ok(`Agent done — ${parsed.videos.length} videos returned`);
    return parsed;
  } finally {
    await page.close();
  }
}
