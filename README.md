# DF-Bot

![DF-Bot Icon](ico.png)

**DF-Bot** – Voll ausgestatteter GitHub-Bot, der komplett über **GitHub Actions** läuft.
Kein PC, kein Server, kein Hosting nötig.

Alles wird über die Datei `df-bot.yml` gesteuert.

## Features

- Willkommensnachrichten für Issues & Pull Requests
- Viele Commands per Kommentar (über GitHub Actions)
- Auto-Labels anhand von Keywords im Titel
- **Auto-Assign** (Round-Robin, Random oder Alle)
- Labels hinzufügen / entfernen
- Zuweisen / Entfernen von Assignees
- Schließen / Wieder öffnen
- Lock / Unlock
- Titel ändern
- Milestone setzen
- Komplett konfigurierbar pro Projekt

## Bot zu einem Projekt hinzufügen

Kopiere diese Dateien in dein Repository:

```
.github/workflows/df-bot.yml
action.js
package.json
df-bot.yml
```

Danach ist der Bot sofort aktiv.

## Alle Commands (über GitHub Actions)

Schreibe einfach einen Kommentar unter ein Issue oder einen Pull Request:

| Befehl | Beschreibung |
|--------|--------------|
| `@df-bot help` | Zeigt alle Befehle |
| `@df-bot label <name>` | Label hinzufügen |
| `@df-bot unlabel <name>` | Label entfernen |
| `@df-bot assign <user>` | jemanden zuweisen |
| `@df-bot assign me` | dich selbst zuweisen |
| `@df-bot unassign <user>` | Zuweisung entfernen |
| `@df-bot unassign me` | dich selbst entfernen |
| `@df-bot close` | Issue/PR schließen |
| `@df-bot reopen` | wieder öffnen |
| `@df-bot lock` | Kommentare sperren |
| `@df-bot unlock` | Kommentare entsperren |
| `@df-bot title <neuer Titel>` | Titel ändern |
| `@df-bot milestone <name>` | Milestone setzen |

Die Commands werden durch den GitHub Actions Workflow ausgeführt.

## Auto-Assign einstellen

In der `df-bot.yml`:

```yaml
auto_assign:
  enabled: true
  strategy: round_robin   # oder "random" / "all"
  assignees:
    - SlabyLol
    - anderer-user
  ignore_labels:
    - wip
    - draft
```

## Icon

Das Icon liegt unter `ico.png` und wird im README angezeigt.

## Dateien

```
DF-Bot/
├── .github/workflows/df-bot.yml   ← GitHub Actions Workflow
├── action.js                      ← Bot-Logik
├── df-bot.yml                     ← Konfiguration
├── ico.png                        ← Icon
├── package.json
└── README.md
```

## License

MIT
