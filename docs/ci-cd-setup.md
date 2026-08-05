# Setting Up CI/CD for MySQL Query MCP Server

This guide explains how to set up the necessary GitHub environment for CI/CD automation.

## Publishing Authentication

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
over OIDC. There is no npm token, and no publishing secret to store or rotate.
Each publish authenticates with a short-lived token minted by GitHub for that one
workflow run, which cannot be extracted or reused.

`NPM_TOKEN` is no longer used and the repository secret can be deleted.

### What makes it work

Three things have to agree. If any one of them is wrong, `npm publish` fails with
a confusing `E404 Not Found - PUT`, because npm returns 404 rather than 401 for a
package you are not authorized to publish.

1. **The trusted publisher on npm.** On the package's Settings page at npmjs.com,
   the Trusted Publisher entry must name this repository (`devakone/mysql-query-mcp-server`)
   and the workflow file that publishes, which is `ci.yml`.

2. **The `id-token: write` permission.** Granted on the `publish-npm` job in
   `.github/workflows/ci.yml`. Without it GitHub will not mint an OIDC token.

3. **npm 11.5.1 or later.** Node 22.13.0 ships npm 10, which has no OIDC support,
   so the workflow installs a newer npm before publishing.

### Gotchas

- **Renaming the workflow file breaks publishing.** The trust relationship is
  bound to the file name. If `ci.yml` is renamed or the publish job moves to
  another file, update the Trusted Publisher entry on npm to match.
- **Do not write an `.npmrc` auth token in the publish job.** A token takes
  precedence over OIDC, which reintroduces exactly the long-lived credential this
  setup removes.
- **A separate `publish-npm.yml` triggered by `on: release` will not work here.**
  release-please creates the GitHub release using `secrets.GITHUB_TOKEN`, and
  events raised by `GITHUB_TOKEN` deliberately do not trigger further workflow
  runs. That is why publishing stays in `ci.yml`, gated on release-please's
  `releases_created` output.

## How Release Process Works

The release process is fully automated using Google's [release-please](https://github.com/googleapis/release-please) tool (v4.2.0):

1. **Conventional Commit Messages**: When you merge changes to the `main` branch, commits are analyzed to determine the version bump type based on conventional commit prefixes (`feat:`, `fix:`, etc.)

2. **Release PR**: A pull request is automatically created/updated with version bumps to:
   - `package.json`
   - `CHANGELOG.md`

3. **Publishing**: When the release PR is merged:
   - A GitHub release is created
   - The package is published to npm
   - A git tag is created

4. **Configuration Files**:
   - `.github/release-please-config.json` - Main configuration for release-please
   - `.release-please-manifest.json` - Tracks current versions for the project

## Manual Releases

If you need to create a release manually:

1. Ensure you have the latest `main` branch:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Update version in `package.json` and update `CHANGELOG.md`

3. Commit and push:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.2.3"
   git push origin main
   ```

4. Create a GitHub release manually with the proper tag

5. Publish to npm:
   ```bash
   npm publish
   ``` 