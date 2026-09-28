# DF-Bot

**DF-Bot** – Voll ausgestatteter GitHub-Bot, der komplett auf GitHub Actions läuft.
Kein PC, kein Server, kein Hosting nötig.

Alles wird über die Datei `df-bot.yml` gesteuert.

## Features

- Willkommensnachrichten für Issues & Pull Requests
- Viele Commands per Kommentar
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

## Alle Commands

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

Du kannst ein Icon hochladen. Da der Bot über GitHub Actions läuft, erscheinen Kommentare aktuell als `github-actions`. Ein eigenes Icon ist erst möglich, wenn wir später auf eine echte GitHub App umstellen.

Lade dein Icon einfach hier im Repository hoch (z.B. als `icon.png`), dann können wir es später verwenden.

## Dateien

```
DF-Bot/
├── .github/workflows/df-bot.yml
├── action.js
├── df-bot.yml          ← hier alles konfigurieren
├── package.json
└── README.md
```

## License

MIT
