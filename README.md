# DF-Bot

![DF-Bot Icon](ico.png)

**DF-Bot** runs on GitHub Actions and can appear as **DF-Bot[bot]** when configured as a GitHub App.

## Appear as DF-Bot[bot] (required steps)

Without a GitHub App, comments show as `github-actions[bot]`.
With a GitHub App, they show as **DF-Bot[bot]**.

### 1. Create the GitHub App

1. Open: https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name:** `DF-Bot` (must be unique; if taken try `DF-Bot-YourName`)
   - **Homepage URL:** `https://github.com/SlabyLol/DF-Bot`
   - **Webhook:** uncheck "Active" (not needed for Actions mode)
3. **Permissions → Repository permissions:**
   - Contents: **Read and write**
   - Issues: **Read and write**
   - Pull requests: **Read and write**
   - Metadata: Read-only
4. Click **Create GitHub App**
5. Note the **App ID**
6. Scroll to **Private keys** → **Generate a private key** → download the `.pem` file
7. Click **Install App** → install on your account / the DF-Bot repository

### 2. Add secrets to the repository

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name   | Value                                      |
|---------------|--------------------------------------------|
| `APP_ID`      | the App ID number                          |
| `PRIVATE_KEY` | full contents of the `.pem` file           |

Paste the entire private key including:
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

### 3. Done

Next time the workflow runs, comments and API actions use **DF-Bot[bot]**.

If `APP_ID` / `PRIVATE_KEY` are missing, it falls back to `github-actions[bot]`.

## Commands

Comment on an issue or PR:

```
@df-bot help
@df-bot label bug
@df-bot assign me
@df-bot close
@df-bot run pip install opencomb /Z/ opencomb
@df-bot run opencomb --out . /P/ file.hello file.py
```

Sensitive commands are **contributors only** (write access or higher).

## Run without a new issue

1. Comment on any existing issue/PR, or
2. **Actions** → **DF-Bot** → **Run workflow**

## License

MIT
