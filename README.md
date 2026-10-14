# @nicxe/semantic-release-config

Shared semantic-release configuration for Nicxe repositories.

## Installation

```bash
npm install --save-dev @nicxe/semantic-release-config
```

## Usage

Create a `release.config.js` file in your project root:

```javascript
module.exports = {
  extends: '@nicxe/semantic-release-config',
};
```

## What's included

This configuration includes

- **@semantic-release/commit-analyzer** - Analyzes commits to determine version bump
- **@semantic-release/release-notes-generator** - Generates release notes
- **@semantic-release/npm** - Publishes to npm
- **@semantic-release/github** - Creates GitHub releases

## Commit message format

This config uses [Conventional Commits](https://www.conventionalcommits.org/):

| Commit type | Release type |
|-------------|--------------|
| `fix:` | Patch release |
| `feat:` | Minor release |
| `BREAKING CHANGE:` | Major release |

Use plain-text, user-facing summaries. Release formatting is applied by the
shared template, so commit subjects must not contain Markdown. Keep commit
bodies empty unless they add essential user context, migration guidance, or a
resolved-issue reference such as `Fixes #123`.

The template shows `feat`, `fix`, `perf`, legacy `blue`, and `docs` entries.
It also shows only user-facing chores with one of these scopes:
`translations`, `i18n`, `accessibility`, `a11y`, or `compatibility`. Internal
chores, refactors, tests, CI, build work, dependency maintenance, branch
synchronization, release tooling, and formatting-only commits are omitted.

For a breaking change, use `feat(scope)!:` or `fix(scope)!:` and a final
`BREAKING CHANGE:` footer. Use `feat(blueprint):` for a new or materially
expanded blueprint instead of a custom `blue:` type.

Pass `f1Theme: true` when generating F1 Sensor release notes to add its race
banner above the beta notice. Other repositories keep the shared layout without
the F1-specific decoration.

## License

MIT
