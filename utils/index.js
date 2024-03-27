export default {
  parseMarkdownToTree: function (markdown) {
    const lines = markdown.split('\n');
    const tree = {};
    let currentKey = '';

    lines.forEach(line => {
      if (line.startsWith('#')) {
        // 获取标题行并清理，作为key
        const key = line.replace(/^#+\s*/, '').trim();
        currentKey = key;
        tree[currentKey] = ''; // 初始化空字符串，以待后续填充
      } else if (line.startsWith('```')) {
        // 如果是代码块起始或结束，忽略
        return;
      } else if (currentKey) {
        // 将非标题行（即代码块行）累加到当前key的值中
        tree[currentKey] += line + '\n';
      }
    });
    return tree;
  }
}