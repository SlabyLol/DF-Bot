# DF-Bot

**DF-Bot** runs completely on GitHub – **no PC, no server, no external hosting needed**.

Everything works with GitHub Actions.

## Features

- Welcomes new **Issues**
- Welcomes new **Pull Requests**
- Responds to `@df-bot help` in comments

## How it works

The bot is triggered automatically by GitHub when:
- Someone opens an Issue
- Someone opens a Pull Request
- Someone comments on an Issue/PR

No installation of a GitHub App is required. It uses the built-in `GITHUB_TOKEN`.

## Enable the bot on any repository

### Option 1 – Use this repository
Just keep the workflow file. The bot is already active in this repo.

### Option 2 – Add DF-Bot to your other projects

1. Copy the folder `.github/workflows/df-bot.yml` into your other repository
2. Copy `action.js` and `package.json` into the root of that repository
3. That’s it – the bot starts working immediately

Or you can make this repository a template and create new projects from it.

## Customize

Edit `action.js` to add more features, for example:

- Auto-label issues
- Close stale issues
- Auto-approve Dependabot PRs
- Create project cards
- Custom commands (`@df-bot label bug`, etc.)

## Files

```
DF-Bot/
├── .github/workflows/df-bot.yml   ← Workflow that runs the bot
├── action.js                      ← Bot logic
├── package.json
└── README.md
```

## License

MIT
