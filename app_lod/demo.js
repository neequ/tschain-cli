import fs from 'fs';
import path from 'path';

import { ChatPromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import dotenv from 'dotenv'
dotenv.config()


function isTextObject(value) {
  // 确认对象是否为包含 text 的对象
  return typeof value === 'object' && value !== null && 'text' in value;
}

function txtFromKeys(json, targetKeys) {
  function findContent(current, targetKey, parentKey = '') {
    // 可能解析为了数字
    targetKey = String(targetKey);
    let resultText = '';

    for (const key in current) {
      if (key == 'text') {
        // 去除 text 字段
        continue;
      }
      const value = current[key];
      const fullKey = key;

      if (isTextObject(value)) {
        if (key === targetKey) {
          // 累加文本内容
          resultText += `${fullKey}: ${value.text}\n`;
        } else if (key.startsWith(targetKey)) {
          // 已经找到节点
          resultText += `${fullKey}: ${value.text}\n`;
        } else if (targetKey.startsWith(key)) {
          // 继续遍历下一级
          let title = String(value.text ?? '');
          if (title) {
            title = title.split('\n')[0];
          }
          resultText += `${fullKey}: ${title}\n`;
        } else {
          // 层级不需要继续遍历
          continue;
        }

        // 递归搜索嵌套对象
        const childContent = findContent(value, targetKey, fullKey);
        if (childContent) {
          resultText += childContent;
        }
      }
    }

    return resultText;
  }

  let txt = "";
  targetKeys.forEach(key => {
    const content = findContent(json, key);
    if (content) {
      txt += content; // 已经格式化，直接添加
    } else {
      // txt += `Content not found for the key: ${key}\n`; // 未找到内容
    }
  });

  return txt.trim();
}



const question = `有哪些福利?`; 

const json = JSON.parse(String(fs.readFileSync(path.join(__dirname, 'source.json'))));

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
const promptValue = await prompt.invoke({ topic: question });
console.log(promptValue);

const promptAsMessages = promptValue.toChatMessages();
console.log(promptAsMessages);

const promptAsString = promptValue.toString();
console.log(promptAsString);


const model = new ChatOpenAI({});

const response = await model.invoke(promptAsString);
console.log(response);

// 假设 response.content 是你从上述操作中获得的字符串 '[1.1]'
const contentString = response.content;

// 使用 JSON.parse 方法将字符串转换为数组
const contentArray = JSON.parse(contentString);

console.log(contentArray);
// 输出将会是一个数组：[1.1]


const txtContent = txtFromKeys(json, contentArray);

const response2 = await model.invoke(`请根据背景知识回答问题,不要编造
背景知识:
${txtContent}
当前问题: 
Q: ${question}
A: 
`);
console.log(response2);

// 假设 response.content 是你从上述操作中获得的字符串 '[1.1]'
const contentString2 = response2.content;
console.log(`最后回答:${contentString2}`);