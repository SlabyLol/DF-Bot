# DF-Bot

![DF-Bot Icon](ico.png)

**DF-Bot** – Fully featured GitHub bot that runs completely on **GitHub Actions**.
No PC, no server, no external hosting needed.

Everything is controlled by the `df-bot.yml` file.

## Features

- Welcome messages for Issues & Pull Requests
- Many commands via comments (executed by GitHub Actions)
- Auto-labels based on title keywords
- **Auto-assign** (round-robin, random, or all)
- Add / remove labels
- Assign / unassign users
- Close / reopen
- Lock / unlock comments
- Change title
- Set milestone
- Fully configurable per project

## How to add DF-Bot to your account / projects

This bot works **per repository**. There is no single "install for whole account" button because it uses GitHub Actions.

### Option 1 – Add to one repository (recommended)

1. Go to the repository where you want the bot
2. Copy these 4 files into it:

```
.github/workflows/df-bot.yml
action.js
package.json
df-bot.yml
```

3. Commit the files
4. Done – the bot is now active in that repository

### Option 2 – Use this repository as template

1. On GitHub open https://github.com/SlabyLol/DF-Bot
2. Click **Use this template** → **Create a new repository**
3. The new repository already has the bot ready

### Option 3 – Add to many repositories

Just repeat Option 1 for each repository.
You can also automate this later with a script if needed.

## All Commands (via GitHub Actions)

Write a comment under any Issue or Pull Request:

| Command | Description |
|---------|-------------|
| `@df-bot help` | Show all commands |
| `@df-bot label <name>` | Add a label |
| `@df-bot unlabel <name>` | Remove a label |
| `@df-bot assign <user>` | Assign someone |
| `@df-bot assign me` | Assign yourself |
| `@df-bot unassign <user>` | Remove assignee |
| `@df-bot unassign me` | Unassign yourself |
| `@df-bot close` | Close the issue/PR |
| `@df-bot reopen` | Reopen the issue/PR |
| `@df-bot lock` | Lock comments |
| `@df-bot unlock` | Unlock comments |
| `@df-bot title <new title>` | Change the title |
| `@df-bot milestone <name>` | Set a milestone |

The commands are executed by the GitHub Actions workflow.

## Auto-Assign

In `df-bot.yml`:

```yaml
auto_assign:
  enabled: true
  strategy: round_robin   # or "random" / "all"
  assignees:
    - SlabyLol
    - other-user
  ignore_labels:
    - wip
    - draft
```

## Files

```
DF-Bot/
├── .github/workflows/df-bot.yml   ← GitHub Actions workflow
├── action.js                      ← Bot logic
├── df-bot.yml                     ← Configuration
├── ico.png                        ← Icon
├── package.json
└── README.md
```

## License

MIT
