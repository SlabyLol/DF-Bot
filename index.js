/**
 * DF-Bot - GitHub App
 * A bot that helps manage and automate your projects on GitHub.
 */

export default (app) => {
  app.log.info("DF-Bot is loaded and ready!");

  // Welcome new issues
  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "👋 Thanks for opening this issue!\n\nI'm **DF-Bot**. I can help manage and automate tasks in this repository.\n\nFeel free to ask for help or assign labels.",
    });
    return context.octokit.issues.createComment(issueComment);
  });

  // Welcome new pull requests
  app.on("pull_request.opened", async (context) => {
    const prComment = context.issue({
      body: "🚀 Thanks for the pull request!\n\n**DF-Bot** will help review and manage changes. Make sure CI passes and the description is clear.",
    });
    return context.octokit.issues.createComment(prComment);
  });

  // React when someone comments "@df-bot help"
  app.on("issue_comment.created", async (context) => {
    const comment = context.payload.comment.body.toLowerCase();

    if (comment.includes("@df-bot") && comment.includes("help")) {
      const helpComment = context.issue({
        body: "### DF-Bot Help\n\nI can currently:\n- Welcome new issues and pull requests\n- Respond to `@df-bot help`\n\nMore features can be added easily. Tell me what you need!",
      });
      return context.octokit.issues.createComment(helpComment);
    }
  });

  // Log any errors
  app.onError(async (error) => {
    app.log.error(error);
  });
};
