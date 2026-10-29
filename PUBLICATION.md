# Repository marketplace roadmap

This repository publishes the source of Context Explorer. The marketplace catalog is available, but publication of source is not a claim that a fresh plugin installation already works without setup.

## Current scope

- Source code, portable command paths, built HTML, dependency declarations and repository catalog are included.
- UI includes chronological conversation turns, segmented charts, hover/focus details, icon controls, translations and themes.
- MIT project license and full notices for bundled third-party code are included.
- Personal session data, local preview credentials, machine paths and dependency caches are excluded.
- The MCP server and its npm dependencies are bundled into `dist/server.mjs`; the installed plugin needs no `node_modules`. The collector uses only the Python standard library, with tiktoken optional.
- A missing Python executable returns an explicit tool error, and a collector that exits is restarted on the next request.
- Unused standalone web server, hook receipt and account rate-limit code (which launched `codex app-server`) has been removed.

## Before an installable marketplace release

- Decide how visible-text tokenization reaches installed copies (document optional tiktoken setup, or replace it with a bundled pure-JS tokenizer).
- Validate clean-machine installs and supported platforms.
- Validate native host entrypoints, panel loading, session changes, refresh and on-demand text end to end.
- Make demonstration screenshots using clearly labeled sample data.
- Recheck rate-table coverage and its date; keep unknown values unknown.

The built UI currently has local browser coverage. That evidence does not replace native-host or cross-machine installation validation. No versioned installable release is claimed yet.

## OpenAI public directory

Publishing a GitHub-hosted repository marketplace is separate from submission to the OpenAI public directory. Local MCP submissions to that directory currently require an eligible, allowlisted publisher organization and the usual publisher materials.

References: [Repository catalogs](https://developers.openai.com/plugins/build/plugins), [desktop-only submission](https://developers.openai.com/plugins/deploy/desktop-only).
