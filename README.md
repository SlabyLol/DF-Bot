# DF-Bot

**DF-Bot** is a GitHub App (bot) that helps manage and automate your projects.

It appears as **DF-Bot[bot]** when commenting and acting on repositories.

## What it does right now

- Welcomes new **Issues** with a helpful message
- Welcomes new **Pull Requests**
- Responds to `@df-bot help` in comments

You can easily extend it with more automation.

## Setup (make the bot work)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the GitHub App

1. Run the bot locally:
   ```bash
   npm start
   ```
2. Open the URL shown in the terminal (usually http://localhost:3000)
3. Click **Register a GitHub App**
4. Choose a name (e.g. `DF-Bot`)
5. Select the repositories you want the bot to work on
6. Download the private key (`.pem` file)

### 3. Configure environment

Copy the example file:

```bash
cp .env.example .env
```

Fill in:

- `APP_ID` → from the GitHub App settings page
- `WEBHOOK_SECRET` → the secret you set (or leave `development` for local testing)
- `PRIVATE_KEY` → paste the full content of the downloaded `.pem` file

### 4. Install the App on your repositories

Go to the GitHub App page → **Install App** → select the repositories where you want DF-Bot to work.

### 5. Run the bot

```bash
npm start
```

For local development you can also use [smee.io](https://smee.io) as a webhook proxy.

## Deploy (recommended)

You can deploy DF-Bot for free on:

- [Railway](https://railway.app)
- [Render](https://render.com)
- [Fly.io](https://fly.io)
- GitHub Codespaces + always-on setup

Just set the same environment variables (`APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`) in the hosting platform.

## Project structure

```
DF-Bot/
├── index.js          # Main bot logic
├── app.yml           # GitHub App manifest
├── package.json
├── .env.example
└── README.md
```

## Customize the bot

Edit `index.js` to add more features, for example:

- Auto-label issues
- Close stale issues
- Auto-approve Dependabot PRs
- Create project boards
- Respond to more commands

## License

MIT
