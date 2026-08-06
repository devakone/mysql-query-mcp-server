# Migrating off inline passwords

This guide moves an existing `[ENV]_DB_PASS` out of your MCP client config file
and into a credential source, so the config file holds a reference instead of a
secret.

Nothing here is required. Inline `[ENV]_DB_PASS` keeps working. Migrate the
environments you care about, starting with production.

## What changes

Before, the password is in the file:

```json
"PRODUCTION_DB_HOST": "prod.example.com",
"PRODUCTION_DB_USER": "mcp_user",
"PRODUCTION_DB_PASS": "actual-production-password",
"PRODUCTION_DB_NAME": "app"
```

After, the file says where to find it:

```json
"PRODUCTION_DB_HOST": "prod.example.com",
"PRODUCTION_DB_USER": "mcp_user",
"PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production",
"PRODUCTION_DB_NAME": "app"
```

Only the `_DB_PASS` line changes. Host, user, port, database, and SSL settings
stay exactly as they are.

## Pick a source

| Where your password lives today | Use this |
|---|---|
| Only in the config file, and nowhere else | `keychain:` |
| 1Password, Bitwarden, LastPass | `cmd:` with that tool's CLI |
| HashiCorp Vault | `cmd:vault kv get` |
| AWS Secrets Manager | `aws-secrets:`, or `cmd:aws secretsmanager` |
| AWS SSM Parameter Store | `aws-ssm:`, or `cmd:aws ssm` |
| An environment variable your shell already exports | `env:` |

## The safe migration order

Because `_DB_PASS_SOURCE` takes precedence over `_DB_PASS`, you can add the new
line, prove it works, and only then delete the old one. Nothing is broken in
between.

1. Put the password in the store (recipes below).
2. Add `[ENV]_DB_PASS_SOURCE` to your config, leaving `[ENV]_DB_PASS` in place.
3. Run `mysql-query-mcp doctor`. The environment should show your source in the
   SOURCE column and `resolved` under PASSWORD.
4. Delete `[ENV]_DB_PASS` from your config.
5. Restart your AI tool so it restarts the MCP server with the new config.
6. Rotate the old password. See [Rotate afterwards](#rotate-afterwards).

During step 2 and 3 both variables are set, so the server logs a warning saying
it is using the source and telling you to remove `[ENV]_DB_PASS`. That is
expected mid-migration and goes away at step 4.

## Getting your password into a store

> These recipes read the password into a shell variable first, then pass
> `"$PW"`. Your shell history records the literal text `"$PW"`, not the password.
> Typing the password directly on a command line puts it in your history file.

### OS keychain

No shell recipe needed. This prompts, hides the input, stores it, and prints the
line to paste:

```bash
mysql-query-mcp credentials set production
```

If you did not install globally:

```bash
npx -p mysql-query-mcp-server mysql-query-mcp credentials set production
```

Resulting config:

```json
"PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production"
```

### 1Password

```bash
read -rs -p "Password: " PW && echo
op item create --category=password --title='prod mysql' "password=$PW"
unset PW
```

```json
"PRODUCTION_DB_PASS_SOURCE": "cmd:op read op://Private/prod mysql/password"
```

### HashiCorp Vault

```bash
read -rs -p "Password: " PW && echo
vault kv put kv/mysql/prod "password=$PW"
unset PW
```

```json
"PRODUCTION_DB_PASS_SOURCE": "cmd:vault kv get -field=password kv/mysql/prod"
```

### AWS Secrets Manager

```bash
read -rs -p "Password: " PW && echo
aws secretsmanager create-secret --name prod/mysql --secret-string "$PW"
unset PW
```

```json
"PRODUCTION_DB_PASS_SOURCE": "aws-secrets://prod/mysql"
```

If the secret is JSON, for example one RDS manages itself, point at the key:

```json
"PRODUCTION_DB_PASS_SOURCE": "aws-secrets://prod/mysql#password"
```

Or with no extra npm package, using the AWS CLI you already have:

```json
"PRODUCTION_DB_PASS_SOURCE": "cmd:aws secretsmanager get-secret-value --secret-id prod/mysql --query SecretString --output text"
```

### AWS SSM Parameter Store

```bash
read -rs -p "Password: " PW && echo
aws ssm put-parameter --name /prod/mysql/password --type SecureString --value "$PW" --overwrite
unset PW
```

```json
"PRODUCTION_DB_PASS_SOURCE": "aws-ssm:///prod/mysql/password"
```

Note the three slashes. SSM names start with `/`, and the scheme contributes two.

### An existing environment variable

If something already exports the password into the environment your MCP client
launches, point at it by name rather than copying the value:

```json
"PRODUCTION_DB_PASS_SOURCE": "env:MY_EXISTING_DB_PASSWORD"
```

## Verifying

```bash
mysql-query-mcp doctor
```

```
ENVIRONMENT  CONFIG          SOURCE    PASSWORD  DETAIL
local        complete        env       resolved
development  not configured  -         -
staging      not configured  -         -
production   complete        keychain  resolved
```

`doctor` never prints a credential and exits non-zero if any source failed, so it
is safe to paste output into an issue.

Then restart your AI tool and ask it to list environments. Each should report the
source you configured and `"status": "ready"`.

## Rotate afterwards

Moving a password out of a config file does not un-leak it. That value may still
be in your shell history, an editor swap file, a Time Machine or Dropbox backup,
a previous git commit, or an AI chat transcript.

After migrating, change the password on the database and update the store:

```bash
mysql-query-mcp credentials set production   # or your store's CLI
mysql-query-mcp doctor
```

If you used a version before 1.3.0, rotation is not optional. Those versions
returned credentials in the `environments` tool response, which means they were
written into chat transcripts. See [SECURITY.md](../SECURITY.md).

## Rolling back

Delete `[ENV]_DB_PASS_SOURCE` and put `[ENV]_DB_PASS` back. There is no state to
undo, since resolution happens in memory at startup and nothing is cached.

## When it does not resolve

`doctor` prints the reason in the DETAIL column. The most common causes:

- **Not signed in.** `op signin`, `vault login`, `aws sso login`. A source is
  only as available as the tool behind it.
- **Your MCP client's environment is not your shell's.** `PATH` in particular is
  usually different, so `op` may not be found. Use an absolute path, for example
  `cmd:/opt/homebrew/bin/op read op://...`.
- **No keychain item.** Run `mysql-query-mcp credentials set <environment>`.
- **`keychain:` on Windows.** Not supported, because reading Credential Manager
  needs a native module. Use `cmd:` with `Get-Secret` or your password manager's
  CLI.
- **Resolved to an empty value.** Treated as a failure on purpose. Check the
  reference points at the right field, for example `#password` on a JSON secret.

More in [TROUBLESHOOTING.md](TROUBLESHOOTING.md#problem-a-credential-source-is-not-resolving).
