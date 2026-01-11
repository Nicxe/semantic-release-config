module.exports = {
  tagFormat: "v${version}",

  branches: [
    "main",
    { name: "beta", prerelease: true }
  ],

  plugins: [
    [
      "@semantic-release/commit-analyzer",
      { preset: "conventionalcommits" }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        writerOpts: {
          // Work around "RangeError: Invalid time value" from conventional-changelog-writer
          // when a commit has a missing/invalid committer date in some CI environments.
          transform: (commit) => {
            const transformed = { ...commit };

            const rawDate =
              transformed.committerDate ||
              transformed.authorDate ||
              commit.committerDate ||
              commit.authorDate ||
              commit.commit?.committer?.date ||
              commit.commit?.author?.date;

            const date = new Date(rawDate);
            transformed.committerDate = Number.isNaN(date.getTime())
              ? new Date().toISOString()
              : date.toISOString();

            return transformed;
          }
        }
      }
    ],
    [
      "@semantic-release/npm",
      {
        npmPublish: true
      }
    ],

    [
      "@semantic-release/github",
      {
        // Disable automated PR/issue comments from semantic-release
        successCommentCondition: "<% return false %>",
        failComment: false,
        draftRelease: false
      }
    ]
  ]
};