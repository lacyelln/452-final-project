# RPC functions

Each file defines one Postgres function (named after the file) that the website calls with `supabase.rpc('<name>', { p_arg: value })`. Supabase exposes any function in the `public` schema as `POST /rest/v1/rpc/<name>`.

## How it works

- A `.sql` file does nothing until it is **run against the database**. That creates (or replaces) the function and sets who may call it. The web app never reads these files.
- Functions run as the caller (`security invoker`), so the RLS policies and table privileges still apply. Only signed-in users (`authenticated`) can execute them; `anon` cannot.
- Arguments are named `p_<something>` so they never clash with column names.
- Every file starts with `select private.drop_function_versions('<name>');` (a helper defined in `functions.sql`), which drops all existing versions of the function (any argument list), then creates it, all in one transaction. Changing the arguments therefore replaces the old function instead of leaving a second overload.

## How to run them

- **All of them:** `node scripts/apply-schema.mjs` (from the repo root) runs the main schema files and then every `rpc/*.sql`.
- **One of them:** paste that file into the Supabase SQL Editor and run it.

Requires `schema.sql`, `functions.sql`, and `policies.sql` to have been applied first.

## Adding or changing one

1. Copy an existing `.sql` file such as [`read_students.sql`](read_students.sql) to `<function_name>.sql`. Change the name in the `drop_function_versions` call, the `create function`, and the `revoke`/`grant` lines.
2. Run it (see above).
3. Make sure the operation is listed in `web/src/testing/operations.ts` with the same function name and argument names, then try it from the **Testing** tab on the website.
