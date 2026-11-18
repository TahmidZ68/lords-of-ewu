# Supabase Setup & Initial Admin Provisioning

## 1. Create a Supabase Project

1. Sign in to [Supabase](https://supabase.com/) and create a new project (recommended region: Singapore `ap-southeast-1` for lowest latency from Dhaka, Bangladesh).
2. Copy your **Project URL** and **anon public key** from **Project Settings → API**.
3. Never place the `service_role` key in `.env` or any frontend file.

## 2. Apply Database Migrations

Run the SQL files in `supabase/migrations/` in exact numerical order in the **Supabase SQL Editor** (or via Supabase CLI `supabase db push`):

1. `supabase/migrations/0001_initial_schema.sql` — Creates all 18 domain tables (`profiles`, `members`, `seasons`, `registrations`, `payments`, `teams`, `team_players`, `draws`, `draw_participants`, `matches`, `match_events`, `standings`, `awards`, `announcements`, `gallery`, `pages`, `organization_settings`, `audit_logs`) plus `public_rate_limits`, indexes, and constraints.
2. `supabase/migrations/0002_rls_and_views.sql` — Enables Row Level Security on every table, creates safe public views (`public_members`, `public_team_rosters`, `public_draw_rosters`, `public_season_counts`), and provisions storage buckets (`public-media`, `payment-proofs`, `player-photos`) with strict policies.
3. `supabase/migrations/0003_rpc_functions.sql` — Creates server-side `SECURITY DEFINER` RPCs for rate-limited public registration, manual payment submission, zero-leakage status lookup, community applications, payment/registration review, server-seeded live draws, and configurable standings calculation.
4. `supabase/migrations/0004_seed_initial_branding.sql` — Seeds confirmed branding (`Lords of EWU`, `KICK · MISS · REPEAT`, `Lords Cup`, `East West University`, `Dhaka, Bangladesh`) and empty editable CMS structures without fabricated history.

## 3. Configure Frontend Environment Variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SITE_URL=https://lordsofewu.vercel.app
```

## 4. Provision Your First `SUPER_ADMIN`

By design, every newly registered user in Supabase Auth receives a `VIEWER` profile with `is_active = false` so unauthorized users cannot access the admin dashboard.

1. Open `/admin/login` and click **Request operator account** to sign up with your admin email and password (or create the user in **Supabase Dashboard → Authentication → Users**).
2. Confirm the user's email if email confirmation is enabled.
3. Run the following SQL in the **Supabase SQL Editor** to promote that account to active `SUPER_ADMIN`:

```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN',
    is_active = TRUE
WHERE email = 'your-admin-email@example.com';
```

4. Sign in at `/admin/login`. From **Administrators**, you can now activate and assign `TOURNAMENT_ADMIN`, `FINANCE_ADMIN`, `EDITOR`, or `VIEWER` roles to other organizers.

## 5. Verify Storage Buckets

Confirm under **Supabase Dashboard → Storage** that three buckets exist:
- `public-media` (Public: `true`)
- `payment-proofs` (Public: `false` — private; viewed only via admin signed URLs)
- `player-photos` (Public: `false` — private; admin access only)
