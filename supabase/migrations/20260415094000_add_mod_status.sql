/*
  # Add status field to mods

  Adds a normalized status value for each mod item:
  - planned
  - bought
  - installed
*/

ALTER TABLE mods
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'mods_status_check'
      AND table_name = 'mods'
  ) THEN
    ALTER TABLE mods
    ADD CONSTRAINT mods_status_check
    CHECK (status IN ('planned', 'bought', 'installed'));
  END IF;
END $$;
