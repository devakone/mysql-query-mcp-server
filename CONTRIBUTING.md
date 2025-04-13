# Contributing to MySQL Query MCP Server

Thank you for considering contributing to the MySQL Query MCP Server project!

## Development Process

We use GitHub to host code, track issues and feature requests, and accept pull requests.

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following the [Conventional Commits](https://www.conventionalcommits.org/) format
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Conventional Commits

We use conventional commits to automatically generate changelogs and handle versioning. Please prefix your commit messages with one of:

- `feat:` - A new feature (minor version bump)
- `fix:` - A bug fix (patch version bump)
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semicolons, etc)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `perf:` - Code changes that improve performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

For breaking changes, add `BREAKING CHANGE:` at the beginning of the commit body or footer.

Example:
```
feat: add new database connection validator

This adds a connection validator that ensures database parameters are valid before attempting to connect.

BREAKING CHANGE: The connection process now validates parameters synchronously before connecting.
```

## Development Environment Setup

1. Install Node.js (version 22.13.0 or higher)
2. Clone your fork of the repository
3. Install dependencies: `npm install`
4. Set up environment: Copy `.env.example` to `.env` and configure your environment variables

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Building Locally

```bash
npm run build
```

## Code Style

We use Prettier and ESLint to maintain code quality. Please ensure your code follows our style by running:

```bash
npm run lint
npm run format
```

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License. 