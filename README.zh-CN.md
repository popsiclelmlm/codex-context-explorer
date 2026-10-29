# codex-context-explorer

[English](README.md) · 简体中文

> 源码预览：MCP 通信和本地报告页已验证；插件缓存依赖安装与原生宿主面板仍待端到端验收。

Context Explorer：按会话轮次查看 Codex 上下文、工具调用与 token 用量的本地只读插件。

## 功能

- 多色环形图、横向占用条与分类图例；默认显示可见文本估算占窗口的比例。分块间有间隙，悬停、键盘聚焦或触摸可查看对应类别占比，其他分块淡化。
- 支持中文与英文界面；支持浅色、深色、跟随系统主题，偏好保存在浏览器中，通过顶部 SVG 图标菜单切换。宿主提供主题时，跟随系统选项优先使用宿主主题。
- Conversation → Turn → 消息、工具调用、结果，按日志原始顺序组织。
- 显示真实会话名称，支持最近 20 个主会话切换。
- 按需展开正文、复制统计摘要；可见时每 5 秒刷新。
- 展示累计 tokens 和历史价格表覆盖部分的 API 等价费用估算。

分类不包含完整隐藏提示、图片和加密推理。灰色未分配区可能含不可见内容；API 参考费用不代表订阅账单或实际额度扣减。统计说明收纳在信息图标中，主界面保留数据和操作。单条正文最多 8000 字符，保留最近 500 个片段；压缩后不可恢复的轮次会标注。

## 目录

```text
.agents/plugins/marketplace.json   Codex 仓库市场清单
plugins/context-explorer/         插件源码和构建产物
  ui/                            界面、图表与开源 SVG
  backend/                       Python 日志与用量解析器
  server.mjs / bridge.py          MCP 与采集器桥接
  dist/                          可直接加载的界面资源
  package.json / requirements.txt 依赖声明
LISTING.zh-CN.md                  市场说明草稿
PUBLICATION.md                    当前发布状态及待办
```

## 本地准备

需要 Node.js 22+、Python 3，以及可供读取的本机 Codex 日志。运行时优先使用插件目录的 .venv，也可用 CONTEXT_EXPLORER_PYTHON 指定 Python 可执行文件；未提供虚拟环境时回退到 PATH 中的 Python。

macOS / Linux 示例，在项目根目录执行：

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

本仓库不包含 node_modules、虚拟环境、编译后的分词依赖、词表缓存、真实会话、临时预览凭据或历史验证截图。保留 dist 构建产物供宿主加载。

## 安装仓库市场

完成依赖准备后，在本项目根目录执行：

```sh
codex plugin marketplace add .
codex plugin add context-explorer@codex-context-explorer
```

安装后检查插件缓存副本是否具备运行依赖；重新复制的插件缓存可能需要单独准备 .venv 和 node_modules。跨机器依赖安装和原生面板加载仍待验收，以上不是已经验证的公开发行流程。

独立页面开发预览：在插件目录执行 .venv/bin/python preview.py，使用终端打印的本机网址。预览只读真实本地日志，不等同于原生面板验证。

MCP 检查：在已准备依赖的插件目录执行 npm run verify:mcp。默认读取最近活动主会话，可用 CONTEXT_EXPLORER_SESSION_ID 指定会话；检查结果写入已忽略的 verification.json。

## 发布与数据处理

此仓库公开项目源码。GitHub 仓库市场分发方案仍在完善，当前不保证开箱即用；公开源码不等同于 OpenAI 插件目录上架。

插件没有开发者数据接收端或遥测。工具摘要和按需读取的数据交由 Codex 宿主处理，宿主数据政策继续适用。公开前仍需完成依赖安装方案、干净环境与原生面板验收、分发许可证和演示素材。

Lucide 的完整上游许可证保留在 ui/icons/LICENSE 和 dist/LICENSE-lucide.txt；图标版本见 ui/icons/SOURCE.json。项目代码使用 [MIT](LICENSE)，第三方代码和图标的许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
