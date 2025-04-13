# Changelog

All notable changes to the MySQL Query MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0](https://github.com/devakone/mysql-query-mcp-server/compare/mysql-query-mcp-server-v1.1.0...mysql-query-mcp-server-v1.2.0) (2025-04-13)


### Features

* enhance logging and debug information in MCP server initialization and tool handling ([60fa45c](https://github.com/devakone/mysql-query-mcp-server/commit/60fa45cd663e4b29e5a6ae4f435cf48d94d76a04))


### Bug Fixes

* correct release-please output parameter name in workflow ([4697cc9](https://github.com/devakone/mysql-query-mcp-server/commit/4697cc96b3741cb054ae2ad3d99d1cee999b89b5))
* update token reference in CI workflow to use GITHUB_TOKEN ([b5b2ed3](https://github.com/devakone/mysql-query-mcp-server/commit/b5b2ed3d031ee89b2be8addc7c8024f4ae66e95c))


### Miscellaneous

* add configuration files for CI/CD and npm publishing ([0bfc3c9](https://github.com/devakone/mysql-query-mcp-server/commit/0bfc3c9071295605457c499d35533c79f5e9798a))
* Fix package.json format ([99e5280](https://github.com/devakone/mysql-query-mcp-server/commit/99e528084c127f6910d8b1c9b5d7713f3ed7b791))
* update .gitignore and add MCP_README for Model Context Protocol documentation ([e77f01f](https://github.com/devakone/mysql-query-mcp-server/commit/e77f01f420995baed4150fa5a7ee616c60641039))
* update CI workflow permissions for better access control ([453f2b6](https://github.com/devakone/mysql-query-mcp-server/commit/453f2b61b970b76850374cb50e90bb51386eaeb0))
* update dependencies and add vitest configuration for testing ([8cda7b7](https://github.com/devakone/mysql-query-mcp-server/commit/8cda7b722706a792ff2593541280f1b24301905f))
* update package-lock.json for mysql-query-mcp-server ([d0b8117](https://github.com/devakone/mysql-query-mcp-server/commit/d0b81173bf0fb4e28cae2df703d441efffe119b6))


### Documentation

* Add npm and license badges to README ([f076267](https://github.com/devakone/mysql-query-mcp-server/commit/f076267e4b899d0b471a8bf405dc1e418eb769e3))
* add troubleshooting guide and MCP implementation details to documentation ([b55c08a](https://github.com/devakone/mysql-query-mcp-server/commit/b55c08a5e7a190179db216fc23394503109309a4))
* clarify .env file location requirements ([843b56d](https://github.com/devakone/mysql-query-mcp-server/commit/843b56d3f7be6e12dea372321e1a2246cf61a595))
* improve documentation and bump version to 1.1.0 ([4ca8b85](https://github.com/devakone/mysql-query-mcp-server/commit/4ca8b859007075baaabaa6e0bbc6f46bceed311e))
* improve README with clearer MCP configuration guidance ([214eae2](https://github.com/devakone/mysql-query-mcp-server/commit/214eae20551240e7e856c807d1af894241c96c05))
* remove .env approach and focus on MCP configuration ([0610295](https://github.com/devakone/mysql-query-mcp-server/commit/06102958bd14dda63825257dd55dd413eec8caca))

## [1.1.0] - 2025-04-11

### Changed
- Improved documentation with clearer environment variable naming requirements
- Updated examples to be more generic and work with any AI assistant
- Added detailed configuration examples
- Enhanced troubleshooting guide
- Clarified SSL and authentication configuration options

## [1.0.0] - 2025-04-10

### Added
- Initial public release
- Read-only MySQL query execution (SELECT, SHOW, DESCRIBE only)
- Support for multiple predefined environments (local, development, staging, production)
- Database information retrieval
- Environment listing
- Read-only query validation
- Query timeout controls
- Environment-specific connection pools
- SSL connection support
- Comprehensive documentation
- Troubleshooting guide
- Installation script
