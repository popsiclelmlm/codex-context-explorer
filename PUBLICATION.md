# Release status

The repository marketplace is live, but no versioned release has been tagged yet.

## Done

- The MCP server and its npm dependencies are bundled into `dist/server.mjs`; installed copies need no `node_modules`.
- The Python collector uses only the standard library. A missing Python returns a clear tool error, and a crashed collector restarts on the next request.
- MIT license, third-party notices and synthetic-data screenshots are included.
- The MCP server and browser report have been tested on macOS against real local sessions, and the report opens in the Codex sidebar browser.

## Before tagging v0.1.0

- Token estimates in installed copies: document the optional tiktoken setup, or switch to a bundled pure-JS tokenizer.
- Recheck the panel after a GitHub install in the desktop app: open, switch sessions, refresh, expand entries. (A clean CLI install from GitHub and the installed copy's MCP server were verified on a second Mac with Node 22/26 and Python 3.9/3.14.)
- Test Windows, or state that only macOS and Linux are supported.
- Recheck the price table and its date.

## OpenAI plugin directory

Not planned for now. Local MCP plugins can only be submitted by allowlisted publisher organizations. See [repository marketplaces](https://developers.openai.com/plugins/build/plugins) and [desktop-only submission](https://developers.openai.com/plugins/deploy/desktop-only).
