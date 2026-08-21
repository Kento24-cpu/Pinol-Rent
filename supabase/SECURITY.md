# Supabase security notes

## Admin secret code (GUC)

Admin self-registration is gated by a secret code compared in `handle_new_user()`
against `get_admin_secret_code()`.

`get_admin_secret_code()` reads **only** the `app.settings.admin_secret_code`
Postgres GUC. It does **not** fall back to any value stored in the repo or in
`_settings`.

To enable admin self-registration, set the GUC in the Supabase dashboard:

```sql
alter database "<db>" set app.settings.admin_secret_code = '<strong-random-value>';
```

If the GUC is unset, `get_admin_secret_code()` returns `null` and registration
with `admin_code` silently creates a regular `renter` (safe default).

## Profiles RLS

`profiles_read_all` allows `select` only when `auth.uid() is not null`
(authenticated sessions). Anonymous clients (anon key) cannot read `profiles`,
which contains PII (`phone`, `full_name`) and owner bank data. The app always
reads profiles within an authenticated session, so this is not a regression.
