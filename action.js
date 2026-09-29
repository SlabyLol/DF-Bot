import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import fs from "fs";
import yaml from "js-yaml";
import { execSync } from "child_process";

const eventName = process.env.GITHUB_EVENT_NAME;
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

const owner = event.repository?.owner?.login || event.repository?.owner?.name;
const repo = event.repository?.name;
const defaultBranch = event.repository?.default_branch || "main";

let octokit;

async function createOctokitClient() {
  const appId = process.env.APP_ID;
  let privateKey = process.env.PRIVATE_KEY;

  if (appId && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");

    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
      },
    });

    const { data: installation } = await appOctokit.rest.apps.getRepoInstallation({
      owner,
      repo,
    });

    console.log("Using GitHub App auth as DF-Bot[bot], installation:", installation.id);

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId: installation.id,
      },
    });
  }

  console.log("APP_ID/PRIVATE_KEY not set – falling back to github-actions[bot]");
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

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
    create_file_command: true,
    update_file_command: true,
    delete_file_command: true,
    create_branch_command: true,
    create_pr_command: true,
    bump_version_command: true,
    run_command: true,
  },
  contributor_only: [
    "close", "reopen", "lock", "unlock", "create-file", "update-file", "delete-file",
    "create-branch", "create-pr", "bump", "run", "assign", "unassign", "label",
    "unlabel", "title", "milestone",
  ],
  messages: {
    issue_opened: "👋 Thanks for opening this issue!\n\nI'm **DF-Bot**. Type `@df-bot help` to see all commands.",
    pull_request_opened: "🚀 Thanks for the pull request!\n\n**DF-Bot** is watching. Type `@df-bot help` for commands.",
  },
  commands: {
    help: {
      response: `### 🤖 DF-Bot – All Commands

**Public**
- \`@df-bot help\` → Show this help

**Contributors only**
- Labels / assign / close / lock / title / milestone
- Files: create-file, update-file, delete-file
- Git: create-branch, create-pr, bump

**Run any command** (contributors only)
\`\`\`
@df-bot run <command> /Z/ <name> /P/ file1 file2
\`\`\`
- command = shell command
- \`/Z/ name\` = optional label
- \`/P/ files\` = commit & push these files after the run

Examples:
\`\`\`
@df-bot run pip install opencomb /Z/ opencomb
@df-bot run opencomb --out . /P/ file.hello file.py
@df-bot run pip install opencomb /Z/ opencomb /P/ file.hello file.py
\`\`\``,
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
        contributor_only: userConfig.contributor_only || defaultConfig.contributor_only,
      };
    }
  } catch (err) {
    console.log("Config load error, using defaults:", err.message);
  }
  return defaultConfig;
}

async function isContributor(username) {
  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({ owner, repo, username });
    return ["admin", "maintain", "write"].includes(data.permission);
  } catch {
    return false;
  }
}

function requiresContributor(commandKey, config) {
  return (config.contributor_only || []).includes(commandKey);
}

async function comment(issueNumber, body) {
  if (!issueNumber) return;
  await octokit.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function getFileSha(path, branch = defaultBranch) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    return data.sha;
  } catch {
    return null;
  }
}

async function createOrUpdateFile(path, content, message, branch = defaultBranch) {
  const sha = await getFileSha(path, branch);
  const params = {
    owner, repo, path, message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (sha) params.sha = sha;
  return (await octokit.repos.createOrUpdateFileContents(params)).data;
}

async function deleteFile(path, message, branch = defaultBranch) {
  const sha = await getFileSha(path, branch);
  if (!sha) throw new Error("File not found");
  await octokit.repos.deleteFile({ owner, repo, path, message, sha, branch });
}

async function addAutoLabels(issueNumber, title, config) {
  if (!config.features.auto_labels || !config.auto_labels) return;
  const titleLower = title.toLowerCase();
  const labelsToAdd = [];
  for (const [label, keywords] of Object.entries(config.auto_labels)) {
    if (keywords.some((kw) => titleLower.includes(String(kw).toLowerCase()))) labelsToAdd.push(label);
  }
  if (labelsToAdd.length > 0) {
    try {
      await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: labelsToAdd });
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
  if (aa.strategy === "all") chosen = aa.assignees;
  else if (aa.strategy === "random") chosen = [aa.assignees[Math.floor(Math.random() * aa.assignees.length)]];
  else chosen = [aa.assignees[issueNumber % aa.assignees.length]];
  try {
    await octokit.issues.addAssignees({ owner, repo, issue_number: issueNumber, assignees: chosen });
  } catch (err) {
    console.log("Auto-assign failed:", err.message);
  }
}

async function guard(commandKey, sender, issueNumber, config) {
  if (!requiresContributor(commandKey, config)) return true;
  const ok = await isContributor(sender);
  if (!ok) {
    await comment(issueNumber, "❌ This command is only available for repository collaborators (write access or higher).");
    return false;
  }
  return true;
}

function parseRunCommand(body) {
  const afterRun = body.replace(/^.*?@df-bot\s+run\s+/i, "").trim();
  if (!afterRun) return null;

  let zone = null;
  let files = [];

  const zIdx = afterRun.search(/\s\/Z\/\s/i);
  const pIdx = afterRun.search(/\s\/P\/\s/i);

  const markers = [];
  if (zIdx >= 0) markers.push({ type: "Z", idx: zIdx });
  if (pIdx >= 0) markers.push({ type: "P", idx: pIdx });
  markers.sort((a, b) => a.idx - b.idx);

  if (markers.length === 0) {
    return { command: afterRun.trim(), zone: null, files: [] };
  }

  const cmdPart = afterRun.slice(0, markers[0].idx).trim();

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx;
    const end = i + 1 < markers.length ? markers[i + 1].idx : afterRun.length;
    const segment = afterRun.slice(start, end).replace(/^\s\/[ZP]\/\s*/i, "").trim();
    if (markers[i].type === "Z") zone = segment.split(/\s+/)[0] || segment;
    if (markers[i].type === "P") files = segment.split(/\s+/).filter(Boolean);
  }

  return { command: cmdPart, zone, files };
}

function pushGeneratedFiles(files, zone) {
  const existing = files.filter((f) => fs.existsSync(f));
  if (existing.length === 0) {
    return { ok: false, message: "No listed files found on disk to push." };
  }

  try {
    execSync("git config user.name DF-Bot");
    execSync("git config user.email df-bot[bot]@users.noreply.github.com");
    for (const f of existing) {
      execSync("git add -- " + JSON.stringify(f));
    }
    const msg = zone
      ? "df-bot: run " + zone + " - push generated files"
      : "df-bot: push generated files";
    try {
      execSync("git commit -m " + JSON.stringify(msg));
    } catch {
    }
    execSync("git push origin HEAD:" + defaultBranch);
    return { ok: true, files: existing };
  } catch (err) {
    return { ok: false, message: (err.stderr || err.message || String(err)).toString().slice(0, 1500) };
  }
}

async function main() {
  octokit = await createOctokitClient();

  const config = loadConfig();
  console.log("Event:", eventName);

  if (eventName === "workflow_dispatch") {
    console.log("Manual run – use issue comments for bot commands.");
    return;
  }

  if (eventName === "issues" && event.action === "opened") {
    const issueNumber = event.issue.number;
    const title = event.issue.title;
    const labels = (event.issue.labels || []).map((l) => l.name);
    if (config.features.welcome_issues) await comment(issueNumber, config.messages.issue_opened);
    await addAutoLabels(issueNumber, title, config);
    await doAutoAssign(issueNumber, labels, config);
  }

  if (eventName === "pull_request" && (event.action === "opened" || event.action === "reopened")) {
    const prNumber = event.pull_request.number;
    const title = event.pull_request.title;
    const labels = (event.pull_request.labels || []).map((l) => l.name);
    if (config.features.welcome_pull_requests) await comment(prNumber, config.messages.pull_request_opened);
    await addAutoLabels(prNumber, title, config);
    await doAutoAssign(prNumber, labels, config);
  }

  if (eventName === "issue_comment" && event.action === "created") {
    const body = event.comment.body.trim();
    const lower = body.toLowerCase();
    const issueNumber = event.issue.number;
    const sender = event.comment.user.login;

    if (event.comment.user.type === "Bot") return;
    if (!lower.includes("@df-bot")) return;

    if (lower.includes("help") && !lower.match(/@df-bot\s+run\b/i) && config.features.help_command) {
      await comment(issueNumber, config.commands?.help?.response || defaultConfig.commands.help.response);
      return;
    }

    if (lower.match(/@df-bot\s+run\s+/i) && config.features.run_command) {
      if (!(await guard("run", sender, issueNumber, config))) return;
      const parsed = parseRunCommand(body);
      if (!parsed || !parsed.command) {
        await comment(
          issueNumber,
          "❌ Usage:\n```\n@df-bot run <command> /Z/ <name> /P/ file1 file2\n```\nExample:\n```\n@df-bot run pip install opencomb /Z/ opencomb /P/ file.hello file.py\n```"
        );
        return;
      }

      const label = parsed.zone ? " (" + parsed.zone + ")" : "";
      try {
        const output = execSync(parsed.command, {
          encoding: "utf8",
          timeout: 300000,
          shell: true,
          env: { ...process.env },
        });
        const trimmed = (output || "").trim().slice(0, 3000) || "(no output)";

        let pushNote = "";
        if (parsed.files.length > 0) {
          const result = pushGeneratedFiles(parsed.files, parsed.zone);
          if (result.ok) {
            pushNote = "\n\n📦 Pushed files: " + result.files.map((f) => "`" + f + "`").join(", ");
          } else {
            pushNote = "\n\n⚠️ Push failed: " + result.message;
          }
        }

        await comment(
          issueNumber,
          "✅ Run" + label + " finished.\n\n**Command:** `" + parsed.command + "`\n\n```\n" + trimmed + "\n```" + pushNote
        );
      } catch (err) {
        const msg = (err.stdout || err.stderr || err.message || "").toString().slice(0, 3000);
        await comment(
          issueNumber,
          "❌ Run" + label + " failed.\n\n**Command:** `" + parsed.command + "`\n\n```\n" + msg + "\n```"
        );
      }
      return;
    }

    if (lower.match(/@df-bot\s+label\s+/i) && config.features.label_command) {
      if (!(await guard("label", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+label\s+([\w-]+)/i);
      if (match) {
        try {
          await octokit.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [match[1]] });
          await comment(issueNumber, "✅ Label `" + match[1] + "` added.");
        } catch {
          await comment(issueNumber, "❌ Could not add label `" + match[1] + "`.");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+unlabel\s+/i) && config.features.unlabel_command) {
      if (!(await guard("unlabel", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+unlabel\s+([\w-]+)/i);
      if (match) {
        try {
          await octokit.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: match[1] });
          await comment(issueNumber, "✅ Label `" + match[1] + "` removed.");
        } catch {
          await comment(issueNumber, "❌ Could not remove label `" + match[1] + "`.");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+assign\s+/i) && config.features.assign_command) {
      if (!(await guard("assign", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+assign\s+(@?[\w-]+)/i);
      if (match) {
        let user = match[1].replace("@", "");
        if (user.toLowerCase() === "me") user = sender;
        try {
          await octokit.issues.addAssignees({ owner, repo, issue_number: issueNumber, assignees: [user] });
          await comment(issueNumber, "✅ Assigned @" + user + ".");
        } catch {
          await comment(issueNumber, "❌ Could not assign @" + user + ".");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+unassign\s+/i) && config.features.unassign_command) {
      if (!(await guard("unassign", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+unassign\s+(@?[\w-]+)/i);
      if (match) {
        let user = match[1].replace("@", "");
        if (user.toLowerCase() === "me") user = sender;
        try {
          await octokit.issues.removeAssignees({ owner, repo, issue_number: issueNumber, assignees: [user] });
          await comment(issueNumber, "✅ Unassigned @" + user + ".");
        } catch {
          await comment(issueNumber, "❌ Could not unassign @" + user + ".");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+close\b/i) && config.features.close_command) {
      if (!(await guard("close", sender, issueNumber, config))) return;
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "closed" });
      await comment(issueNumber, "✅ Closed.");
      return;
    }

    if (lower.match(/@df-bot\s+reopen\b/i) && config.features.reopen_command) {
      if (!(await guard("reopen", sender, issueNumber, config))) return;
      await octokit.issues.update({ owner, repo, issue_number: issueNumber, state: "open" });
      await comment(issueNumber, "✅ Reopened.");
      return;
    }

    if (lower.match(/@df-bot\s+lock\b/i) && config.features.lock_command) {
      if (!(await guard("lock", sender, issueNumber, config))) return;
      try {
        await octokit.issues.lock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔒 Comments locked.");
      } catch {
        await comment(issueNumber, "❌ Failed to lock.");
      }
      return;
    }

    if (lower.match(/@df-bot\s+unlock\b/i) && config.features.unlock_command) {
      if (!(await guard("unlock", sender, issueNumber, config))) return;
      try {
        await octokit.issues.unlock({ owner, repo, issue_number: issueNumber });
        await comment(issueNumber, "🔓 Comments unlocked.");
      } catch {
        await comment(issueNumber, "❌ Failed to unlock.");
      }
      return;
    }

    if (lower.match(/@df-bot\s+title\s+/i) && config.features.title_command) {
      if (!(await guard("title", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+title\s+(.+)/i);
      if (match) {
        try {
          await octokit.issues.update({ owner, repo, issue_number: issueNumber, title: match[1].trim() });
          await comment(issueNumber, "✅ Title changed to: **" + match[1].trim() + "**");
        } catch {
          await comment(issueNumber, "❌ Could not change title.");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+milestone\s+/i) && config.features.milestone_command) {
      if (!(await guard("milestone", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+milestone\s+(.+)/i);
      if (match) {
        const name = match[1].trim();
        try {
          const { data: milestones } = await octokit.issues.listMilestones({ owner, repo, state: "open" });
          const milestone = milestones.find((m) => m.title.toLowerCase() === name.toLowerCase());
          if (milestone) {
            await octokit.issues.update({ owner, repo, issue_number: issueNumber, milestone: milestone.number });
            await comment(issueNumber, "✅ Milestone **" + milestone.title + "** set.");
          } else {
            await comment(issueNumber, "❌ Milestone \"" + name + "\" not found.");
          }
        } catch {
          await comment(issueNumber, "❌ Could not set milestone.");
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+create-file\s+/i) && config.features.create_file_command) {
      if (!(await guard("create-file", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+create-file\s+(.+?)\s*\|\s*([\s\S]+)/i);
      if (match) {
        try {
          await createOrUpdateFile(match[1].trim(), match[2].trim(), "df-bot: create " + match[1].trim());
          await comment(issueNumber, "✅ File `" + match[1].trim() + "` created and committed.");
        } catch (err) {
          await comment(issueNumber, "❌ Could not create file: " + err.message);
        }
      } else {
        await comment(issueNumber, "❌ Usage: `@df-bot create-file path/to/file.txt | content here`");
      }
      return;
    }

    if (lower.match(/@df-bot\s+update-file\s+/i) && config.features.update_file_command) {
      if (!(await guard("update-file", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+update-file\s+(.+?)\s*\|\s*([\s\S]+)/i);
      if (match) {
        try {
          await createOrUpdateFile(match[1].trim(), match[2].trim(), "df-bot: update " + match[1].trim());
          await comment(issueNumber, "✅ File `" + match[1].trim() + "` updated and committed.");
        } catch (err) {
          await comment(issueNumber, "❌ Could not update file: " + err.message);
        }
      } else {
        await comment(issueNumber, "❌ Usage: `@df-bot update-file path/to/file.txt | new content`");
      }
      return;
    }

    if (lower.match(/@df-bot\s+delete-file\s+/i) && config.features.delete_file_command) {
      if (!(await guard("delete-file", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+delete-file\s+(.+)/i);
      if (match) {
        try {
          await deleteFile(match[1].trim(), "df-bot: delete " + match[1].trim());
          await comment(issueNumber, "✅ File `" + match[1].trim() + "` deleted and committed.");
        } catch (err) {
          await comment(issueNumber, "❌ Could not delete file: " + err.message);
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+create-branch\s+/i) && config.features.create_branch_command) {
      if (!(await guard("create-branch", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+create-branch\s+([\w\/.-]+)/i);
      if (match) {
        try {
          const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/" + defaultBranch });
          await octokit.git.createRef({ owner, repo, ref: "refs/heads/" + match[1], sha: ref.object.sha });
          await comment(issueNumber, "✅ Branch `" + match[1] + "` created.");
        } catch (err) {
          await comment(issueNumber, "❌ Could not create branch: " + err.message);
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+create-pr\s+/i) && config.features.create_pr_command) {
      if (!(await guard("create-pr", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+create-pr\s+(.+)/i);
      if (match) {
        try {
          const branchName = "df-bot/issue-" + issueNumber;
          try {
            const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/" + defaultBranch });
            await octokit.git.createRef({ owner, repo, ref: "refs/heads/" + branchName, sha: ref.object.sha });
          } catch {}
          const { data: pr } = await octokit.pulls.create({
            owner, repo,
            title: match[1].trim(),
            head: branchName,
            base: defaultBranch,
            body: "Created by DF-Bot from issue #" + issueNumber,
          });
          await comment(issueNumber, "✅ Pull Request created: #" + pr.number + " – " + pr.html_url);
        } catch (err) {
          await comment(issueNumber, "❌ Could not create PR: " + err.message);
        }
      }
      return;
    }

    if (lower.match(/@df-bot\s+bump\s+/i) && config.features.bump_version_command) {
      if (!(await guard("bump", sender, issueNumber, config))) return;
      const match = body.match(/@df-bot\s+bump\s+(patch|minor|major)/i);
      if (match) {
        const type = match[1].toLowerCase();
        try {
          const { data: file } = await octokit.repos.getContent({ owner, repo, path: "package.json" });
          const content = Buffer.from(file.content, "base64").toString("utf8");
          const pkg = JSON.parse(content);
          const parts = (pkg.version || "0.0.0").split(".").map(Number);
          if (type === "major") { parts[0] += 1; parts[1] = 0; parts[2] = 0; }
          else if (type === "minor") { parts[1] += 1; parts[2] = 0; }
          else { parts[2] += 1; }
          const newVersion = parts.join(".");
          pkg.version = newVersion;
          await createOrUpdateFile("package.json", JSON.stringify(pkg, null, 2) + "\n", "df-bot: bump version to " + newVersion);
          await comment(issueNumber, "✅ Version bumped to **" + newVersion + "** and committed.");
        } catch (err) {
          await comment(issueNumber, "❌ Could not bump version: " + err.message);
        }
      } else {
        await comment(issueNumber, "❌ Usage: `@df-bot bump patch` or `minor` or `major`");
      }
      return;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
