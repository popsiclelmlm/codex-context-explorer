# Release status

The repository marketplace is live, but no versioned release has been tagged yet.

## Done

- The MCP server, its npm dependencies and the `o200k_base` tokenizer are bundled into `dist/server.mjs`; installed copies need no `node_modules` or tiktoken. Counts match tiktoken exactly on 12 real sessions.
- The Python collector uses only the standard library. A missing Python returns a clear tool error, and a crashed collector restarts on the next request.
- MIT license, third-party notices and synthetic-data screenshots are included.
- Installed from GitHub on macOS: the report opens in the Codex desktop sidebar. A clean CLI install and the installed copy's MCP server were also verified on a second Mac with Node 22/26 and Python 3.9/3.14.

## Before tagging v0.1.0

- Test Windows, or state that only macOS and Linux are supported.
- Recheck the price table and its date.

## OpenAI plugin directory

Not planned for now. Local MCP plugins can only be submitted by allowlisted publisher organizations. See [repository marketplaces](https://developers.openai.com/plugins/build/plugins) and [desktop-only submission](https://developers.openai.com/plugins/deploy/desktop-only).
