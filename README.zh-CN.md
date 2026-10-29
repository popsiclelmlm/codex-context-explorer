# Context Explorer for Codex

[English](README.md) · 简体中文

**看清上下文占用，按轮次回看 Agent 的工作过程。**

Context Explorer 把本地 Codex 会话日志整理成可交互的报告，让你直观看到上下文组成、消息、工具调用和用量。适合定位较大的工具输出、排查重复调用，也方便在长会话中回看任务是如何推进的。

*当前为源码预览：本地 MCP 通信和浏览器报告已检查，干净机器安装与原生宿主面板仍待验收。[查看发布状态](PUBLICATION.md)。*

## 它能帮你做什么？

| 你想解决的问题 | 可以怎样使用 |
| --- | --- |
| 上下文主要被什么占用？ | 用多色环形图与横向占用条查看指令、规则、技能、工具和对话；悬停或聚焦分块，查看对应类别占比。 |
| Agent 是怎么完成任务的？ | 按“会话 → 轮次 → 消息 / 工具调用 / 结果”回看全过程，保留日志原始顺序。 |
| 为什么出现重复调用或大段输出？ | 展开相关条目，结合 token 数、正文和前后步骤逐项检查。 |
| 想回看另一个任务，不想翻日志文件？ | 按真实名称切换最近 20 个主会话，直接查看对应记录。 |
| 想了解一段会话的用量？ | 一起查看累计 tokens、已记录请求次数和 API 参考费用。 |
| 想在工作时随手查看？ | 页面自动刷新，正文按需读取，支持复制摘要、中英文和浅色 / 深色 / 跟随系统主题。 |

页面刷新和条目展开直接读取本地数据，不额外发起模型回答。采集器只读会话，不修改或自动压缩聊天。

## 界面预览

以下截图全部使用**合成演示数据**：项目名称、会话内容、token 数和参考费用均为示例。截图展示浏览器报告，不代表原生插件宿主已完成验收。

### 一眼看清上下文组成

用总览了解各类内容的占用，再按需要查看具体类别和会话记录。

![中文浅色上下文总览](docs/screenshots/overview-zh-light.png)

### 沿着轮次查看消息与工具结果

展开一轮对话，回看用户请求、助手回复、工具调用及其结果；需要进一步排查时，再打开对应正文。

![会话轮次、工具调用与结果正文](docs/screenshots/conversation-zh-light.png)

<details>
<summary>英文深色主题与悬停高亮</summary>

![英文深色主题下查看 Skills 占比](docs/screenshots/hover-en-dark.png)

</details>

## 如何理解统计数据

分类来自日志可见文本的本地分词，不能完整计入隐藏指令、图片和加密推理。灰色未分配区可能仍包含不可见内容；可切换图表口径查看日志记录的最近请求。

最近 500 个片段可展开，单条正文最多显示 8000 字符；压缩后无法恢复的原轮次会单独标注。API 参考费用使用带核价日期的单价表，不代表订阅账单或实际额度扣减。详细统计口径可从界面右上角的信息图标打开。

## 目录

```text
.agents/plugins/marketplace.json   Codex 仓库市场清单
plugins/context-explorer/         插件源码和构建产物
  ui/                            界面、图表与开源 SVG
  backend/                       Python 日志与用量解析器（仅标准库）
  server.mjs / bridge.py          MCP 服务端源码与采集器桥接
  dist/                          构建产物：单文件服务端、界面资源与第三方许可证
  package.json / requirements.txt 构建依赖与可选分词依赖
LISTING.zh-CN.md                  市场说明草稿
PUBLICATION.md                    当前发布状态及待办
```

## 本地准备

运行时只需要 Node.js 22+、Python 3 和可供读取的本机 Codex 日志：服务端及其 npm 依赖已打包为 dist/server.mjs，安装后的插件无需 node_modules；采集器只用 Python 标准库，tiktoken 为可选。运行时优先使用插件目录的 .venv，也可用 CONTEXT_EXPLORER_PYTHON 指定 Python 可执行文件；未提供虚拟环境时回退到 PATH 中的 Python。找不到 Python 时工具调用会返回明确错误；采集器意外退出后，下一次请求会自动重启它。

开发与构建（含可选分词依赖），macOS / Linux 示例，在项目根目录执行：

```sh
cd plugins/context-explorer
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
TIKTOKEN_CACHE_DIR=backend/tokenizer-cache .venv/bin/python -c "import tiktoken; tiktoken.get_encoding('o200k_base')"
npm run build
.venv/bin/python verify-turns.py
```

首次安装依赖和词表需要联网；采集器运行时不自动下载词表。词表缺失时，可见文本 token 估算显示为未知。Windows 的虚拟环境命令不同，尚未验证完整安装流程。

本仓库不包含 node_modules、虚拟环境、编译后的分词依赖、词表缓存、真实会话、临时预览凭据或历史验证截图。dist 构建产物需提交，供宿主直接加载；修改 server.mjs 或 ui/ 后须重新执行 npm run build。

## 安装仓库市场

在本项目根目录执行：

```sh
codex plugin marketplace add .
codex plugin add context-explorer@codex-context-explorer
```

插件缓存副本无需 node_modules 或虚拟环境即可运行；如需可见文本 token 估算，需在缓存副本中另行准备 tiktoken 与 o200k_base 词表。干净机器安装和原生面板加载仍待验收，以上不是已经验证的公开发行流程。

独立页面开发预览：在插件目录执行 .venv/bin/python preview.py，使用终端打印的本机网址。预览只读真实本地日志，不等同于原生面板验证。

MCP 检查：在插件目录执行 npm run build 后再执行 npm run verify:mcp，检查对象是打包后的 dist/server.mjs。默认读取最近活动主会话，可用 CONTEXT_EXPLORER_SESSION_ID 指定会话；检查结果写入已忽略的 verification.json。

## 发布与数据处理

此仓库公开项目源码。GitHub 仓库市场分发方案仍在完善，当前不保证开箱即用；公开源码不等同于 OpenAI 插件目录上架。

插件没有开发者数据接收端或遥测。工具摘要和按需读取的数据交由 Codex 宿主处理，宿主数据政策继续适用。演示截图已经审阅并收录；仍需完成干净环境与原生面板验收。

Lucide 的完整上游许可证保留在 ui/icons/LICENSE 和 dist/LICENSE-lucide.txt；图标版本见 ui/icons/SOURCE.json。项目代码使用 [MIT](LICENSE)，第三方代码和图标的许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；打包进 dist/ 的全部 npm 依赖及其许可证原文由构建生成在 dist/THIRD_PARTY_LICENSES.txt。
