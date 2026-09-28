/**
 * DF-Bot – Full featured GitHub Actions Bot
 * Supports df-bot.yml configuration + many commands + auto-assign
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";
import yaml from "js-yaml";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const eventName = process.env.GITHUB_EVENT_NAME;
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

const owner = event.repository.owner.login;
const repo = event.repository.name;

// -------------------- Default Config --------------------
const defaultConfig = {
  features: {
    welcome_issues: true,
    welcome_pull_requests: true,
    help_command: true,
    label_command: true,
    unlabel_command: true,
    close_command: true,
    reopen_command: true,
    assign_command: true,
    unassign_command: true,
    auto_labels: true,
    auto_assign: true,
    lock_command: true,
    unlock_command: true,
    title_command: true,
    milestone_command: true,
  },
  messages: {
    issue_opened: "👋 Danke für das Issue!\n\nIch bin **DF-Bot**. Tippe `@df-bot help` für alle Befehle.",
    pull_request_opened: "🚀 Danke für den Pull Request!\n\n**DF-Bot** schaut drüber. Tippe `@df-bot help` für Befehle.",
  },
  commands: {
    help: {
      response: `### 🤖 DF-Bot – Alle Befehle

**Labels**
- \`@df-bot label <name>\` → Label hinzufügen
- \`@df-bot unlabel <name>\` → Label entfernen

**Zuweisung**
- \`@df-bot assign <username>\` → jemanden zuweisen
- \`@df-bot assign me\` → dich selbst zuweisen
- \`@df-bot unassign <username>\` → Zuweisung entfernen
- \`@df-bot unassign me\` → dich selbst entfernen

**Status**
- \`@df-bot close\` → schließen
- \`@df-bot reopen\` → wieder öffnen
- \`@df-bot lock\` → Kommentare sperren
- \`@df-bot unlock\` → Kommentare entsperren

**Sonstiges**
- \`@df-bot title <neuer Titel>\` → Titel ändern
- \`@df-bot milestone <name>\` → Milestone setzen
- \`@df-bot help\` → diese Hilfe`,
    },
  },
  auto_labels: {
    bug: ["bug", "error", "crash", "broken", "fehler"],
    enhancement: ["feature", "enhancement", "improvement", "request", "wunsch"],
    documentation: ["docs", "documentation", "readme", "dokumentation"],
    question: ["question", "frage", "how", "warum"],
  },
  auto_assign: {
    enabled: true,
    strategy: "round_robin",
    assignees: [],
    only_labels: [],
    ignore_labels: ["wip", "draft"],
  },
};

// -------------------- Load Config --------------------
function loadConfig() {
  try {
    if (fs.existsSync("df-bot.yml")) {
      const file = fs.readFileSync("df-bot.yml", "utf8");
      const userConfig = yaml.load(file) || {};
      return {
        ...defaultConfig,
        ...userConfig,
        features: { ...defaultConfig.features, ...(userConfig.features || {}) },
        messages: { ...defaultConfig.messages, ...(userConfig.messages || {}) },
        commands: { ...defaultConfig.commands, ...(userConfig.commands || {}) },
        auto_labels: userConfig.auto_labels || defaultConfig.auto_labels,
        auto_assign: { ...defaultConfig.auto_assign, ...(userConfig.auto_assign || {}) },
      };
    }
  } catch (err) {
    console.log("Config load error, using defaults:", err.message);
  }
  return defaultConfig;
}

// -------------------- Helpers --------------------
async function comment(issueNumber, body) {
  await octokit.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function addAutoLabels(issueNumber, title, config) {
  if (!config.features.auto_labels || !config.auto_labels) return;

  const titleLower = title.toLowerCase();
  const labelsToAdd = [];

  for (const [label, keywords] of Object.entries(config.auto_labels)) {
    if (keywords.some((kw) => titleLower.includes(String(kw).toLowerCase()))) {
      labelsToAdd.push(label);
    }
  }

  if (labelsToAdd.length > 0) {
    try {
      await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: labelsToAdd });
      console.log("Auto labels added:", labelsToAdd.join(", "));
    } catch (err) {
      console.log("Auto label failed:", err.message);
    }
  }
}

async function doAutoAssign(issueNumber, existingLabels, config) {
  const aa = config.auto_assign;
  if (!config.features.auto_assign || !aa?.enabled || !aa.assignees?.length) return;

  // Check ignore labels
  if (aa.ignore_labels?.some((l) => existingLabels.includes(l))) return;

  // Check only_labels
  if (aa.only_labels?.length > 0 && !aa.only_labels.some((l) => existingLabels.includes(l))) return;

  let chosen = [];

  if (aa.strategy === "all") {
    chosen = aa.assignees;
  } else if (aa.strategy === "random") {
    chosen = [aa.assignees[Math.floor(Math.random() * aa.assignees.length)]];
  } else {
    // round_robin – simple version using issue number
    const index = issueNumber % aa.assignees.length;
    chosen = [aa.assignees[index]];
  }

  try {
    await octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: issueNumber,
      assignees: chosen,
    });
    console.log("Auto-assigned:", chosen.join(", "));
  } catch (err) {
    console.log("Auto-assign failed:", err.message);
  }
}

// -------------------- Main --------------------
async function main() {
  const config = loadConfig();
  console.log("Event:", eventName);

  // ===== New Issue =====
  if (eventName === "issues" && event.action === "opened") {
    const issueNumber = event.issue.number;
    const title = event.issue.title;
    const labels = (event.issue.labels || []).map((l) => l.name);

    if (config.features.welcome_issues) {
      await comment(issueNumber, config.messages.issue_opened);
    }
    await addAutoLabels(issueNumber, title, config);
    await doAutoAssign(issueNumber, labels, config);
  }

  // ===== New Pull Request =====
  if (eventName === "pull_request" && event.action === "opened") {
    const prNumber = event.pull_request.number;
    const title = event.pull_request.title;
    const labels = (event.pull_request.labels || []).map((l) => l.name);

    if (config.features.welcome_pull_requests) {
      await comment(prNumber, config.messages.pull_request_opened);
    }
    await addAutoLabels(prNumber, title, config);
    await doAutoAssign(prNumber, labels, config);
  }

  // ===== Comment Commands =====
  if (eventName === "issue_comment" && event.action === "created") {
    const body = event.comment.body.trim();
    const lower = body.toLowerCase();
    const issueNumber = event.issue.number;
    const sender = event.comment.user.login;

    if (event.comment.user.type === "Bot") return;
    if (!lower.includes("@df-bot")) return;

    // HELP
    if (lower.includes("help") && config.features.help_command) {
      const text = config.commands?.help?.response || defaultConfig.commands.help.response;
      await comment(issueNumber, text);
      return;
    }

    // LABEL
    if (lower.match(/@df-bot\s+label\s+/i) && config.features.label_command) {
      const match = body.match(/@df-bot\s+label\s+([\w-]+)/i);
      if (match) {
        const label = match[1];
        try {
          await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [label] });
          await comment(issueNumber, `✅ Label \`${label}\` hinzugefügt.`);
        } catch {
          await comment(issueNumber, `❌ Label \`${label}\` konnte nicht hinzugefügt werden. Existiert es schon im Repo?`);
        }
      }
      return;
    }

    // UNLABEL
    if (lower.match(/@df-bot\s+unlabel\s+/i) && config.features.unlabel_command) {
      const match = body.match(/@df-bot\s+unlabel\s+([\w-]+)/i);
      if (match) {
        const label = match[1];
        try {
          await octokit.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label });
          await comment(issueNumber, `✅ Label \`${label}\` entfernt.`);
        } catch {
          await comment(issueNumber, `❌ Label \`${label}\` konnte nicht entfernt werden.`);
        }
      }
      return;
    }

    // ASSIGN
    if (lower.match(/@df-bot\s+assign\s+/i) && config.features.assign_command) {
      const match = body.match(/@df-bot\s+assign\s+(@?[\w-]+)/i);
      if (match) {
        let user = match[1].replace("@", "");
        if (user.toLowerCase() === "me") user = sender;
        try {
          await octokit.issues.addAssignees({ owner, repo, issue_number: issueNumber, assignees: [user] });
          await comment(issueNumber, `✅ @${user} wurde zugewiesen.`);
        } catch {
          await comment(issueNumber, `❌ Konnte @${user} nicht zuweisen.`);
        }
      }
      return;
    }

    // UNASSIGN
    if (lower.match(/@df-bot\s+unassign\s+/i) && config.features.unassign_command) {
      const match = body.match(/@df-bot\s+unassign\s+(@?[\w-]+)/i);
      if (match) {
        let user = match[1].replace("@", "");
        if (user.toLowerCase() === "me") user = sender;
        try {
          await octokit.issues.removeAssignees({ owner, repo, issue_number: issueNumber, assignees: [user] });
          await comment(issueNumber, `✅ @${user} wurde entfernt.`);
        } catch {
          await comment(issueNumber, `❌ Konnte @${user} nicht entfernen.`);
        }
      }
      return;
    }

    // CLOSE
    if (lower.match(/@df-bot\s+close\b/i) && config.features.close_command) {
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "closed" });
      await comment(issueNumber, "✅ Geschlossen.");
      return;
    }

    // REOPEN
    if (lower.match(/@df-bot\s+reopen\b/i) && config.features.reopen_command) {
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "open" });
      await comment(issueNumber, "✅ Wieder geöffnet.");
      return;
    }

    // LOCK
    if (lower.match(/@df-bot\s+lock\b/i) && config.features.lock_command) {
      try {
        await octokit.issues.lock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔒 Kommentare wurden gesperrt.");
      } catch {
        await comment(issueNumber, "❌ Sperren fehlgeschlagen.");
      }
      return;
    }

    // UNLOCK
    if (lower.match(/@df-bot\s+unlock\b/i) && config.features.unlock_command) {
      try {
        await octokit.issues.unlock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔓 Kommentare wurden entsperrt.");
      } catch {
        await comment(issueNumber, "❌ Entsperren fehlgeschlagen.");
      }
      return;
    }

    // TITLE
    if (lower.match(/@df-bot\s+title\s+/i) && config.features.title_command) {
      const match = body.match(/@df-bot\s+title\s+(.+)/i);
      if (match) {
        const newTitle = match[1].trim();
        try {
          await octokit.issues.update({ owner, repo, issue_number: issueNumber, title: newTitle });
          await comment(issueNumber, `✅ Titel geändert zu: **${newTitle}**`);
        } catch {
          await comment(issueNumber, "❌ Titel konnte nicht geändert werden.");
        }
      }
      return;
    }

    // MILESTONE
    if (lower.match(/@df-bot\s+milestone\s+/i) && config.features.milestone_command) {
      const match = body.match(/@df-bot\s+milestone\s+(.+)/i);
      if (match) {
        const milestoneName = match[1].trim();
        try {
          const { data: milestones } = await octokit.issues.listMilestones({
            owner,
            repo,
            state: "open",
          });
          const milestone = milestones.find((m) => m.title.toLowerCase() === milestoneName.toLowerCase());
          if (milestone) {
            await octokit.issues.update({
              owner,
              repo,
              issue_number: issueNumber,
              milestone: milestone.number,
            });
            await comment(issueNumber, `✅ Milestone **${milestone.title}** gesetzt.`);
          } else {
            await comment(issueNumber, `❌ Milestone "${milestoneName}" nicht gefunden.`);
          }
        } catch {
          await comment(issueNumber, "❌ Milestone konnte nicht gesetzt werden.");
        }
      }
      return;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
