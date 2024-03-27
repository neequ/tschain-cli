export default {
  /**
   * 获取 AsyncFunction 构造器
   */
  AsyncFunction: Object.getPrototypeOf(async function () { }).constructor,
  
  /**
   * 将 markdown 文本解析到对象
   * @param {*} markdown 
   * @returns 
   */
  parseMarkdownToTree: function (markdown) {
    const lines = markdown.split('\n');
    const tree = {};
    let currentKey = '';
    let inCodeBlock = false; // 用于跟踪是否处于代码块内

    lines.forEach(line => {
      if (line.startsWith('#')) {
        // 获取标题行并清理，作为key
        const key = line.replace(/^#+\s*/, '').trim();
        currentKey = key.toLowerCase();
        tree[currentKey] = ''; // 初始化空字符串，以待后续填充
        inCodeBlock = false; // 确保在遇到新标题时重置代码块标志
      } else if (line.startsWith('```')) {
        // 检查是否为代码块的开始或结束
        inCodeBlock = !inCodeBlock; // 切换状态
      } else if (inCodeBlock && currentKey) {
        // 如果处于代码块内，则累加到当前key的值中
        tree[currentKey] += line.trim() + '\n';
      }
    });

    return tree;
  }
}