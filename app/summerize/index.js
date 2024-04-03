import fs from 'fs';
import path from 'path';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { fileURLToPath } from 'url';
import utils from "../../utils/index";

utils.loadEnv();


// 日志回调处理器
let handler = new ConsoleCallbackHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 构建检索增强生成（RAG）流程
const prompt = ChatPromptTemplate.fromMessages([
  ["human", `"{input}"`],
]);

const chatModel = new ChatOpenAI({
  temperature: 0,
  callbacks: [handler]
});

const outputParser = new StringOutputParser();

const llmChain = prompt.pipe(chatModel).pipe(outputParser);

let rt = await llmChain.invoke({
  input: "hi",
});

console.log("rt", rt);

// // 实现对话功能
// async function haveAChat(message) {
//   // 这里假设`message`是一个字符串，表示用户的输入
//   // 更新对话模板以包含用户的最新消息
//   prompt.pipe("human", message);

//   try {
//     // 使用ChatOpenAI模型生成回答
//     const response = await model.generate(prompt);

//     // 提取并返回回答的文本
//     return response.text; // 或根据需要处理响应
//   } catch (error) {
//     console.error("Error in generating response:", error);
//     return "Sorry, I encountered an error while trying to respond.";
//   }
// }

// haveAChat("How's the weather today?").then(console.log);