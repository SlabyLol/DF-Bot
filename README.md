# DF-Bot

![DF-Bot Icon](ico.png)

**DF-Bot** – Fully featured GitHub bot that runs completely on **GitHub Actions**.
No PC, no server needed.

It can manage issues, labels, assignees **and also create commits, files, branches and pull requests**.

## Features

- Welcome messages for Issues & Pull Requests
- Labels, assign, close, lock, title, milestone
- **Create / update / delete files** (with automatic commit)
- **Create branches**
- **Create Pull Requests**
- **Bump version** in package.json
- Auto-labels & Auto-assign
- Fully configurable via `df-bot.yml`

## How to add DF-Bot to a repository

Copy these 4 files into your repository:

```
.github/workflows/df-bot.yml
action.js
package.json
df-bot.yml
```

Commit them → the bot is immediately active.

Or use this repository as a template.

## All Commands

### Labels & Assignment
| Command | Description |
|---------|-------------|
| `@df-bot label <name>` | Add a label |
| `@df-bot unlabel <name>` | Remove a label |
| `@df-bot assign <user>` | Assign someone |
| `@df-bot assign me` | Assign yourself |
| `@df-bot unassign <user>` | Unassign |
| `@df-bot unassign me` | Unassign yourself |

### Status
| Command | Description |
|---------|-------------|
| `@df-bot close` | Close issue/PR |
| `@df-bot reopen` | Reopen |
| `@df-bot lock` | Lock comments |
| `@df-bot unlock` | Unlock comments |
| `@df-bot title <new title>` | Change title |
| `@df-bot milestone <name>` | Set milestone |

### Commits & Files
| Command | Description |
|---------|-------------|
| `@df-bot create-file path/file.txt \| content here` | Create file + commit |
| `@df-bot update-file path/file.txt \| new content` | Update file + commit |
| `@df-bot delete-file path/file.txt` | Delete file + commit |
| `@df-bot create-branch feature/name` | Create a new branch |
| `@df-bot create-pr My PR title` | Create a Pull Request |
| `@df-bot bump patch` | Bump version (patch/minor/major) |

### Help
| Command | Description |
|---------|-------------|
| `@df-bot help` | Show all commands |

## Examples

```
@df-bot create-file docs/hello.md | # Hello World
This is a new file created by DF-Bot.
```

```
@df-bot update-file README.md | # New README content
```

```
@df-bot bump minor
```

```
@df-bot create-branch feature/new-login
@df-bot create-pr Add new login feature
```

## License

MIT
