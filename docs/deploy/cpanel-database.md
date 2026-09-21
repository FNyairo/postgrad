# Getting the PGSTS database onto cPanel

There is no data to move yet. What you are actually doing is creating an empty
MySQL database on the host and loading the schema into it. This guide covers
that, the settings that trip people up on shared hosting, and how to verify it
worked.

**Before you start, one caveat.** Three column names in the `students` table
(`noticeAcknowledgedAt`, `noticeVersion`, `lawfulBasis`) depend on the lawful
basis decision in `docs/kickoff/00-decision-record.md` §4.1. Loading the schema
now is fine either way — if the department chooses consent, it is a single
rename migration afterwards, not a rebuild.

---

## Step 1 — Create the database

In cPanel, open **MySQL® Databases** (under Databases).

1. Under *Create New Database*, enter `pgsts`. Click **Create Database**.

cPanel prefixes everything with your account name, so the real name will be
something like `myaccount_pgsts`. **Write down the full prefixed name** — that is
what goes in the connection string, not `pgsts`.

## Step 2 — Create a dedicated user

Still in **MySQL® Databases**, under *MySQL Users → Add New User*:

1. Username: `pgstsapp` (becomes `myaccount_pgstsapp`)
2. Use the password generator. Take the long one and save it in your password
   manager now — cPanel will not show it again.

**Do not reuse your cPanel account login for this.** The application should have
its own database user, so that if the application is ever compromised the
attacker gets one database rather than your whole hosting account.

## Step 3 — Grant privileges

Under *Add User To Database*, pick the user and the database, then **Add**.

On the privileges screen, tick **ALL PRIVILEGES**.

Prisma needs more than `SELECT`/`INSERT`/`UPDATE`/`DELETE` because migrations
issue `CREATE`, `ALTER`, `DROP`, `INDEX` and `REFERENCES`. If your host offers a
narrower set and you would rather not grant everything, the minimum is:

```
SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES, LOCK TABLES
```

## Step 4 — Load the schema

Two ways. Use whichever matches how much shell access you have.

### Option A — phpMyAdmin (no SSH needed)

1. cPanel → **phpMyAdmin**
2. Select `myaccount_pgsts` in the left sidebar
3. **Import** tab → **Choose File** → `docs/kickoff/03-initial-migration.sql`
4. Character set: **utf8mb4**
5. **Go**

You should see 11 tables appear. If the upload is rejected for size, the file is
only about 10 KB, so a rejection means the host's import limit is set very low —
gzip it first and import the `.sql.gz`.

### Option B — Prisma over SSH (preferred once you have SSH)

This is the better path because it records the migration in the
`_prisma_migrations` table, so future schema changes apply cleanly instead of
you hand-editing tables.

```bash
ssh myaccount@yourhost
cd ~/pgsts
# DATABASE_URL must already be set — see step 5
npx prisma migrate deploy
```

`migrate deploy` applies committed migrations and nothing else. **Never run
`prisma migrate dev` against the production database** — it can reset data, and
it also needs a shadow database it will not be able to create here (see the
pitfalls below).

## Step 5 — The connection string

Format:

```
mysql://USER:PASSWORD@HOST:3306/DATABASE?connection_limit=3&pool_timeout=20
```

Filled in:

```
mysql://myaccount_pgstsapp:YourPassword@localhost:3306/myaccount_pgsts?connection_limit=3&pool_timeout=20
```

- **HOST is `localhost`** when the Node app runs on the same cPanel server,
  which it will. Only use a hostname or IP if you are connecting from your own
  machine, and that needs step 7.
- **`connection_limit=3` is not optional.** Prisma's default pool size is
  `(CPU cores × 2) + 1`, which on a shared box can be 17 or more connections
  from one app. Shared MySQL accounts are commonly capped well below that, and
  you will get `Too many connections` under no load at all. Three is plenty for
  this application.

**URL-encode special characters in the password.** This is the single most
common cause of "it works in phpMyAdmin but not in the app":

| Character | Use |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| `%` | `%25` |

Or sidestep it entirely by regenerating a password with letters and digits only.

### Where to put it

cPanel → **Setup Node.js App** → your application → **Environment variables** →
add `DATABASE_URL`.

**Do not put it in a `.env` file on shared hosting.** Other accounts on the same
server and any misconfigured directory listing are both risks that the Node.js
App environment panel avoids. Note that Next.js 16 removed `serverRuntimeConfig`,
so the application reads `process.env` directly — the value set here is what it
gets at runtime.

After changing an environment variable, click **Restart** on the application.
Passenger caches the environment, and the change does not take effect until it
restarts.

## Step 6 — Verify

Over SSH:

```bash
mysql -u myaccount_pgstsapp -p myaccount_pgsts -e "SHOW TABLES;"
```

Expect eleven tables: `students`, `taxonomy`, `staff_users`, `recovery_codes`,
`sessions`, `share_tokens`, `data_subject_requests`, `newsletter_subscribers`,
`audit_logs`, `rate_limits`, `job_runs`.

Then confirm the charset is right, because a wrong collation will mangle
Kiswahili text and any accented name:

```sql
SELECT default_character_set_name, default_collation_name
FROM information_schema.SCHEMATA
WHERE schema_name = 'myaccount_pgsts';
```

You want `utf8mb4` and a `utf8mb4_*` collation. If it says `latin1`, fix it
before there is any data in there:

```sql
ALTER DATABASE myaccount_pgsts
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Finally, from the application side:

```bash
npx prisma db pull --print   # should mirror the schema you loaded
```

## Step 7 — Only if you need to connect from your own machine

cPanel → **Remote MySQL** → add your public IP address.

Two warnings. Your home IP almost certainly changes, so this breaks regularly.
And an allowlisted IP plus a leaked password is direct access to student
personal data from the open internet. Prefer an SSH tunnel:

```bash
ssh -L 3307:localhost:3306 myaccount@yourhost
# then connect to 127.0.0.1:3307 locally
```

That needs no Remote MySQL entry at all.

---

## Pitfalls specific to Prisma on shared MySQL

**The shadow database.** `prisma migrate dev` creates and drops a temporary
database to check migrations. Shared hosting will not grant `CREATE DATABASE`,
so it fails. Two answers, and the first is better:

1. Develop against a local MySQL in Docker, commit the generated migration, and
   run only `prisma migrate deploy` on the host.
2. If you must run `migrate dev` against the host, create a second database
   manually (`myaccount_pgsts_shadow`), grant the same user access, and set
   `shadowDatabaseUrl` in `schema.prisma`.

**MariaDB is not MySQL.** Many cPanel hosts ship MariaDB while calling it MySQL
in the interface. Prisma's `mysql` provider covers both, but check the version:

```sql
SELECT VERSION();
```

MariaDB below 10.2 has no usable `JSON` type, which the `audit_logs.metadata`
column needs. If you are on something that old, ask the host to upgrade — and
treat it as a signal about the rest of the stack, because a host running MariaDB
10.1 in 2026 is unlikely to be offering Node 22.

**Connection exhaustion under Passenger.** Passenger may run several application
processes, each with its own Prisma pool. Three processes at `connection_limit=3`
is nine connections. If you see `Too many connections`, lower it to 2 before
assuming the host is at fault.

**`prisma generate` needs to run after deploy.** The Prisma client is generated
code. Your deploy step must run `npx prisma generate` or the application will
start and immediately fail on the first query.

---

## Backups, from day one

Before the register holds anything real, get the backup working — restoring an
untested backup during an incident is not the moment to find out it was empty.

cPanel → **Cron Jobs**, nightly:

```bash
/usr/bin/mysqldump --single-transaction --quick \
  -u myaccount_pgstsapp -p'YourPassword' myaccount_pgsts \
  | gzip > ~/backups/pgsts-$(date +\%F).sql.gz
```

Note the escaped `\%` — cron treats an unescaped `%` as a newline, and this
silently breaks the filename.

Three things this alone does not give you, all of which matter for personal
data under the Act:

1. **It is unencrypted.** Pipe it through `age` or `gpg` before it lands on disk.
2. **It is on the same server as the database.** A host-level failure takes both.
   Push it off-site.
3. **It is untested.** Restore one into a scratch database and confirm the row
   counts match. Put the date you did it in `docs/runbooks/`.

Add a second cron to delete backups older than 30 days, or you will fill the
account's disk quota and the application will start returning 503s for reasons
that look nothing like a full disk.

---

## Later: bringing the Google Sheet data across

Not part of this step, but worth knowing the shape of it. Do **not** paste the
spreadsheet into phpMyAdmin. The import needs to run through the same validation
and normalisation as a form submission, or you will get the exact inconsistency
that F3 in the decision record exists to prevent — "M.Ed", "MEd" and "Master of
Education" as three different programmes.

The plan is a seed script that reads a CSV export, runs each row through the same
Zod schema and normaliser the public form uses, reports the rows it cannot parse
rather than guessing, and writes an audit entry per imported record. I will build
that alongside the registration form, since it reuses the same code.

One thing to do now, before the spreadsheet grows any further: note who has
access to it today. When the register goes live, that access list needs revoking,
and the Privacy Notice will say the spreadsheet is no longer in use.
