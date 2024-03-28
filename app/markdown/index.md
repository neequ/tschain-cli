# test

测试指令

## Usage

> 指令用法

```js
// 加入文件
const fs = await import("fs");
const path = await import("path");
return fs.readFileSync(path.join(__dirname, "usage.md"), `utf8`);
```

## System

> 系统提示词

```js
const fs = await import("fs");
const path = await import("path");
return fs.readFileSync(path.join(__dirname, "system.md"), "utf8");
```
