# Security Policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/devakone/mysql-query-mcp-server/security/advisories/new)
rather than opening a public issue. I aim to acknowledge reports within a few days.

## Advisory: database credentials returned in tool responses

**Affected versions:** all releases up to and including 1.2.2
**Fixed in:** 1.3.0
**Severity:** high, if you configured a production or otherwise sensitive database

### What happened

The `environments` tool returned a `debug` object containing every environment variable
matching `*_DB_*`, along with its value. That included `*_DB_PASS`. Calling the tool, which
an AI assistant would do whenever asked something like "what databases can you see?",
returned the host, username, and plaintext password for every configured environment,
production included.

Two related problems are fixed in the same release:

- The `info` tool returned the complete output of `SHOW VARIABLES` and `SHOW PROCESSLIST`.
  The process list contains the in-flight query text of every other session on the server,
  which may belong to other applications and other people.
- Debug logging on stderr printed hostnames, usernames, and in one path the contents of
  configuration variables. MCP clients capture server stderr and write it to their own log
  files on disk.

### Why this matters even though the server runs locally

This is a local stdio server, so its configuration file already lives inside the
developer's own trust boundary. Storing credentials in that file is the pattern the MCP
specification prescribes for stdio transports and is not the problem.

The problem is that a tool *response* is a different boundary. Whatever a tool returns is
written into the calling model's context and into a saved conversation transcript. That
transcript is typically sent to a hosted inference API, persisted, and possibly synced
across devices, quoted into later turns, or pasted into a bug report. A credential in a
tool response has therefore left the machine it was configured on.

There is a second consequence. Because the credentials were handed out on request, they
were reachable by prompt injection: any untrusted content the model read, such as a row in
a database or a web page, could ask for the `environments` tool output and get the
production password. A credential sitting in a config file cannot be reached that way.

### What you should do

**Rotate every database credential you have ever configured through this server**,
including development and staging, and including any credential you believe was only ever
used locally. Do this even if you cannot find the credential in a transcript. Transcript
retention and syncing behavior varies by client, and the cost of rotating is much lower
than the cost of assuming it was never exposed.

If your MySQL user was granted more than read access, treat rotation as urgent. Check the
grants while you are there:

```sql
SHOW GRANTS FOR CURRENT_USER();
```

Then upgrade:

```bash
npm install -g mysql-query-mcp-server@latest
```

### What changed in the fix

- The `environments` tool now returns environment names and how each one was configured,
  and nothing else.
- The `info` tool reports an allowlist of server variables and aggregate connection
  counters. The full variable dump and the process list are gone.
- Every tool response passes through a guard before it leaves the process. The guard scans
  for the value of any secret-named environment variable, for configuration-shaped keys,
  and for a small set of unmistakable secret shapes (AWS keys, PEM blocks, connection URIs
  with an embedded password). A response that matches is blocked rather than scrubbed, so
  it fails closed.
- All logging goes through a single redacting logger, and verbose logging now requires
  `DEBUG=true` rather than always being on.
- Tests cover each of the above, including a test that reconstructs the original leaky
  response and asserts that the guard rejects it.

### Credit

Found in production use by the maintainer.
