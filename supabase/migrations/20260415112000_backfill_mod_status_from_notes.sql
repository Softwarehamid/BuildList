/*
  # Backfill mod status from legacy notes text

  Converts old notes values like:
  - Status: Planned
  - Status: Bought
  - Status: Installed

  into the normalized mods.status field.
*/

UPDATE mods
SET status = 'installed'
WHERE lower(trim(notes)) = 'status: installed';

UPDATE mods
SET status = 'bought'
WHERE lower(trim(notes)) = 'status: bought';

UPDATE mods
SET status = 'planned'
WHERE lower(trim(notes)) = 'status: planned';

UPDATE mods
SET notes = NULL
WHERE lower(trim(notes)) IN ('status: planned', 'status: bought', 'status: installed');
