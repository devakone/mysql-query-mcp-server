# Setting Up CI/CD for MySQL Query MCP Server

This guide explains how to set up the necessary GitHub environment for CI/CD automation.

## Required Secrets

For the CI/CD pipeline to publish to npm, you need to set up a GitHub secret:

### NPM_TOKEN

1. **Generate an npm token**:
   - Log in to your npm account at https://www.npmjs.com/
   - Navigate to your profile settings
   - Select "Access Tokens"
   - Click "Generate New Token"
   - Choose "Automation" token type
   - Provide a description (e.g., "GitHub CI/CD Publishing")
   - Copy the generated token (it will only be shown once)

2. **Add the token to GitHub**:
   - In your GitHub repository, go to "Settings"
   - Navigate to "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - Set Name as `NPM_TOKEN`
   - Paste your npm token as the Value
   - Click "Add secret"

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