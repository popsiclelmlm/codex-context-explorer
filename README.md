# codex-context-explorer

English · [简体中文](README.zh-CN.md)

A local, read-only context explorer for Codex: inspect context usage, follow conversation turns, and browse messages and tool activity.

**Source preview.** MCP communication and the standalone report page have been checked locally. Native host UI and dependency setup inside the installed plugin cache still need end-to-end validation. This is not yet a verified one-step marketplace installation.

## Features

- Segmented context ring and usage bar, with matching category colors.
- Hover or focus a segment to see its share of the context window.
- Conversation → turn → messages, tool calls and results, in original log order.
- Session names and switching between the latest 20 main local sessions.
- On-demand text loading, copied summaries, and refreshes while the page is visible.
- Chinese / English and light / dark / system theme controls.
- Recorded token totals and an API-rate cost reference, with accounting details available from the information icon.

Visible text is counted with a local proxy tokenizer; it cannot reconstruct all hidden context. The gray region may include unseen content. The cost reference uses a dated rate table and is not a subscription bill or quota deduction.

## Repository layout

```text
.agents/plugins/marketplace.json  Repository marketplace catalog
plugins/context-explorer/        Plugin source and built UI
  ui/                           UI, charts, translations, SVG icons
  backend/                      Local log and usage readers
  server.mjs / bridge.py         MCP server and Python bridge
  dist/                         Built HTML resource
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

The server prefers the plugin-local `.venv`; `CONTEXT_EXPLORER_PYTHON` can override its Python executable. Otherwise it uses Python from `PATH`. Windows installation has not been verified.

For a standalone development report, run `.venv/bin/python preview.py` inside the plugin directory and open its printed loopback URL. This is a development preview, not proof of native host integration.

## Codex repository marketplace

The catalog name is `codex-context-explorer`; the plugin name is `context-explorer`. The repository can be registered as a marketplace source:

```sh
codex plugin marketplace add popsiclelmlm/codex-context-explorer
codex plugin add context-explorer@codex-context-explorer
```

**Installation is still in development.** A copied plugin cache needs its own Node/Python dependencies and tokenizer cache. Completing local setup in the checkout alone does not guarantee that the installed cache can run. See [PUBLICATION.md](PUBLICATION.md) for remaining work.

## Privacy

The collector reads local Codex logs and session-name metadata. It does not include a developer upload endpoint or telemetry. Tool summaries and on-demand panel data are processed by the Codex host under its data policies.

No personal logs, live preview keys, screenshots of real sessions, machine-specific runtime paths, or dependency caches are included. Commit identity checks use GitHub `noreply` addresses; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Project-authored code is licensed under [MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled dependencies and Lucide icons.
