# Context Explorer for Codex

English · [简体中文](README.zh-CN.md)

**Understand what fills your context. Follow the work, turn by turn.**

Context Explorer turns local Codex session logs into an interactive report of context composition, messages, tool calls and usage. Find large outputs, retrace an agent's steps, and review a long session without digging through raw logs.

*Source preview: local MCP and browser-report checks have passed; clean-machine and native-panel validation remain in progress. [Release status](PUBLICATION.md).*

## What can you use it for?

| When you want to… | Context Explorer helps you… |
| --- | --- |
| Understand what occupies the context window | See instructions, rules, skills, tools and conversation in a colored ring and usage bar; hover or focus a category to inspect its share. |
| Review how an agent approached a task | Follow messages, tool calls and results within each conversation turn, in their original order. |
| Investigate repeated calls or large tool outputs | Open the relevant entry, inspect retained text and its token count, and see the surrounding steps. |
| Revisit another task | Switch between the latest 20 named main sessions without searching log files. |
| Understand recorded usage | Review cumulative tokens, request counts and an API-rate cost reference alongside the session. |
| Keep a report open while working | Use automatic refresh, on-demand text and copied summaries, with English / Chinese and light / dark / system themes. |

Page refreshes and entry expansion read local data directly; they do not trigger an extra model response. The collector does not modify or compact your conversations.

## See it in action

All screenshots below use **synthetic demonstration data**, including session text, project names, token counts and the cost reference. They show the browser report, not a verified native-host installation.

### Find where context goes

The overview puts context composition, category shares and session usage together. Move over a segment to isolate the category you want to inspect.

![English dark theme with Skills highlighted](docs/screenshots/hover-en-dark.png)

### Follow the conversation, then inspect the evidence

Expand a turn to review what was requested, which tools ran and what they returned. Open an individual result when you need its retained text.

![Conversation turns, tool calls and an expanded result](docs/screenshots/conversation-zh-light.png)

<details>
<summary>Chinese light-theme overview</summary>

![Chinese light-theme context overview](docs/screenshots/overview-zh-light.png)

</details>

## What the numbers mean

Category counts use a local tokenizer over visible log text. Hidden instructions, images and encrypted reasoning are not fully represented, and gray space may include unseen content. Switch the chart basis to inspect the latest request recorded in the log.

Only the latest 500 text fragments retain expandable text; each displays up to 8,000 characters. Unrecoverable original turns in compacted history are labeled. The dated API-rate reference is not a subscription bill or quota deduction.

## How to use it after installation

1. Confirm that the plugin is installed and enabled in the Codex desktop app, with Node.js 22+ and Python 3 available to its runtime.
2. **Start a new local chat**, type `@`, select **Context Explorer**, then ask:

   > Open the context report.

3. Check the session name before inspecting the report. It defaults to the most recently active main session, which may differ from the current chat. You can select among the latest 20 main sessions.
4. Hover or focus the ring or legend to inspect a category. Expand **Conversation → Turn → Entry** to read messages, tool calls and retained results.
5. Use the top-right icons for language, theme and accounting details. The report refreshes every five seconds while visible; manual refresh, expansion and copied summaries are also available.

**Native-panel validation is still in progress.** If a new chat has no tool entry, check that the plugin is enabled, then fully quit and reopen the desktop app. A successful tool call alone does not confirm that the host can display the panel.

### Use the browser report

The browser report can run independently. Clone `main` and start it from a terminal:

```sh
git clone --branch main https://github.com/popsiclelmlm/codex-context-explorer.git
cd codex-context-explorer
python3 plugins/context-explorer/preview.py
```

Open the loopback URL printed by the process. Keep the terminal running; press `Ctrl+C` to stop it. This mode reads real local logs, so keep its URL key and screenshots of personal conversations private.

The browser report runs with the Python standard library and the committed HTML; no npm build is required. Visible-text tokenization additionally needs optional tiktoken and its cache. Without them, those counts remain unknown while recorded request usage remains readable. See **Local development** below for setup. The source checkout and installed plugin cache are separate locations; tokenizer setup must be available to the copy that actually runs.

## Repository layout

```text
.agents/plugins/marketplace.json  Repository marketplace catalog
plugins/context-explorer/        Plugin source and built UI
  ui/                           UI, charts, translations, SVG icons
  backend/                      Local log and usage readers
  server.mjs / bridge.py         MCP server and Python bridge
  dist/                         Built single-file MCP server, HTML resource and license notices
```

## Local development

Requires Node.js 22+, Python 3.10+, and local Codex session logs. macOS / Linux example, from the repository root:

```sh
cd plugins/context-explorer
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
TIKTOKEN_CACHE_DIR=backend/tokenizer-cache .venv/bin/python -c "import tiktoken; tiktoken.get_encoding('o200k_base')"
npm run build
.venv/bin/python verify-turns.py
```

Dependency installation and the initial tokenizer cache download require a network connection. The running collector never downloads a tokenizer automatically. Without a cache, visible-text token counts remain unknown.

`npm run build` bundles the MCP server and its npm dependencies into `dist/server.mjs`, so an installed plugin needs no `node_modules`; rebuild and commit `dist/` after changing `server.mjs` or `ui/`. At runtime the plugin needs only Node.js 22+ and Python 3: the collector uses the standard library, and tiktoken is optional.

The server prefers the plugin-local `.venv`; `CONTEXT_EXPLORER_PYTHON` can override its Python executable. Otherwise it uses Python from `PATH`. If Python cannot be started, tool calls return an explicit error; if the collector exits, the next request restarts it. Windows installation has not been verified.

For a standalone development report, run `.venv/bin/python preview.py` inside the plugin directory and open its printed loopback URL. This is a development preview, not proof of native host integration.

## Codex repository marketplace

The catalog name is `codex-context-explorer`; the plugin name is `context-explorer`. The repository can be registered as a marketplace source:

```sh
codex plugin marketplace add popsiclelmlm/codex-context-explorer --ref main
codex plugin add context-explorer@codex-context-explorer
```

**Installation is still being validated.** The installed plugin cache runs without `node_modules` or a virtual environment, but visible-text token estimates stay unknown unless tiktoken and its `o200k_base` cache are prepared in that cache. Clean-machine and native-panel validation are still pending; see [PUBLICATION.md](PUBLICATION.md).

## Privacy

The collector reads local Codex logs and session-name metadata. It does not include a developer upload endpoint or telemetry. Tool summaries and on-demand panel data are processed by the Codex host under its data policies.

The included screenshots use synthetic data. No personal logs, live preview keys, screenshots of real sessions, machine-specific runtime paths, or dependency caches are included. Commit identity checks use GitHub `noreply` addresses; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Project-authored code is licensed under [MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled dependencies and Lucide icons; the build also writes every dependency bundled into `dist/` to `plugins/context-explorer/dist/THIRD_PARTY_LICENSES.txt`.
