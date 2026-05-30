# Dakkani Database Migrations

## Run in Supabase SQL Editor (in order):

1. `001_initial_schema.sql` — Core tables: stores, products, orders, categories, etc.
2. `002_rls_policies.sql` — Row-Level Security policies
3. `003_seed_wilayas.sql` — 58 Algerian wilayas with delivery fees
4. `004_seed_communes.sql` — Algerian communes/municipalities
5. `005_add_missing_columns.sql` — Additional columns discovered during development
6. `006_auth_config.sql` — Supabase Auth configuration
7. `007_public_read_policies.sql` — Public read access for storefront pages
8. `008_additional_indexes.sql` — Performance indexes + missing columns
9. `009_extend_order_statuses.sql` — **REQUIRED for Confirmili**: Add failed_1/2/3, postponed, duplicate statuses

## Required Supabase Setup:

1. Create a **Storage bucket** named `products` (public access)
2. Enable the `pg_trgm` extension (for fuzzy search)
3. Set Auth redirect URLs:
   - `https://your-domain.com/api/auth/callback`
   - `http://localhost:3000/api/auth/callback`
4. Configure Auth email templates for:
   - Email confirmation
   - Password reset (RESEND_API_KEY required)

## Environment Variables (copy from .env.local.example):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
