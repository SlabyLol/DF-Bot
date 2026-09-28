/**
 * DF-Bot – Full featured GitHub Actions Bot
 * Supports df-bot.yml configuration + many commands + auto-assign
 * All messages in English by default
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
    issue_opened: "👋 Thanks for opening this issue!\n\nI'm **DF-Bot**. Type `@df-bot help` to see all commands.",
    pull_request_opened: "🚀 Thanks for the pull request!\n\n**DF-Bot** is watching. Type `@df-bot help` for commands.",
  },
  commands: {
    help: {
      response: `### 🤖 DF-Bot – All Commands

**Labels**
- \`@df-bot label <name>\` → Add a label
- \`@df-bot unlabel <name>\` → Remove a label

**Assignment**
- \`@df-bot assign <username>\` → Assign someone
- \`@df-bot assign me\` → Assign yourself
- \`@df-bot unassign <username>\` → Remove assignee
- \`@df-bot unassign me\` → Unassign yourself

**Status**
- \`@df-bot close\` → Close the issue/PR
- \`@df-bot reopen\` → Reopen the issue/PR
- \`@df-bot lock\` → Lock comments
- \`@df-bot unlock\` → Unlock comments

**Other**
- \`@df-bot title <new title>\` → Change the title
- \`@df-bot milestone <name>\` → Set a milestone
- \`@df-bot help\` → Show this help`,
    },
  },
  auto_labels: {
    bug: ["bug", "error", "crash", "broken", "exception"],
    enhancement: ["feature", "enhancement", "improvement", "request"],
    documentation: ["docs", "documentation", "readme"],
    question: ["question", "how", "why", "help"],
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

  if (aa.ignore_labels?.some((l) => existingLabels.includes(l))) return;
  if (aa.only_labels?.length > 0 && !aa.only_labels.some((l) => existingLabels.includes(l))) return;

  let chosen = [];

  if (aa.strategy === "all") {
    chosen = aa.assignees;
  } else if (aa.strategy === "random") {
    chosen = [aa.assignees[Math.floor(Math.random() * aa.assignees.length)]];
  } else {
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
          await comment(issueNumber, `✅ Label \`${label}\` added.`);
        } catch {
          await comment(issueNumber, `❌ Could not add label \`${label}\`. Does it exist in the repository?`);
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
          await comment(issueNumber, `✅ Label \`${label}\` removed.`);
        } catch {
          await comment(issueNumber, `❌ Could not remove label \`${label}\`.`);
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
          await comment(issueNumber, `✅ Assigned @${user}.`);
        } catch {
          await comment(issueNumber, `❌ Could not assign @${user}.`);
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
          await comment(issueNumber, `✅ Unassigned @${user}.`);
        } catch {
          await comment(issueNumber, `❌ Could not unassign @${user}.`);
        }
      }
      return;
    }

    // CLOSE
    if (lower.match(/@df-bot\s+close\b/i) && config.features.close_command) {
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "closed" });
      await comment(issueNumber, "✅ Closed.");
      return;
    }

    // REOPEN
    if (lower.match(/@df-bot\s+reopen\b/i) && config.features.reopen_command) {
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "open" });
      await comment(issueNumber, "✅ Reopened.");
      return;
    }

    // LOCK
    if (lower.match(/@df-bot\s+lock\b/i) && config.features.lock_command) {
      try {
        await octokit.issues.lock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔒 Comments locked.");
      } catch {
        await comment(issueNumber, "❌ Failed to lock.");
      }
      return;
    }

    // UNLOCK
    if (lower.match(/@df-bot\s+unlock\b/i) && config.features.unlock_command) {
      try {
        await octokit.issues.unlock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔓 Comments unlocked.");
      } catch {
        await comment(issueNumber, "❌ Failed to unlock.");
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
          await comment(issueNumber, `✅ Title changed to: **${newTitle}**`);
        } catch {
          await comment(issueNumber, "❌ Could not change title.");
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
            await comment(issueNumber, `✅ Milestone **${milestone.title}** set.`);
          } else {
            await comment(issueNumber, `❌ Milestone "${milestoneName}" not found.`);
          }
        } catch {
          await comment(issueNumber, "❌ Could not set milestone.");
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
