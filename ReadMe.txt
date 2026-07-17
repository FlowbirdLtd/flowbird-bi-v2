
"seed.sql" is test/development data only — it's not part of the schema. It inserts 10 organisations, 12 contacts, 12 deals, and 10 users with hardcoded UUIDs so the app has something to display during development.

Important: it depends on "auth_users.sql" being run first, because public.users.id is a FK to auth.users(id) — if the auth rows don't exist yet, the users insert will fail.

So the full order for a fresh rebuild with test data is:

Order      File                 Purpose
1	       schema.sql           Tables, indexes, functions, triggers
2	       policies.sql         All RLS policies
3	       auth_users.sql       Auth accounts for the 10 test users
4	       seed.sql	            Sample data (orgs, contacts, deals, users)

For a production rebuild (no test data), you only need steps 1 and 2. Real users and data come in via the app (invite flow + Pipedrive sync).

-----------------------------------------------------------------------------------------------

When syncing always sync in this order from the app:

1. Organisations first
2. Contacts second (so organisation_id FKs resolve correctly)
3. Deals last (so contact_id and organisation_id FKs resolve correctly)