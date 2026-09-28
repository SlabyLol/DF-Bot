/**
 * DF-Bot - Runs fully on GitHub Actions
 * Supports df-bot.yml configuration
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";
import yaml from "js-yaml";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const eventName = process.env.GITHUB_EVENT_NAME;
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

const owner = event.repository.owner.login;
const repo = event.repository.name;

// Default config (used when no df-bot.yml exists)
const defaultConfig = {
  features: {
    welcome_issues: true,
    welcome_pull_requests: true,
    help_command: true,
    label_command: true,
    close_command: true,
    reopen_command: true,
    auto_labels: true,
  },
  messages: {
    issue_opened:
      "👋 Thanks for opening this issue!\n\nI'm **DF-Bot**. Type `@df-bot help` for commands.",
    pull_request_opened:
      "🚀 Thanks for the pull request!\n\n**DF-Bot** is watching. Type `@df-bot help` for commands.",
  },
  commands: {
    help: {
      response:
        "### DF-Bot Commands\n\n- `@df-bot help` → Show this help\n- `@df-bot label <name>` → Add a label\n- `@df-bot close` → Close the issue/PR\n- `@df-bot reopen` → Reopen the issue/PR",
    },
  },
  auto_labels: {
    bug: ["bug", "error", "crash", "broken"],
    enhancement: ["feature", "enhancement", "improvement", "request"],
    documentation: ["docs", "documentation", "readme"],
  },
};

function loadConfig() {
  try {
    if (fs.existsSync("df-bot.yml")) {
      const file = fs.readFileSync("df-bot.yml", "utf8");
      const config = yaml.load(file);
      console.log("Loaded df-bot.yml configuration");
      return { ...defaultConfig, ...config, features: { ...defaultConfig.features, ...(config.features || {}) } };
    }
  } catch (err) {
    console.log("No valid df-bot.yml found, using defaults");
  }
  return defaultConfig;
}

async function addAutoLabels(issueNumber, title, config) {
  if (!config.features.auto_labels || !config.auto_labels) return;

  const titleLower = title.toLowerCase();
  const labelsToAdd = [];

  for (const [label, keywords] of Object.entries(config.auto_labels)) {
    if (keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      labelsToAdd.push(label);
    }
  }

  if (labelsToAdd.length > 0) {
    try {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: labelsToAdd,
      });
      console.log(`Added labels: ${labelsToAdd.join(", ")}`);
    } catch (err) {
      console.log("Could not add labels (maybe they don't exist yet):", err.message);
    }
  }
}

async function main() {
  const config = loadConfig();
  console.log(`DF-Bot received event: ${eventName}`);

  // New Issue opened
  if (eventName === "issues" && event.action === "opened") {
    const issueNumber = event.issue.number;
    const title = event.issue.title;

    if (config.features.welcome_issues) {
      const body = config.messages?.issue_opened || defaultConfig.messages.issue_opened;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      console.log(`Welcomed issue #${issueNumber}`);
    }

    await addAutoLabels(issueNumber, title, config);
  }

  // New Pull Request opened
  if (eventName === "pull_request" && event.action === "opened") {
    const prNumber = event.pull_request.number;
    const title = event.pull_request.title;

    if (config.features.welcome_pull_requests) {
      const body = config.messages?.pull_request_opened || defaultConfig.messages.pull_request_opened;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log(`Welcomed PR #${prNumber}`);
    }

    await addAutoLabels(prNumber, title, config);
  }

  // Comment created – handle commands
  if (eventName === "issue_comment" && event.action === "created") {
    const commentBody = event.comment.body.trim();
    const commentLower = commentBody.toLowerCase();
    const issueNumber = event.issue.number;

    // Don't reply to bots
    if (event.comment.user.type === "Bot") return;

    // Only react to @df-bot mentions
    if (!commentLower.includes("@df-bot")) return;

    // HELP
    if (commentLower.includes("help") && config.features.help_command) {
      const response =
        config.commands?.help?.response || defaultConfig.commands.help.response;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: response,
      });
      console.log(`Helped on #${issueNumber}`);
      return;
    }

    // LABEL <name>
    if (commentLower.includes("label") && config.features.label_command) {
      const match = commentBody.match(/@df-bot\s+label\s+([\w-]+)/i);
      if (match) {
        const label = match[1];
        try {
          await octokit.issues.addLabels({
            owner,
            repo,
            issue_number: issueNumber,
            labels: [label],
          });
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: `✅ Label \`${label}\` added.`,
          });
          console.log(`Added label ${label} on #${issueNumber}`);
        } catch (err) {
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: `❌ Could not add label \`${label}\`. Make sure the label exists in the repository.`,
          });
        }
      }
      return;
    }

    // CLOSE
    if (commentLower.includes("close") && config.features.close_command) {
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: "closed",
      });
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: "✅ Closed.",
      });
      console.log(`Closed #${issueNumber}`);
      return;
    }

    // REOPEN
    if (commentLower.includes("reopen") && config.features.reopen_command) {
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: "open",
      });
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: "✅ Reopened.",
      });
      console.log(`Reopened #${issueNumber}`);
      return;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
