# Context Explorer for Codex

English · [简体中文](README.zh-CN.md)

See what fills your Codex context window, right in the sidebar, and step through the session turn by turn: messages, tool calls and their results.

![Context overview in the dark theme](docs/screenshots/hover-en-dark.png)

> **Status: early preview.** Works in the Codex desktop app on macOS, and installing from GitHub has been tested on a clean macOS setup. Linux and Windows are untested. See [PUBLICATION.md](PUBLICATION.md).

## Install

Requires Node.js 22+ and Python 3.9+ (the Python that ships with macOS works).

```sh
codex plugin marketplace add popsiclelmlm/codex-context-explorer --ref main
codex plugin add context-explorer@codex-context-explorer
```

`context-explorer@codex-context-explorer` means plugin `context-explorer` from marketplace `codex-context-explorer`. If the plugin doesn't show up afterwards, make sure it is enabled and restart the desktop app.

To update, run `codex plugin marketplace upgrade codex-context-explorer`, then the `codex plugin add` command above again, and restart the desktop app.

## Use

In a local Codex chat, send:

```text
@Context Explorer open the context report
```

The report opens in the sidebar browser and shows the context usage of the most recently active session, which is normally the chat you are in. It refreshes every 5 seconds while visible, without calling the model. To look at another session, pick it from the menu at the top.

## Features

- Context breakdown by category: system prompt, tools/MCP, rules, skills, subagents and conversation.
- Conversation → turn → messages, tool calls and results, in log order. Text loads only when you expand an entry.
- Switch between the 20 most recent main sessions.
- Session token totals and an API-rate cost reference.
- English and Chinese; light, dark and system themes.

![Conversation turns with an expanded tool result](docs/screenshots/conversation-zh-light.png)

Screenshots use synthetic data.

## About the numbers

- Category sizes come from tokenizing the visible log text locally with `o200k_base` (bundled, no setup needed). Hidden instructions, images and encrypted reasoning can't be counted, so the gray part of the chart may include content you can't see.
- Only the latest 500 text fragments keep their text, up to 8,000 characters each.
- The cost is an API-rate reference, not your subscription bill.

## Without the plugin

The same report can run as a local web page:

```sh
git clone https://github.com/popsiclelmlm/codex-context-explorer.git
python3 codex-context-explorer/plugins/context-explorer/preview.py
```

Open the printed `127.0.0.1` URL; `Ctrl+C` stops the server. The URL contains an access key, so don't share it. This page runs without Node, so token estimates need the optional `tiktoken` package and its cache (`requirements.txt`); otherwise they show as unknown.

## Development

```sh
cd plugins/context-explorer
npm ci
npm run build
python3 verify-turns.py
npm run verify:mcp   # reads your most recent local session
```

`npm run build` bundles the MCP server, its npm dependencies and the `o200k_base` tokenizer into `dist/server.mjs` and the UI into `dist/report.html`, so installed copies don't need `node_modules` or tiktoken. Commit `dist/` after changing `server.mjs` or `ui/`. The Python collector uses only the standard library; set `CONTEXT_EXPLORER_PYTHON` to choose a specific interpreter.

```text
.agents/plugins/marketplace.json   marketplace catalog
plugins/context-explorer/
  server.mjs    MCP server
  bridge.py     Python collector entry point
  backend/      log parsing and pricing
  ui/           report UI
  dist/         build output (committed)
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before committing.

## Privacy

The plugin reads session logs and session names under `~/.codex`. It makes no network requests and has no telemetry. Message text goes only to the report panel, never into the model's tool result.

## License

MIT. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `plugins/context-explorer/dist/THIRD_PARTY_LICENSES.txt`.
