# Contributing

This is a source preview. Keep native-host and install-validation claims separate from browser-preview results.

## Local checks

Inside `plugins/context-explorer`, prepare the dependencies described in the README, then run:

```sh
npm run build
.venv/bin/python verify-turns.py
npm run verify:mcp
```

The MCP check reads local sessions and writes an ignored `verification.json`. Do not commit personal sessions, screenshots containing real conversations, live preview URLs, secrets, or generated caches.

## Private commit email

Use the GitHub-provided `noreply` email shown in your GitHub email settings. Configure it **for this repository**, without changing other repositories:

```sh
git config user.name YOUR_GITHUB_USERNAME
git config user.email YOUR_GITHUB_NOREPLY_ADDRESS
git config core.hooksPath .githooks
```

The included hooks reject non-GitHub-noreply author/committer addresses and scan staged/tracked content for local private-email settings, home paths, credentials and live loopback preview links. They never print a rejected email value. These checks help protect commit metadata; they do not replace reviewing the diff.

Run `python3 scripts/check-privacy.py --history` before publishing to check tracked files and commit identities. Report issues through this repository's GitHub Issues; no private email contact is required.

## Third-party code

Keep the original Lucide and bundled dependency license notices intact. Add appropriate notices when changing bundled dependencies.
