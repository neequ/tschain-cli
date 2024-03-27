import { ChatPromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "@langchain/openai";

import dotenv from 'dotenv'
dotenv.config()

const prompt = ChatPromptTemplate.fromMessages([
  ["system", `请不要回答任何问题
你的任务是根据提问、内容大纲提取回答需要的关联的背景知识序号数组
公司制度背景知识:
1 基本制度
1.1 工作时间
1.2 考勤制度
2 薪酬福利
2.1 薪资发放
2.2 额外工作补贴
2.3 出差补贴
2.4 其他福利
2.5 福利假别
3 报销制度
3.1 报销标准
3.2 报销要求
3.3 虚假报销的处罚
3.4 日常借款管理
4 员工关系管理
4.1 入职管理
4.2 离职管理
4 行政管理制度
5.1 资产领用与管理
5.2 资产归还要求
5.3 公共环境维护
例如: 
"""
Q: 公司的基本制度怎样?
A: [1]
Q: 公司的出差怎么补贴?
A: [2.3]
Q: 离职时薪酬如何发放?
A: [2.1,4.2]
Q: 公司是啥名字?
A: []
注: 当问题和公司制度无关，则返回为空
"""
当前问题: 
Q: {topic}
A: `],
]);
const promptValue = await prompt.invoke({ topic: "工作时间是?" });
console.log(promptValue);

const promptAsMessages = promptValue.toChatMessages();
console.log(promptAsMessages);

const promptAsString = promptValue.toString();
console.log(promptAsString);


const model = new ChatOpenAI({});

const response = await model.invoke(promptAsString);
console.log(response);