# Acceptance & Security Testing Checklist

Run through every item below after connecting Supabase Cloud and before opening registration to players.

## A. Public Website & Data Integrity
- [ ] Homepage renders official crest, `Lords of EWU`, `KICK · MISS · REPEAT`, and CTA buttons (`Explore Lords Cup`, `Discover Our Community`).
- [ ] Unpopulated sections display honest empty states with zero fabricated founding dates, leaders, champions, or stats.
- [ ] `/about`, `/lords-cup`, `/fixtures`, `/hall-of-fame`, `/gallery`, `/community`, `/join-us` load cleanly on desktop and mobile viewports.
- [ ] Season selector on `/lords-cup` switches between published seasons and reflects format, fee, rules, teams, fixtures, standings, and awards.
- [ ] `/join-us` submits a pending community application without entering tournament registrations.

## B. Security & Row Level Security (RLS) Verification
- [ ] Anonymous `SELECT` on `registrations`, `payments`, `members`, and `audit_logs` returns 0 rows / permission denied.
- [ ] Anonymous `SELECT` on `public_members`, `public_team_rosters`, and `public_draw_rosters` returns only non-PII display columns.
- [ ] `payment-proofs` storage URLs cannot be accessed publicly without an admin-generated signed URL.
- [ ] Attempting to sign up as a new user creates an inactive `VIEWER` account (`is_active = false`) and blocks access to `/admin`.
- [ ] `FINANCE_ADMIN` can verify/reject payments but cannot run live draws or modify CMS pages.
- [ ] `TOURNAMENT_ADMIN` cannot approve a registration for a paid season until a `verified` payment exists (`review_registration` enforces this server-side).
- [ ] `EDITOR` can edit CMS pages, gallery, and announcements, but cannot verify payments or manage admins.
- [ ] `VIEWER` sees dashboard read-only without mutating records.

## C. Player Registration & Payment Workflow
- [ ] Submitting `/register` generates a unique reference code (`LOE-SXX-XXXXXX`).
- [ ] Duplicate registration with the same email or phone in the same season is rejected.
- [ ] Submitting payment evidence sets payment status to `pending_verification` and registration status to `pending_review` (never auto-approved).
- [ ] `/registration-status` requires matching `reference_code` + `email` or `phone` and reveals only that player's own status.

## D. Tournament Engine & Live Draw
- [ ] Admin creates a season, opens registration, verifies a payment (`FINANCE_ADMIN`), and approves the player (`TOURNAMENT_ADMIN`).
- [ ] Live Draw retrieves only approved, payment-verified, unassigned players and records seed + participant snapshot.
- [ ] Publishing the draw renders squads on `/lords-cup/draw` projection screen with replayable reveal animation.
- [ ] Authorized draw correction requires an audit note and writes an entry to `audit_logs`.
- [ ] Recording completed match results and clicking **Recalculate Standings** updates `standings` using the season's configured scoring rules.
- [ ] CSV exports download cleanly from **Reports & Exports** and **Registrations**.
