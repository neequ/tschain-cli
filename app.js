#!/usr/bin/env node

// Config stuff
import dotenv from 'dotenv'
dotenv.config()

// file system stuff
import fs from 'fs';
import path from 'path';
import untildify from 'untildify'
import downloadsFolder from 'downloads-folder'

// I/O stuff
import readline from 'readline'

// Terminal UX stuff e.g. markdown, images, speech, clipboard etc
import ora from 'ora'                       // Show spinners in terminal
import chalk from 'chalk'                   // Terminal font colors
import cliMd from 'cli-markdown'            // Show markdown in terminals
import terminalImage from 'terminal-image'  // Show images in terminals
import clipboard from 'clipboardy'          // Terminal clipboard support
import say from 'say'                       // Text to speech for terminals

// Web
import { google } from 'googleapis'
import got from 'got'
import { URL } from 'url'

// GPT stuff
// TODO: Move to langchain client and prompt templates
// TODO: streaming + cancellation
import { Configuration as OpenAIConfig, OpenAIApi, ChatCompletionRequestMessageRoleEnum as Role } from 'openai'
import { encode } from 'gpt-3-encoder'

// langchain stuff
import { OpenAI } from 'langchain/llms/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { loadSummarizationChain, AnalyzeDocumentChain } from 'langchain/chains'

// Document loaders
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import { PlaywrightWebBaseLoader } from 'langchain/document_loaders/web/playwright'
import utils from './utils/index';

let appFolder = `app_demo`;

// app.js 或你的主脚本文件
const args = process.argv.slice(2); // 移除前两个元素，获取额外的参数
console.log(args); // 这会打印出 ["app_demo"] 如果你传递了 "app_demo" 作为参数
// 你可以根据传入的参数来调整你的应用行为
if (args[0]) {
  appFolder = args[0];
  console.log(`运行应用 ${appFolder} ...`);
}

// 获取 app 配置文件
const app = global.app = utils.parseMarkdownToTree(fs.readFileSync(`./${appFolder}/index.md`, 'utf-8'));

const config = {
  chatApiParams: {
    model: process.env.MODEL, //Note: When you change this, you may also need to change the gpt-3-encoder library
    max_tokens: 2048,
    temperature: 0.5
  },
  summaryPages: 10,
  downloadsFolder: downloadsFolder(),
  imageApiParams: {},
  terminalImageParams: { width: '50%', height: '50%' },
  textSplitter: { chunkSize: 200, chunkOverlap: 20 },
  googleSearchAuth: {
    auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  },
  openAiApiKey: process.env.OPENAI_API_KEY
}

const prompts = {
  next: () => {
    rl.resume()
    console.log('───────────────────────────────')
    rl.prompt()
  },
  imagePhrase: '[img]',
  webBrowsing: {
    needed: [
      "没有实时访问权限",
      "没有实时信息访问权限",
      "没有实时信息",
      "无法提供实时信息",
      "没有实时信息",
      "根据我的训练数据",
      "截至2021年9月",
      "截至我的编程截止日期"
    ],
    forcePhrase: '[web]',
    /***********************************************************************************************************************/
    preFacto: (query, result) =>
      `你能回答“${query}”吗？
我还找到了以下针对同一查询的网络搜索结果：

${result}

如果需要，随时可以用上述搜索结果中的有用信息来增强你的回答。
`,
    /***********************************************************************************************************************/
    postFacto: (query, result) =>
      `我找到了以下针对“${query}”的最新网络搜索结果：

${result}

利用上述搜索结果，你现在能对${query}做出最佳猜测吗？
省略关于此信息可能不准确或可能更改的免责声明。
简短回答，不要说“基于搜索结果”。
顺便说一下，现在的日期和时间是${new Date().toLocaleString()}。如果需要，可以在你的回答中提及。
`
  },
  /***********************************************************************************************************************/
  chatWithDoc: (query, docs) =>
    `我收到了以下查询：${query}

以下是我拥有的一些文档中与我的查询上下文可能有用的相关摘录：

${docs.map(doc => doc.pageContent).join('\n')}

请尽你所能回答原始查询`,

  /***********************************************************************************************************************/
  errors: {
    missingOpenAiApiKey: chalk.redBright('必须设置 OPENAI_API_KEY (查看 https://platform.openai.com/account/api-keys).'),
    missingGoogleKey: '无法进行网页搜索，因为没有设置 GOOGLE_CUSTOM_SEARCH_CONFIG',
    noResults: '没有找到搜索结果',
    nothingToCopy: '历史记录为空，没有内容可以复制',
    nothingToSay: '还没有消息，没有内容可以朗读'
  },
  info: {
    usage: app.usage,
    exported: (file) => chalk.italic(`聊天记录已保存到${file}`),
    onExit: chalk.italic('再见！'),
    onClear: chalk.italic('聊天历史已清除！'),
    onSearch: chalk.italic('正在搜索网络'),
    searchInfo: chalk.italic('(inferred from Google search)'),
    onQuery: chalk.italic(`正在查询 ${config.chatApiParams.model}'`),
    onImage: chalk.italic('正在生成图片'),
    imageSaved: (file) => chalk.italic(`图片已保存到 ${file}`),
    onDoc: (file, finish) => chalk.italic(finish ? `已处理 ${file}。这是前 ${config.summaryPages} 页的摘要：` : `正在处理 ${file}`),
    onCopy: (text) => chalk.italic(`已将最后一条消息复制到剪贴板（${text.length} 字符）`)
  }
}

const systemCommands = prompts.info.usage.split(/\r?\n/)
  .filter(s => s.trim().startsWith('*'))
  .flatMap(s => s.split(':')[0].split(' '))
  .map(s => s.trim())
  .filter(s => s.length > 3)

if (!config.openAiApiKey) {
  console.error(prompts.errors.missingOpenAiApiKey)
  process.exit(-1)
}

class DocChat {
  static embeddings = new OpenAIEmbeddings({ openAIApiKey: config.openAiApiKey })
  static textSplitter = new RecursiveCharacterTextSplitter(config.textSplitter)

  static summarizer = new AnalyzeDocumentChain({ combineDocumentsChain: loadSummarizationChain(new OpenAI({ temperature: 0 })) })

  static isSupported = (file) => DocChat.toText(file, true)

  static isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch (err) {
      return false
    }
  }

  static toText = (file, checkOnly = false) => {
    if (DocChat.isValidUrl(file)) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load()
    file = untildify(file)
    if (!fs.existsSync(file)) return checkOnly ? false : Promise.reject(`Missing file: ${file}`)
    // TODO: support directories
    // if (fs.lstatSync(file).isDirectory()) {
    //   const children = fs.readdirSync(file).filter(f => !fs.lstatSync(f).isDirectory())
    //   return checkOnly ? children.some(c => DocChat.toText(c, checkOnly)) : Promise.all(children.map(c => DocChat.toText))
    // }
    if (file.endsWith('.html')) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load()
    if (file.endsWith('.pdf')) return checkOnly ? true : new PDFLoader(file).load()
    if (file.endsWith('.docx')) return checkOnly ? true : new DocxLoader(file).load()
    if (file.endsWith('.text') || file.endsWith('.md')) return checkOnly ? true : new TextLoader(file).load()
    return checkOnly ? false : Promise.reject('Unsupported file type')
  }

  constructor() {
    this.clear()
  }

  // 改造后的 add 函数
  add = (file) => {
    // 构建完整的文件路径
    const fullPath = path.isAbsolute(file) ? file : path.join(appFolder, file);

    // 现在使用 fullPath 而不是 file
    return DocChat.toText(fullPath)
      .then(docs => DocChat.textSplitter.splitDocuments(docs))
      .then(docs => {
        this.vectorStore.addDocuments(docs);
        this.hasDocs = true;

        const text = docs.slice(0, config.summaryPages).map(doc => doc.pageContent).join('');

        return DocChat.summarizer.call({ input_document: text }).then(res => res.text.trim());
      });
  }

  clear = () => {
    this.vectorStore = new MemoryVectorStore(DocChat.embeddings)
    this.hasDocs = false
  }

  query = (query) => this.vectorStore.similaritySearch(query, Math.floor(config.chatApiParams.max_tokens / config.textSplitter.chunkSize))
}

class History {
  constructor() {
    this.clear()
  }

  add = (message) => {
    // OpenAI recommends replacing newlines with spaces for best results
    if (message.role === Role.User) message.content = message.content.replace(/\s\s+/g, ' ').trim()
    message.numTokens = encode(message.content).length
    this.history.push(message)
    while (this.totalTokens() > config.chatApiParams.max_tokens) {
      const idx = this.history.findIndex(msg => msg.role !== Role.System)
      if (idx < 0) break
      this.history.splice(idx, 1)
    }
  }

  totalTokens = () => this.history.map(msg => msg.numTokens).reduce((a, b) => a + b, 0)

  clear = () => {
    let that = this;

    setTimeout(async function () {

      that.history = []
      // 加入系统提示词
      if (app.system) {
        that.add({ role: Role.System, content: app.system })
      }

      // 初始化文档
      if (app.document) {
        // 使用 AsyncFunction 构造器创建一个新的异步函数
        // 注意，AsyncFunction 的参数是动态的，最后一个参数是函数体，其余的都是函数参数
        const dynamicAsyncFunction = new utils.AsyncFunction('docChat', app.document);
        await dynamicAsyncFunction(docChat)
      }
    }, 0)
  }

  get = () => this.history.map(msg => ({ role: msg.role, content: msg.content }))

  lastMessage = () => this.history.findLast(item => item.role === Role.Assistant)

  show = () => console.log(this.history)
}

const openai = new OpenAIApi(new OpenAIConfig({ apiKey: config.openAiApiKey }))
const history = new History()
const docChat = new DocChat()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    if (line.includes('/')) {
      const dir = line.substring(0, line.lastIndexOf('/') + 1)
      if (fs.existsSync(untildify(dir))) {
        const suffix = line.substring(line.lastIndexOf('/') + 1)
        const hits = fs.readdirSync(untildify(dir)).filter(file => file.startsWith(suffix)).map(file => dir + file)
        if (hits.length) return [hits, line]
      }
    }
    const hits = systemCommands.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : systemCommands, line]
  }
}).on('close', () => console.log(prompts.info.onExit))

// TODO: True multiline support e.g. pasting (Blocked by https://stackoverflow.com/questions/66604677/)
process.stdin.on('keypress', (letter, key) => {
  if (key?.name === 'pagedown') {
    rl.write(' ')
    process.stdout.write('\n')
  }
})

const googleSearch = (query) => config.googleSearchAuth.auth && config.googleSearchAuth.cx ?
  google.customsearch('v1').cse
    .list(Object.assign(config.googleSearchAuth, { q: query }))
    .then(response => response.data.items.filter(result => result.snippet).map(result => result.snippet))
    .then(results => results.length ? Promise.resolve(results.join('\n')) : Promise.reject(prompts.errors.noResults))
  : Promise.reject(prompts.errors.missingGoogleKey)

console.log(prompts.info.usage)
prompts.next()

rl.on('line', (line) => {
  // debugger;
  say.stop()
  switch (line.toLowerCase().trim()) {
    case '': return prompts.next()
    case 'q': case 'quit': case 'exit': return rl.close()
    case '?': case 'help': {
      console.log(prompts.info.usage)
      return prompts.next()
    }
    case 'clr': case 'clear': {
      history.clear()
      docChat.clear()
      console.log(prompts.info.onClear)
      return prompts.next()
    }
    case 'h': case 'history': {
      history.show()
      return prompts.next()
    }
    case 'export': {
      const file = `${config.downloadsFolder}/${Date.now()}.chatml.json`
      fs.writeFileSync(file, JSON.stringify(history.get()))
      console.log(prompts.info.exported(file))
      return prompts.next()
    }
    // TODO case 'import': import saved history
    case 'say': case 'speak': {
      const content = history.lastMessage()?.content
      console.log(`正在朗读"${content}"`)
      if (content) say.speak(content)
      else console.warn(prompts.errors.nothingToSay)
      return prompts.next()
    }
    case 'cp': case 'copy': {
      const content = history.lastMessage()?.content
      if (content) {
        clipboard.writeSync(content)
        console.log(prompts.info.onCopy(content))
      } else console.warn(prompts.errors.nothingToCopy)
      return prompts.next()
    }
    default: {
      rl.pause()
      let spinner = ora().start()
      const chat = (params) => {
        const promptEngineer = () => {
          if (params.message.includes(prompts.webBrowsing.forcePhrase)) {
            spinner.text = prompts.info.onSearch
            params.message = params.message.replace(prompts.webBrowsing.forcePhrase, ' ').trim()
            return googleSearch(params.message).then(result => prompts.webBrowsing.preFacto(params.message, result))
          } else if (docChat.hasDocs) {
            return docChat.query(params.message).then(docs => docs.length ? prompts.chatWithDoc(params.message, docs) : params.message)
          } else {
            return Promise.resolve(params.message)
          }
        }
        const makeRequest = (prompt) => {
          spinner.text = prompts.info.onQuery
          history.add({ role: Role.User, content: prompt })
          return openai.createChatCompletion(Object.assign(config.chatApiParams, { messages: history.get() }))
            .then(res => {
              const message = res.data.choices[0].message
              history.add(message)
              const content = message.content
              const needWebBrowsing = !params.nested && prompts.webBrowsing.needed.some(frag => content.toLowerCase().includes(frag))
              const output = cliMd(content).trim()
              if (needWebBrowsing) {
                spinner.warn(chalk.dim(output))
                spinner = ora().start(prompts.info.onSearch)
                //TODO: Ask gpt for a better query here
                return googleSearch(params.message).then(text => chat({ message: prompts.webBrowsing.postFacto(line, text), nested: true }))
              }
              spinner.stop()
              return Promise.resolve(console.log(output))
            })
        }
        return promptEngineer().catch(_ => Promise.resolve(params.message)).then(makeRequest)
      }

      const genImage = (prompt) => {
        spinner.text = prompts.info.onImage
        return openai.createImage(Object.assign(config.imageApiParams, { prompt: prompt }))
          .then(response => got(response.data.data[0].url).buffer())
          .then(buffer => {
            const file = `${config.downloadsFolder}/${prompt.replace(/ /g, "_")}.jpg`
            fs.writeFileSync(file, buffer);
            spinner.succeed(prompts.info.imageSaved(file))
            return file
          })
          .then(file => terminalImage.file(file, config.terminalImageParams))
          .then(res => console.log(res))
      }

      const consumeDoc = (file) => {
        spinner.text = prompts.info.onDoc(file, false)
        return docChat.add(file).then(summary => {
          spinner.succeed(prompts.info.onDoc(file, true))
          console.log(summary)
        })
      }

      let task = undefined
      if (line.includes(prompts.imagePhrase)) task = genImage(line.replace(prompts.imagePhrase, '').trim())
      else if (DocChat.isSupported(line)) task = consumeDoc(line)
      else task = chat({ message: line })

      return task.catch(err => spinner.fail(err.stack ?? err.message ?? err)).finally(prompts.next)
    }
  }
})
