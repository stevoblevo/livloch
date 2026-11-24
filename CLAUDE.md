# Claude: read AGENTS.md

The working rules for every agent on this repository, Claude included, are in [`AGENTS.md`](AGENTS.md). Start at its "Start here" section. How the code fits together is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); how people and agents contribute is in [`CONTRIBUTING.md`](CONTRIBUTING.md).

The short version: the model owns the view; `node tools/test.js` must pass; one topic per pull request on an `agent/claude/<topic>` branch (`work/X.Y-<topic>` branches are the lead's release work); say what is tested, seen in frame, measured or unverified; never push to `main`, force-push, merge or publish.
