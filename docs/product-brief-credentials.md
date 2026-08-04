# Product Brief: Credential Handling

Status: draft for review
Owner: @devakone
Date: 2026-08-04

## Context

`mysql-query-mcp-server` is a local stdio MCP server. Each developer's AI client (Claude
Code, Claude Desktop, Cursor, Windsurf) spawns it as a subprocess and talks to it over
stdin/stdout. It supports four fixed environments: local, development, staging, production.

Today the only supported way to give it credentials is to paste them as plaintext
environment variables in the MCP client's config file:

```json
"env": {
  "PRODUCTION_DB_HOST": "prod.example.com",
  "PRODUCTION_DB_USER": "mcp_user",
  "PRODUCTION_DB_PASS": "actual-production-password",
  "PRODUCTION_DB_NAME": "app"
}
```

This matches what the MCP specification prescribes for stdio servers, which says
implementations on stdio "SHOULD NOT" use the OAuth authorization flow and should
"instead retrieve credentials from the environment." Reading credentials from the
environment is not the problem and is not changing. The problem is that the only
documented way to populate that environment is to write the password down in a file.

Two consequences, one sharp and one slow:

1. The `environments` tool currently returns a `debug.envVars` object containing every
   `*_DB_*` variable and its value, passwords included. Anything a tool returns is written
   into the model's context and into a saved chat transcript, so credentials leave the
   machine they were configured on. This has already happened in real use.
2. The config file cannot be committed, shared, or used as a README example, because it
   contains live secrets. Every developer redoes setup by hand and keeps a file of
   production passwords in a project folder.

## Who this is for

The primary user is a developer who wants their AI assistant to answer questions about
real application data, across more than one environment, without granting write access.
They are comfortable with a JSON config file and a terminal. They may or may not be on
AWS. They are not running a shared service and have no interest in operating one.

A secondary user is that developer's teammate, who needs to get to the same working setup
in as few steps as possible.

## Goals

- No tool response can carry a credential, config value, or anything secret-shaped.
- A working config file contains no secrets, so it can be committed and shared.
- Existing users keep working with no config changes required.
- No new required dependencies, and no native build step, for the default install.

## Non-goals

- Remote or HTTP transport. Not in scope for any of these three features.
- OAuth, Dynamic Client Registration, or resource indicators. The spec directs stdio
  servers away from this, and for a process the user spawns themselves it adds no real
  boundary: anyone who can start the server already has the access it would protect.
- Per-user authorization policy (for example "Alice may query staging but not
  production"). That only becomes meaningful with a shared deployment, which is a non-goal.
- Replacing the existing read-only query restriction. It stays, unchanged.

---

## Feature 1: Tool responses stop echoing configuration

### Problem

Asking "which environments do I have?" returns hosts, usernames, and passwords. The user
asked for a list of names.

Two smaller versions of the same issue exist elsewhere. The `info` tool returns the full
output of `SHOW VARIABLES` (which includes replication and file-path settings) and
`SHOW PROCESSLIST` (which includes other sessions' in-flight query text, belonging to
other applications and other people). Neither was asked for either.

### What changes for the user

`environments` returns what it says on the tin:

```json
{
  "environments": [
    { "name": "local",      "credentialSource": "env" },
    { "name": "production", "credentialSource": "keychain" }
  ],
  "count": 2
}
```

Naming the credential source is capability information, not a secret, and it is useful:
it tells the user which environments are set up the safe way.

`info` returns version, uptime, database list, connection counts, and a curated set of
operational server variables. The full variable dump and the process list are gone.

### Scope

- Remove the `debug` block from the `environments` response.
- Trim the `info` response to an explicit allowlist. Replace the process list with
  aggregate connection counts.
- Add a response guard at the single point where tool results are returned. It scans every
  outbound response and refuses to send it if it matches a secret pattern: the value of any
  env var whose name looks like a secret, a config-shaped key such as `PRODUCTION_DB_PASS`,
  an AWS key, a connection string with an embedded password, or a PEM block. It fails
  closed, meaning it returns an error instead of the response.
- A test suite that fails the build on any of the above. This is the part that matters
  longest, because it catches the next contributor who adds a debug field.
- Stop the existing stderr debug logging from printing hosts, usernames, and passwords.
  Route logging through the same redaction.

### Out of scope

Changing what `query` returns. Query results are the user's own data and are the point of
the tool.

### Acceptance criteria

- No tool response contains any value from a `*_DB_PASS` variable.
- The guard rejects a deliberately planted leaky response in a test.
- A test adds a fake secret-shaped debug field to a tool and the build fails.
- Existing `environments` and `info` tests pass against the new shapes.

### Effort and risk

Half a day. Low risk. One visible behavior change: callers who were reading
`info.variables` or `info.processlist` get less back. Worth calling out in the changelog,
and worth doing anyway.

### Ship separately

This lands on its own, ahead of the other two, with a security advisory and a note telling
existing users to rotate any credential they have configured through this server.

---

## Feature 2: Config points at the password instead of containing it

### Problem

The password has to be written into a file, so the file cannot be shared or committed.

### What changes for the user

A new optional variable per environment, `<ENV>_DB_PASS_SOURCE`, holding a reference
rather than a value. The server resolves it once at startup and keeps the result in memory
only.

```json
"env": {
  "PRODUCTION_DB_HOST": "prod.example.com",
  "PRODUCTION_DB_USER": "mcp_user",
  "PRODUCTION_DB_NAME": "app",
  "PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production"
}
```

That config file has no secrets in it. It can be committed, and it can be the README
example. A teammate copies it, runs one command to put their own password in their own
keychain, and is done.

Supported references:

| Scheme | Example | Notes |
|---|---|---|
| `keychain:` | `keychain://mysql-query-mcp/production` | macOS Keychain, Windows Credential Manager, libsecret or `pass` on Linux |
| `cmd:` | `cmd:op read op://Infra/prod-mysql/password` | Any command that prints the secret. Covers 1Password, Vault, `aws-vault`, and anything else a team already runs |
| `aws-secrets:` | `aws-secrets://prod/mysql/mcp_user#password` | AWS Secrets Manager, using the caller's existing IAM credentials |
| `aws-ssm:` | `aws-ssm:///prod/mysql/password` | SSM Parameter Store, SecureString |
| `env:` | `env:SOME_OTHER_VAR` | Explicit indirection, mostly for CI |

Plus a setup helper so this is a pleasant first five minutes rather than a research
project:

- `mysql-query-mcp credentials set production` prompts for the password and stores it in
  the OS keychain.
- `mysql-query-mcp doctor` resolves every configured source and reports whether each
  environment is reachable, without starting the server and without printing any secret.

### Design decisions

- `keychain:` shells out to the platform tool (`security`, `secret-tool`, PowerShell).
  No `keytar`. It is unmaintained and would force a native build on every install of what
  is currently a pure-JS package.
- AWS schemes lazy-load `@aws-sdk/*` as optional dependencies. Users who do not use them
  never install them, and the error message when they are missing says exactly what to
  install.
- `<ENV>_DB_PASS` keeps working, documented as the local and throwaway path. If the
  `production` environment uses it, the server warns on startup. It warns, it does not
  refuse, because breaking existing installs is worse than the thing being warned about.
- If both `_PASS` and `_PASS_SOURCE` are set, `_PASS_SOURCE` wins and the server warns.
- A source that fails to resolve disables that one environment with a clear error. It does
  not take down the server, so a broken production reference does not cost you local.

### Out of scope

Rotation and refresh. Resolution happens once at startup. If a password changes, restart
the server. Feature 3 is where lifetime becomes a real concern.

### Acceptance criteria

- Existing configs using `<ENV>_DB_PASS` work with no changes.
- Each scheme has a unit test with the underlying fetch mocked.
- A failed resolution disables one environment and leaves the others working.
- Configuring `production` via raw `_DB_PASS` produces a startup warning.
- No resolved secret appears in any log line, at any log level, including on failure.
- The README's example config contains no secrets.

### Effort and risk

Three to four days. Medium risk, mostly in cross-platform keychain behavior, which is
where the test mocks and the `doctor` command earn their keep.

---

## Feature 3: No stored password at all for AWS RDS

### Problem

Even stored well, a long-lived database password is a thing that can leak and has to be
rotated. For AWS-hosted databases it does not need to exist.

### What changes for the user

An `aws-iam:` source. The server signs a short-lived authentication token with the AWS
credentials the developer already has, and uses it in place of a password.

```json
"PRODUCTION_DB_PASS_SOURCE": "aws-iam:"
```

There is no password to store, share, leak, or rotate. Access is granted and revoked
through IAM, alongside everything else the team already manages there.

### Design decisions and the honest caveat

Tokens last 15 minutes and require SSL. `mysql2` does not accept a password callback on a
connection pool, so a pool cannot transparently re-sign when the token expires. The
options are to recycle the pool on a timer shorter than the token lifetime, or to open a
connection per query and drop pooling for this path.

Recommendation is a 10-minute pool recycle, which keeps pooling and stays well inside the
token lifetime. This is the only part of this brief with genuine engineering risk, and it
is the reason this ships last and ships behind an experimental label.

### Acceptance criteria

- A pool using `aws-iam:` still works after 20 minutes of idle time.
- SSL is required and the server refuses to start this path without it.
- Recycling does not drop an in-flight query.
- Token values never appear in a log.

### Effort and risk

Three to five days including the connection-lifetime testing, which is the bulk of it.
Higher risk. Ships as experimental, documented as such, and does not block features 1
or 2.

---

## Sequencing and release plan

| | Release | Notes |
|---|---|---|
| Feature 1 | Immediate, own PR | Security advisory, changelog security entry, explicit recommendation to rotate every credential configured through this server |
| Feature 2 | Next minor | Purely additive. README rewrite and a migration note for users moving off inline passwords |
| Feature 3 | Following minor | Labeled experimental |

Feature 1 does not wait for the others.

## How we know it worked

- The example config in the README contains no secrets, and it is the config we tell
  people to use.
- Setting up a second machine, or a teammate, takes one file copy plus one command.
- The test suite fails if a future change puts anything secret-shaped in a tool response.
- Nobody has to think about the word "rotate" for an AWS environment.

## Open questions

1. Should `production` configured via raw `_DB_PASS` eventually become a hard failure, or
   stay a warning forever? Proposing warning now, revisit after feature 2 has been out a
   while.
2. Is a first-class `1password:` scheme worth it, or is `cmd:op read ...` good enough?
   Proposing `cmd:` only, since it covers every vendor for the same effort.
3. Feature 1 trims the `info` response. Is anyone depending on the full variable dump?
   Assuming no, since it was never a documented contract.
