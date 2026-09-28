/**
 * DF-Bot - Runs fully on GitHub Actions (no PC / no server needed)
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const eventName = process.env.GITHUB_EVENT_NAME;
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

const owner = event.repository.owner.login;
const repo = event.repository.name;

async function main() {
  console.log(`DF-Bot received event: ${eventName}`);

  // New Issue opened
  if (eventName === "issues" && event.action === "opened") {
    const issueNumber = event.issue.number;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: "👋 Thanks for opening this issue!\n\nI'm **DF-Bot**. I help manage and automate tasks in this repository.\n\nFeel free to ask for help or assign labels.",
    });

    console.log(`Commented on issue #${issueNumber}`);
  }

  // New Pull Request opened
  if (eventName === "pull_request" && event.action === "opened") {
    const prNumber = event.pull_request.number;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: "🚀 Thanks for the pull request!\n\n**DF-Bot** will help review and manage changes. Make sure CI passes and the description is clear.",
    });

    console.log(`Commented on PR #${prNumber}`);
  }

  // Comment created – respond to @df-bot help
  if (eventName === "issue_comment" && event.action === "created") {
    const commentBody = event.comment.body.toLowerCase();
    const issueNumber = event.issue.number;

    // Don't reply to ourselves
    if (event.comment.user.type === "Bot") return;

    if (commentBody.includes("@df-bot") && commentBody.includes("help")) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: "### DF-Bot Help\n\nI can currently:\n- Welcome new issues and pull requests\n- Respond to `@df-bot help`\n\nEverything runs fully on GitHub Actions – no external server needed.\n\nWant more features? Just tell me!",
      });

      console.log(`Helped on issue/PR #${issueNumber}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
