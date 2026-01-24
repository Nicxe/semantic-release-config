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

## License

MIT
