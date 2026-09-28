# DF-Bot

**DF-Bot** runs completely on GitHub – no PC, no server needed.

You configure everything with a simple `df-bot.yml` file.

## Features

- Welcome messages for Issues & Pull Requests
- Commands: `@df-bot help`, `@df-bot label`, `@df-bot close`, `@df-bot reopen`
- Auto-labels based on title keywords
- Fully configurable per project via `df-bot.yml`

## How to add DF-Bot to any project

### Step 1 – Copy these 3 files into your repository

```
.github/workflows/df-bot.yml
action.js
package.json
```

### Step 2 – Add the config file (optional but recommended)

Copy `df-bot.yml` into the **root** of your project and adjust it.

### Step 3 – Done

The bot is now active. No further setup needed.

---

## Configuration (`df-bot.yml`)

Example:

```yaml
features:
  welcome_issues: true
  welcome_pull_requests: true
  help_command: true
  label_command: true
  close_command: true
  reopen_command: true
  auto_labels: true

messages:
  issue_opened: |
    👋 Danke für das Issue!
    Tippe `@df-bot help` für Befehle.
  pull_request_opened: |
    🚀 Danke für den Pull Request!

commands:
  help:
    response: |
      ### DF-Bot Befehle
      - `@df-bot help`
      - `@df-bot label <name>`
      - `@df-bot close`
      - `@df-bot reopen`

auto_labels:
  bug:
    - bug
    - error
    - crash
  enhancement:
    - feature
    - improvement

project:
  name: Mein Projekt
  description: Kurze Beschreibung
  instructions: |
    - Antworte auf Deutsch
    - Sei kurz und hilfreich
```

## Available Commands

| Command                  | What it does                  |
|--------------------------|-------------------------------|
| `@df-bot help`           | Shows available commands      |
| `@df-bot label bug`      | Adds the label "bug"          |
| `@df-bot close`          | Closes the issue / PR         |
| `@df-bot reopen`         | Reopens the issue / PR        |

## Files overview

```
DF-Bot/
├── .github/workflows/df-bot.yml   ← Workflow (must be present)
├── action.js                      ← Bot logic
├── df-bot.yml                     ← Your project configuration
├── package.json
└── README.md
```

## License

MIT
