import { Annotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { allTools, setActivePage } from "./tools.js";
import { getPage } from "../browser.js";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
}).bindTools(allTools);

const toolNode = new ToolNode(allTools);

function shouldContinue(state: typeof AgentState.State) {
  const last = state.messages.at(-1);
  if (!last) return "__end__";
  const msg = last as BaseMessage & { tool_calls?: unknown[] };
  return msg.tool_calls && msg.tool_calls.length > 0 ? "tools" : "__end__";
}

const graph = new StateGraph(AgentState)
  .addNode("agent", async (state) => {
    const response = await llm.invoke(state.messages);
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

export async function runScrapeAgent(task: string): Promise<string> {
  const page = await getPage();

  setActivePage(page);

  try {
    const result = await graph.invoke({
      messages: [new HumanMessage(task)],
    });

    const last = result.messages.at(-1);
    return last?.content?.toString() ?? "No result";
  } finally {
    await page.close();
  }
}
