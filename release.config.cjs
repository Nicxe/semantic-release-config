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
        preset: "conventionalcommits"
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
        draftRelease: true
      }
    ]
  ]
};