
# TSChain CLI

这是一个不到500行代码的 AI 工具，使用node.js编写，能够在你的终端上运行ChatGPT，支持以下功能：

* [网页浏览](#网页浏览)
* 文本转语音（输入`speak`）
* 图像生成（在提示中任何位置添加`[img]`）
* 聊天历史（输入`h`）
* 导出会话到[ChatML](https://cobusgreyling.medium.com/the-introduction-of-chat-markup-language-chatml-is-important-for-a-number-of-reasons-5061f6fe2a85)（输入`export`）
* 自动补全（按`TAB`键）
* [文件聊天与总结](#与文件聊天)

## 设置

1. 安装node.js，例如使用`brew`：

```shell
brew install node
```

2. 启动应用：

```shell
export OPENAI_API_KEY=XXXXXXXX # 从https://platform.openai.com/account/api-keys获取
npx https://github.com/neequ/tschain-cli.git
```

或者，你可以克隆并运行：

新建.env并配置
```env
# OPENAI API KEY
OPENAI_API_KEY=XXXXXXXX
```

```shell
git clone https://github.com/neequ/tschain-cli.git
cd tschain-cli
yarn && node app.js
```

## Usage
```text
系统命令:
  * clear / clr     : 清除聊天历史
  * copy / cp       : 复制最后一条消息到剪贴板
  * history / h     : 显示当前历史
  * export          : 将当前聊天历史保存为ChatML文档
  * speak / say     : 朗读最后的回应
  * help / ?        : 显示此消息
  * exit / quit / q : 退出程序

使用提示:
  - 多行聊天时按PageDown
  - 使用上/下箭头键浏览之前的消息
  - 在您的提示中任意位置包含[web]以强制进行网络浏览
  - 在您的提示中任意位置包含[img]以生成图像
  - 输入一个本地路径或URL，以摄取其文本并添加到上下文中
  - 输入文件（或文件夹路径）时使用TAB进行路径完成
```

## 网页浏览

一些查询依赖于最新信息，例如：

```markdown
> 今天纽约的天气怎么样？
⚠ 我没有实时信息。请检查天气网站或应用以获取纽约当前的天气情况。
```

要启用浏览功能，你需要设置Google API密钥：

```shell
export GOOGLE_CUSTOM_SEARCH_ENGINE_ID=XXXXX # 从https://www.google.com/cse/create/new获取
export GOOGLE_CUSTOM_SEARCH_API_KEY=XXXXX # 从https://developers.google.com/custom-search/v1/introduction获取
```

现在你将得到：

```markdown
> 今天纽约的天气怎么样？
⚠ 我没有实时信息。请检查天气网站或应用以获取纽约当前的天气情况。
⠸ 正在搜索网络...
✔ 截至2023年4月19日，今天纽约市的天气是多云，温度为67°F（19.4°C）。
```

你也可以通过在提示中任何位置包含`[web]`来强制进行网页浏览。

## 与文件聊天

给出一个文件路径或文件夹（按tab键自动完成路径）：

```javascript
> ~/Downloads/Principles by Ray Dalio.pdf
✔ 已提取~/Downloads/Principles by Ray Dalio.pdf。这是前10页的总结：
雷·达利欧（Ray Dalio）的书《原则》分为三个部分。
第一部分解释了一般原则的目的和重要性。
第二部分解释了雷最基本的生活原则。
第三部分解释了雷的管理原则以及它们如何在桥水（Bridgewater）应用。
雷鼓励读者独立思考，做出清晰的决策，以获得他们想要的东西。
────────────────────────────────────────────────────────────────────────────────────
> 最重要的管理原则是什么？
✔ 根据所提供的摘录，雷·达利欧的管理原则强调清晰沟通、责任划分、决策中的逻辑与理性、不断的反馈与讨论、将正确的人选配到合适的工作、综合和连接点以及解决问题的方法的重要性。
────────────────────────────────────────────────────────────────────────────────────
```

### 与网页聊天

第一次运行报错，请执行：
```shell
npx playwright install
```

```bash
> https://news.sina.cn/2024-03-27/detail-inaptkks3027928.d.html
✔ 已提取https://news.sina.cn/2024-03-27/detail-inaptkks3027928.d.html。这是前10页的总结：
中国经济“开门红”的细节，特别是关于生产、消费、和进出口的最新数据和政策措施。三个部门—商务部、海关总署、和工业信息化部—共同阐述了中国经济持续向好的基础和条件。
───────────────────────────────
```