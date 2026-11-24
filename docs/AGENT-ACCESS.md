# Agent access: doing repository work from a terminal

Written 24 November 2026, after an evening of clicking through GitHub settings in a browser. The rule from the owner: **use the terminal (gh, git over SSH), not a mouse.**

## Why some agents can't change settings
- **Cloud sessions** (Claude on the web, the app's cloud workspace) reach GitHub through a proxy that refuses repository settings writes (`Repository settings writes are not permitted through this proxy`). That holds whatever token or key the session has. Cloud agents do code, PRs, merges and publishing; settings are done from a machine of the owner's.
- **GitHub sudo mode** asks a person to confirm sensitive changes (visibility, deleting, security settings) with a passkey, GitHub Mobile or an emailed code. One confirmation lasts a few hours. Nobody can turn it off. A fine-grained token used from a terminal does not hit sudo mode for API calls.

## One-time setup on a machine of the owner's (bd, Tower or any)
```sh
# 1. GitHub CLI signed in as stevoblevo (browser login, once)
gh auth login --hostname github.com --git-protocol ssh --web

# 2. An SSH key for git, added to the account
ssh-keygen -t ed25519 -C "agents@$(hostname)" -f ~/.ssh/id_ed25519_gh -N ""
gh ssh-key add ~/.ssh/id_ed25519_gh.pub --title "agents $(hostname)"
printf 'Host github.com\n  IdentityFile ~/.ssh/id_ed25519_gh\n' >> ~/.ssh/config

# 3. A fine-grained token for agents (create once in the browser:
#    github.com/settings/personal-access-tokens/new -> Repository access: all of stevoblevo's repos;
#    Permissions: Administration RW, Contents RW, Pull requests RW, Issues RW, Discussions RW, Workflows RW, Pages RW)
#    then store it in Infisical on Tower, never in a repo:
infisical secrets set GH_AGENT_TOKEN=<paste> --env=prod --path=/github
#    agents load it with:
export GH_TOKEN="$(infisical secrets get GH_AGENT_TOKEN --env=prod --path=/github --plain)"
```

## What is still open for Livloch (run once, from that machine)
```sh
R=stevoblevo/livloch
gh repo edit $R --description "Livloch: a WebGL third-person lane game in the Saelion collection. Play it at saelion.co/livloch. Open to people and agents: start at AGENTS.md or CONTRIBUTING.md." --homepage https://saelion.co/livloch \
  --add-topic game,webgl,threejs,browser-game,third-person,saelion,ai-agents,open-collaboration
gh api -X PATCH repos/$R -F 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
# main: no force-push, no deletion, changes by pull request with the CI checks green (no required reviews)
gh api -X POST repos/$R/rulesets --input - <<'JSON'
{ "name": "main", "target": "branch", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false, "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": false, "required_status_checks": [ { "context": "Syntax and rule tests" }, { "context": "Browser smoke test" } ] } } ] }
JSON
```

## Done already (24 Nov, in the owner's signed-in browser)
Public; Discussions on; private vulnerability reporting on; secret scanning on.
