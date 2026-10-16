const assert = require("node:assert/strict");
const test = require("node:test");

async function generateNotes(commits) {
  const config = require("../index.js")({
    kind: "assets",
    assets: [{ path: "card.js" }],
    projectName: "F1 Sensor",
    repoSlug: "Nicxe/f1_sensor",
    f1Theme: true,
    notifyIssues: false
  });
  const [, options] = config.plugins.find(
    ([name]) => name === "@semantic-release/release-notes-generator"
  );
  const { generateNotes: render } = await import(
    "@semantic-release/release-notes-generator"
  );
  return render(options, {
    cwd: process.cwd(),
    env: process.env,
    logger: console,
    options: { repositoryUrl: "https://github.com/Nicxe/f1_sensor.git" },
    commits,
    lastRelease: { gitTag: "v1.0.0", version: "1.0.0" },
    nextRelease: {
      gitTag: "v1.1.0-beta.1",
      version: "1.1.0-beta.1",
      channel: "beta"
    }
  });
}

async function generateNotesWithContributors(contributors) {
  const previous = process.env.RELEASE_CONTRIBUTORS;
  process.env.RELEASE_CONTRIBUTORS = JSON.stringify(contributors);
  try {
    return await generateNotes([
      { hash: "contributors", message: "feat(card): Add contributor credits" }
    ]);
  } finally {
    if (previous === undefined) delete process.env.RELEASE_CONTRIBUTORS;
    else process.env.RELEASE_CONTRIBUTORS = previous;
  }
}

test("renders user-facing release notes without internal commit noise", async () => {
  const notes = await generateNotes([
    { hash: "1", message: "feat(card): Add timing comparison" },
    {
      hash: "2",
      message:
        "fix(integration): Restore delayed race timing\n\nKeeps live timing connected through the finish.\n\nFixes #772."
    },
    {
      hash: "3",
      message: "chore(translations): Improve Swedish live data card labels"
    },
    {
      hash: "4",
      message: "chore(accessibility): Improve keyboard navigation"
    },
    { hash: "5", message: "chore: Update release tooling" },
    { hash: "6", message: "test: Cover release-note generation" },
    { hash: "7", message: "fix(card): **Keep replay details visible**" },
    {
      hash: "8",
      message: "chore(translations): Improve Swedish live data card labels"
    },
    {
      hash: "9",
      message:
        "chore(l10n): update Portuguese translation\n\nTranslation: F1 Sensor/Integration\nLanguage: Portuguese\nProgress: 57.3% (113 of 197 strings)\nTranslate-URL: https://hosted.weblate.org/projects/f1-sensor/integration/pt/"
    }
  ]);

  const downloadShield =
    /github\/downloads\/Nicxe\/f1_sensor\/v1\.1\.0-beta\.1\/total/;
  assert.match(notes, downloadShield);
  assert.match(notes, /This is a \*\*beta release\*\*/);
  assert.match(notes, /GitHub Sponsors/);
  assert.match(notes, /🏎️ 🏁 🏎️ 🏁 🏎️ 🏁 🏎️ 🏁 🏎️ 🏁/);
  assert.match(notes, /🏎️ 🏁 🏎️ 🏁 🏎️ 🏁 🏎️ 🏁 🏎️ 🏁\n\n---\n\n⚠️/);
  assert.match(notes, /<!-- release-editorial:start -->/);
  assert.match(notes, /Optional editorial summary/);
  assert.match(notes, /<!-- release-editorial:end -->/);
  assert.match(notes, /### New features/);
  assert.match(notes, /### Bug fixes/);
  assert.match(notes, /### Improvements/);
  assert.match(notes, /### Translations/);
  assert.match(notes, /\*\*Update Portuguese translation\*\*/);
  assert.match(notes, /Updated Portuguese translation through Weblate\./);
  assert.doesNotMatch(notes, /## \*\*F1 Sensor – v1\.1\.0-beta\.1\*\*/);
  assert.doesNotMatch(notes, /^> ⭐/m);
  assert.doesNotMatch(notes, /### Support F1 Sensor/);
  assert.match(notes, /\*\*Keep replay details visible\*\*/);
  assert.match(notes, /Keeps live timing connected through the finish\. Fixes #772\./);
  assert.doesNotMatch(notes, /\*\*\*\*Keep replay details visible\*\*\*\*/);
  assert.doesNotMatch(notes, /Update release tooling/);
  assert.doesNotMatch(notes, /Cover release-note generation/);
  assert.ok(
    notes.lastIndexOf("github/downloads/") > notes.lastIndexOf("Buy Me A Coffee")
  );
  assert.equal(
    (notes.match(/Improve Swedish live data card labels/g) || []).length,
    1
  );
});

test("renders filtered authors and contributors when the release workflow provides them", async () => {
  const notes = await generateNotesWithContributors(["alice", "bob"]);

  assert.match(notes, /### Authors & contributors/);
  assert.match(
    notes,
    /Thanks to \[@alice\]\(https:\/\/github\.com\/alice\) and \[@bob\]\(https:\/\/github\.com\/bob\) for contributing to this release\./
  );
});
