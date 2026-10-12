const fs = require("fs");
const path = require("path");

const DEFAULT_SECTION_ORDER = [
  "New features",
  "Bug fixes",
  "Improvements",
  "Translations",
  "Blueprints",
  "Documentation",
];

const DEFAULT_RELEASE_NOTE_TYPES = [
  { type: "feat", section: "New features" },
  { type: "fix", section: "Bug fixes" },
  { type: "perf", section: "Improvements" },
  { type: "blue", section: "Blueprints" },
  { type: "docs", section: "Documentation" },
];

const USER_FACING_CHORE_SCOPES = new Map([
  ["accessibility", "Improvements"],
  ["a11y", "Improvements"],
  ["compatibility", "Improvements"],
  ["i18n", "Translations"],
  ["translations", "Translations"]
]);

function normalizedSubject(subject) {
  const trimmed = String(subject || "").trim();
  const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/s);
  return (boldMatch ? boldMatch[1] : trimmed).trim();
}

function sectionForCommit(type, scope) {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType === "chore") {
    return USER_FACING_CHORE_SCOPES.get(String(scope || "").toLowerCase());
  }
  return DEFAULT_RELEASE_NOTE_TYPES.find((entry) => entry.type === normalizedType)
    ?.section;
}

function buildSectionOrderIndex(sectionOrder) {
  return sectionOrder.reduce((acc, title, idx) => {
    acc[title] = idx;
    return acc;
  }, {});
}

function readTemplate({ templatePath } = {}) {
  if (templatePath) {
    // Resolve relative to the consuming repo (semantic-release cwd).
    return fs.readFileSync(path.resolve(process.cwd(), templatePath), "utf8");
  }
  return fs.readFileSync(
    path.join(__dirname, ".release", "release-notes.hbs"),
    "utf8"
  );
}

function defaultZipExcludes() {
  return [
    "__pycache__/*",
    "*.pyc",
    ".DS_Store",
    ".pycacheprefix/*",
    ".pytest_cache/*",
    ".mypy_cache/*"
  ];
}

function quoteSh(value) {
  // Good enough for our paths/args (no embedded double quotes expected).
  return `"${String(value)}"`;
}

/**
 * Create a semantic-release config shared across repos.
 *
 * @param {object} options
 * @param {"integration"|"assets"} [options.kind] - "integration" (zip+manifest) or "assets" (cards)
 * @param {string} [options.componentDir] - e.g. "custom_components/met_rain_risk" (integration)
 * @param {string} [options.manifestPath] - e.g. "custom_components/met_rain_risk/manifest.json" (integration)
 * @param {string} [options.zipName] - defaults to "<component>.zip"
 * @param {string} [options.zipPath] - defaults to "custom_components/<zipName>"
 * @param {Array<{path:string,label?:string,name?:string}>} [options.assets] - GitHub release assets
 * @param {string} [options.projectName] - used by the shared release-notes template
 * @param {string} [options.repoSlug] - "owner/repo" used by the shared release-notes template
 * @param {string} [options.templatePath] - path to a repo-local template to use instead
 * @param {boolean} [options.draftRelease=true] - create draft GitHub releases
 * @param {boolean} [options.notifyIssues=true] - run shared notify-issues script on success
 */
module.exports = function createSemanticReleaseConfig(options = {}) {
  const {
    kind,
    componentDir,
    manifestPath,
    zipName,
    zipPath,
    assets,
    projectName,
    repoSlug,
    templatePath,
    draftRelease = true,
    notifyIssues = true
  } = options;

  const inferredKind =
    kind || (componentDir && manifestPath ? "integration" : "assets");

  if (inferredKind === "integration") {
    if (!componentDir) {
      throw new Error(
        "[semantic-release-config] Missing required option: componentDir (integration)"
      );
    }
    if (!manifestPath) {
      throw new Error(
        "[semantic-release-config] Missing required option: manifestPath (integration)"
      );
    }
  }

  if (inferredKind === "assets" && (!assets || assets.length === 0)) {
    throw new Error(
      "[semantic-release-config] Missing required option: assets (assets/card repos)"
    );
  }

  const componentName =
    (componentDir && path.posix.basename(componentDir)) ||
    (repoSlug ? String(repoSlug).split("/").pop() : "") ||
    "release";

  const resolvedZipName = zipName || `${componentName}.zip`;
  const resolvedZipPath = zipPath
    ? zipPath
    : componentDir
      ? path.posix.join(path.posix.dirname(componentDir), resolvedZipName)
      : resolvedZipName;

  const mainTemplate = readTemplate({ templatePath });

  const sectionOrder = DEFAULT_SECTION_ORDER;
  const sectionOrderIndex = buildSectionOrderIndex(sectionOrder);
  const seenUserFacingChanges = new Set();

  const pkgReleaseDir = path.join(__dirname, ".release");
  const updateManifestScript = path.join(pkgReleaseDir, "update-manifest-version.js");
  const notifyIssuesScript = path.join(pkgReleaseDir, "notify-issues.js");

  const excludes = defaultZipExcludes()
    .map((g) => quoteSh(g))
    .join(" ");

  const execPluginConfig = {};

  if (inferredKind === "integration") {
    execPluginConfig.prepareCmd = [
      `node ${quoteSh(updateManifestScript)} --file ${quoteSh(
        manifestPath
      )} --version ${quoteSh("${nextRelease.version}")}`,
      `&& (cd ${quoteSh(componentDir)} && rm -f ${quoteSh(
        "../" + resolvedZipName
      )} && zip -r ${quoteSh("../" + resolvedZipName)} . -x ${excludes})`
    ].join(" ");
  }

  if (notifyIssues) {
    execPluginConfig.successCmd = `node ${quoteSh(
      notifyIssuesScript
    )} --range ${quoteSh(
      "${lastRelease.gitHead}..${nextRelease.gitHead}"
    )} --version ${quoteSh(
      "${nextRelease.version}"
    )} --git-tag ${quoteSh("${nextRelease.gitTag}")} --channel ${quoteSh(
      "${nextRelease.channel}"
    )}`;
  }

  const githubAssets =
    assets ||
    (inferredKind === "integration"
      ? [
          {
            path: resolvedZipPath,
            label: resolvedZipName
          }
        ]
      : []);

  return {
    tagFormat: "v${version}",
    branches: ["main", { name: "beta", prerelease: true }],
    plugins: [
      ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
      [
        "@semantic-release/release-notes-generator",
        {
          preset: "conventionalcommits",
          presetConfig: {
            types: DEFAULT_RELEASE_NOTE_TYPES
          },
          writerOpts: {
            mainTemplate,
            finalizeContext: (context) => {
              const v = String(context?.version || "");
              context.prerelease = v.includes("-");

              // Extra context keys for shared templates.
              context.projectName = projectName || componentName;
              context.repoSlug =
                repoSlug || process.env.GITHUB_REPOSITORY || "";
              context.componentName = componentName;
              context.zipName = resolvedZipName;

              return context;
            },
            groupBy: "type",
            commitGroupsSort: (a, b) => {
              const aTitle = String(a?.title || "");
              const bTitle = String(b?.title || "");
              const aIdx =
                sectionOrderIndex[aTitle] ?? Number.MAX_SAFE_INTEGER;
              const bIdx =
                sectionOrderIndex[bTitle] ?? Number.MAX_SAFE_INTEGER;
              if (aIdx !== bIdx) return aIdx - bIdx;
              return aTitle.localeCompare(bTitle);
            },
            commitsSort: ["scope", "subject"],
            transform: (commit) => {
              const header = commit.header || commit.subject || "";

              // Don't include GitHub merge commits in release notes
              if (
                /^merge pull request/i.test(header) ||
                /^merge branch/i.test(header)
              ) {
                return null;
              }

              const transformed = { ...commit };
              const subject = normalizedSubject(
                transformed.subject || commit.subject || commit.header
              );
              if (!subject) {
                return null;
              }

              const rawType = String(transformed.type || commit.type || "")
                .trim()
                .toLowerCase();
              const section = sectionForCommit(rawType, transformed.scope || commit.scope);
              if (!section) {
                return null;
              }

              const body = (transformed.body || commit.body || "").trim();
              const dedupeKey = [rawType, transformed.scope || commit.scope || "", subject, body]
                .join("\u0000");
              if (seenUserFacingChanges.has(dedupeKey)) {
                return null;
              }
              seenUserFacingChanges.add(dedupeKey);

              transformed.subject = subject;
              transformed.type = section;

              // Keep a concise user-facing commit body as a list continuation.
              if (body) {
                transformed.bodyIndented = body
                  .split(/\r?\n/)
                  .map((line) => `  ${line}`)
                  .join("\n");
              }

              const rawDate =
                commit.committerDate ||
                commit.authorDate ||
                transformed.committerDate ||
                transformed.authorDate ||
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
      ...(Object.keys(execPluginConfig).length > 0
        ? [["@semantic-release/exec", execPluginConfig]]
        : []),
      [
        "@semantic-release/github",
        {
          draftRelease,
          successCommentCondition: "<% return false %>",
          failComment: false,
          assets: githubAssets
        }
      ]
    ]
  };
};
