# markdown GPTs 帮助

## 说明

> 这里只是一个演示，主要告诉用户如何使用 markdown 和嵌入代码

### 读取本地文件

```js
// 加入文件
const fs = await import("fs");
const path = await import("path");
return fs.readFileSync(path.join(__dirname, "usage.md"), `utf8`);
```