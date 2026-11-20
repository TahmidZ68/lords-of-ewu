-- ============================================================================
-- LORDS OF EWU — Complete Verified Seasons 1–7 & Season 8 French Ligue 1
-- Migration: 0009_update_seasons_1_to_7.sql
-- ============================================================================

UPDATE seasons SET
  name = 'Lords Cup Season 1 — Brazilian League (Brasileirão) Edition',
  competition_category = 'Brazilian League (Brasileirão) Edition',
  year = 2025,
  tournament_start_date = '2025-07-03',
  venue = 'East Court Arena',
  documented_team_count = 4,
  champion_team = 'Team Flamengo',
  runner_up_team = 'Team Botafogo',
  historical_highlights = 'Played on 3 July 2025 at East Court Arena. Teams: Botafogo FC, Palmeiras, Flamengo, Gremio.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 1;

UPDATE seasons SET
  name = 'Lords Cup Season 2 — Ugandan Premier League Edition',
  competition_category = 'Ugandan Premier League Edition',
  year = 2025,
  tournament_start_date = '2025-08-09',
  venue = 'East Court Arena',
  documented_team_count = 6,
  champion_team = 'Bright Stars FC',
  runner_up_team = 'Vipers SC',
  historical_highlights = 'Played on 9 August 2025 at East Court Arena. Teams: Gaddafi FC, Bright Stars FC, Kataka FC, Busoga United FC, Vipers SC, Bul Jinja FC.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 2;

UPDATE seasons SET
  name = 'Lords Cup Season 3 — Japanese League (J-League) Edition',
  competition_category = 'Japanese League (J-League) Edition',
  year = 2025,
  tournament_start_date = '2025-10-16',
  tournament_end_date = '2025-10-17',
  venue = 'East Court Arena',
  documented_team_count = 8,
  champion_team = 'Albirex Niigata',
  runner_up_team = 'Vissel Kobe',
  historical_highlights = 'Held 16–17 October 2025 at East Court Arena. Teams: Gamba Osaka, Kawasaki Frontale, Urawa Red, Kashima Antlers, Yokohama FC, Nagoya Grampus, Albirex Niigata, Vissel Kobe.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 3;

UPDATE seasons SET
  name = 'Lords Cup Season 4 — Kenyan Premier League Edition',
  competition_category = 'Kenyan Premier League Edition',
  year = 2025,
  tournament_start_date = '2025-12-04',
  venue = 'East Court Arena',
  documented_team_count = 13,
  champion_team = 'Gor Mahia FC',
  runner_up_team = 'Kaka Mega FC',
  historical_highlights = 'Played on 4 December 2025 at East Court Arena. 13 teams including Gor Mahia FC, Kaka Mega FC (Kakamega), Kenya Police FC, Sofapaka FC, Tusker FC, AFC Leopards, and more.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 4;

UPDATE seasons SET
  name = 'Lords Cup Season 5 — Saudi Pro League Edition',
  competition_category = 'Saudi Pro League Edition',
  year = 2026,
  tournament_start_date = '2026-02-05',
  tournament_end_date = '2026-02-06',
  venue = 'East Court Arena',
  documented_team_count = 10,
  champion_team = 'Team Al Ahli Saudi FC',
  runner_up_team = 'Team Al Hazem',
  historical_highlights = 'Held 5–6 February 2026 at East Court Arena. 10 Saudi Pro League-themed squads.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 5;

UPDATE seasons SET
  name = 'Lords Cup Season 6 — Qurbani Edition',
  competition_category = 'Qurbani Edition',
  year = 2026,
  tournament_start_date = '2026-04-30',
  tournament_end_date = '2026-06-19',
  venue = 'East Court Arena',
  documented_team_count = 12,
  champion_team = 'Crazy Bulls FC',
  runner_up_team = 'Holy Cow FC',
  historical_highlights = '30 April 2026 (postponed mid-play due to rain on 1 May; concluded 19 June 2026) at East Court Arena. 12 teams.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 6;

UPDATE seasons SET
  name = 'Lords Cup Season 7 — FIFA World Cup Edition',
  competition_category = 'FIFA World Cup Edition',
  year = 2026,
  tournament_start_date = '2026-07-18',
  venue = 'East Court Arena',
  documented_team_count = 18,
  champion_team = 'Team Morocco (Unbeaten Champions)',
  runner_up_team = 'Team Cabo Verde',
  historical_highlights = 'Played on 18 July 2026 at East Court Arena with 18 national-team squads. Team Morocco finished as Unbeaten Champions.',
  verification_status = 'verified',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 7;

UPDATE seasons SET
  name = 'Lords Cup Season 8 — French Ligue 1',
  competition_category = 'French Ligue 1 Edition',
  description = 'Season 8 is coming! French Ligue 1 edition at East Court Arena — 10th December, 11:30 PM to whole night. Individual registration and live player draw.',
  venue = 'East Court Arena',
  tournament_start_date = '2026-12-10',
  poster_url = '/assets/lords-cup-s8-logo.jpg',
  registration_status = 'open',
  verification_status = 'published',
  publication_status = 'published',
  is_published = TRUE
WHERE season_number = 8;
