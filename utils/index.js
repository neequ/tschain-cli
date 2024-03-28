import utils from '../utils/index';
export default {
  /**
   * 获取 AsyncFunction 构造器
   */
  AsyncFunction: Object.getPrototypeOf(async function () { }).constructor,

  /**
   * 将 markdown 文本中的代码块和正文解析到对象中
   * @param {*} markdown 
   * @returns 
   */
  parseMarkdownToTree: function (markdown) {
    const lines = markdown.split('\n');
    const tree = {};
    let currentSection = 'content'; // 默认section
    tree[currentSection] = { content: '' }; // 初始化
    let inCodeBlock = false;
    let codeLanguage = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```') && !inCodeBlock) {
        // 开始代码块
        inCodeBlock = true;
        codeLanguage = line.substring(3).trim(); // 提取代码语言
        if (!tree[currentSection][codeLanguage]) { // 如果还没有这种语言的键
          tree[currentSection][codeLanguage] = '';
        }
      } else if (line.startsWith('```') && inCodeBlock) {
        // 结束代码块
        inCodeBlock = false;
        codeLanguage = ''; // 重置代码语言
      } else if (inCodeBlock && codeLanguage) {
        // 处于代码块内
        tree[currentSection][codeLanguage] += line.trim() + '\n';
      } else if (!inCodeBlock && line.startsWith('#')) {
        // 遇到新的标题行，切换当前部分
        const sectionName = line.replace(/^#+\s*/, '').trim().toLowerCase();
        currentSection = sectionName;
        if (!tree[currentSection]) {
          tree[currentSection] = { content: '' }; // 初始化新section
        }
      } else if (!inCodeBlock) {
        // 处理非代码块文本
        if (line.trim() !== '') { // 避免空行
          tree[currentSection].content += line.trim() + '\n';
        }
      }
    });
    return tree;
  },

  /**
   * 根据 key 获取文本内容
   * @param {*} obj markdown 解析后的对象
   * @param {*} __filename 当前文件，用于脚本处理
   * @param {*} __dirname 当前文件所在目录，用于脚本处理
   */
  markdownObjToText: async function (obj, __filename, __dirname) {
    if (!obj) {
      return '';
    }
    if (obj.js) {
      //执行js
      try {
        const dynamicAsyncFunction = new utils.AsyncFunction('__filename', '__dirname', obj.js);
        return await dynamicAsyncFunction(__filename, __dirname)
      }
      catch (e) {
        console.error(e);
      }
    }
    if (obj.content) {
      return obj.content;
    }
    return '';
  }
}