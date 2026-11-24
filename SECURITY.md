# Security

Livloch is a static web page: HTML, JavaScript and pictures, no server, no accounts, no logins, no analytics. It keeps its settings and records in your browser's `localStorage`, loads Three.js from cdnjs and fonts from Google Fonts, and writes to the clipboard only when you press a Copy button. The places that serve it are GitHub Pages and saelion.co.

## Reporting a problem

Please report anything that could hurt a player or the project **privately**:

1. Open the repository's [Security tab](https://github.com/stevoblevo/livloch/security).
2. Choose **Report a vulnerability** and describe what you found, how to reproduce it, and which version (the number at the bottom of the title screen) or commit.

Only the maintainers can read these reports. Please do not open a public issue for a security problem.

Things worth reporting: script injection through anything the game shows (shared text, URLs, saved settings), a way to make the published pages load code from somewhere else, a leaked secret or private detail in the repository or its history, or a GitHub workflow that could be abused from a fork.

Gameplay bugs, crashes and frame-rate trouble are not security problems: use the [bug report form](https://github.com/stevoblevo/livloch/issues/new?template=bug.yml) for those.

## What to expect

This is a small project run by one person with AI agents helping. A report will be read, answered in the advisory, and fixed on `main` through a pull request; the fix reaches the public sites with the next release. There is no bug bounty.

Only the latest version on `main` and the latest published version get fixes. Old versions under [`/versions/`](https://stevoblevo.github.io/livloch/versions/) stay as they were.
