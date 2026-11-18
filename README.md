# Lords of EWU — Official Community Website & Lords Cup Platform

**Tagline:** `KICK · MISS · REPEAT`  
**Institutional Context:** East West University, Dhaka, Bangladesh  
**Flagship Event:** Lords Cup

---

## Overview

Lords of EWU is a full-stack sports-community website and tournament management platform built with React, TypeScript, Tailwind CSS, shadcn/ui, and Supabase (PostgreSQL, Auth, Storage, Row Level Security, and Server-Side RPCs).

### Core Capabilities

- **Public Editorial Website:** Homepage, About Us, Lords Cup Portal (multi-season selector, rules, teams, fixtures, standings, awards), Fixtures & Results, Hall of Fame, Photo & Video Gallery, Community Directory, Separate Community Membership Application (`/join-us`), and Live Draw Projection Display (`/lords-cup/draw`).
- **Player Registration & Manual Payment Verification (`/register`, `/registration-status`):**
  - Individual registration with validation, duplicate protection per season, rate limiting, and unique reference code generation (`LOE-SXX-XXXXXX`).
  - Manual payment submission supporting bKash, Nagad, Bank Transfer, and season-configured methods, with private screenshot storage (`payment-proofs`).
  - Individual status verification without exposing any other players' personal data.
- **Role-Based Admin Dashboard (`/admin`):**
  - 5 enforced roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `FINANCE_ADMIN`, `EDITOR`, `VIEWER`.
  - 19 integrated modules: Overview, Organization Settings, Website Content CMS, Tournament Seasons, Registrations, Payment Verification, Players & Members, Teams, Live Draw, Fixtures, Match Results, Standings, Awards, Announcements, Gallery, Leadership, Reports & CSV Exports, Administrators, and Audit Logs.
- **Server-Controlled Live Team Draw:**
  - Pulls only approved, payment-verified, unassigned players for a season.
  - Generates a cryptographic server seed, records a participant snapshot, prevents duplicate assignments, writes audit logs, and supports authorized post-draw corrections with mandatory audit reasons.

---

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS, Radix UI / shadcn-style primitives, Lucide React, React Router v6, React Hook Form, Zod, TanStack Query, Recharts, Framer Motion.
- **Backend & Database:** Supabase Cloud (PostgreSQL, Auth, Storage, Row Level Security, `SECURITY DEFINER` RPC functions).
- **Hosting:** Vercel + GitHub.

---

## Project Structure

```text
lords-of-ewu/
├── public/
│   ├── assets/lords-of-ewu-logo.jpg   # Official crest
│   ├── robots.txt
│   └── sitemap.xml
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql    # 18 core tables + rate limit table + indexes
│       ├── 0002_rls_and_views.sql     # Strict RLS, safe public views, storage policies
│       ├── 0003_rpc_functions.sql     # Registration, payment, draw, standings RPCs
│       └── 0004_seed_initial_branding.sql # Confirmed branding only (no fabricated data)
├── docs/
│   ├── SUPABASE_SETUP.md
│   ├── DEPLOYMENT.md
│   └── TESTING_CHECKLIST.md
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   │   └── admin/
│   └── types/
├── .env.example
├── vercel.json
└── package.json
```

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project keys:
   ```bash
   cp .env.example .env
   ```
3. Run the Supabase migrations in `supabase/migrations/` (see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)).
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Type-check and build:
   ```bash
   npm run lint
   npm run build
   ```
