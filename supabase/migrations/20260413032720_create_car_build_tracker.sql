
/*
  # Car Build Tracker Schema

  ## Overview
  A personal car build tracker app for managing dream car builds, mods, and parts lists.

  ## Tables

  ### cars
  - Stores each car build with pricing info
  - Fields: id, name, base_price, out_the_door_price, down_payment, image_url, created_at

  ### mod_categories
  - Groups mods into logical sections (Labor, Upgrades, Power - Stage 1, Interior, etc.)
  - Fields: id, car_id, name, display_order, created_at

  ### mods
  - Individual parts/mods with pricing (supports ranges for labor) and purchase URL
  - Fields: id, category_id, name, price_min, price_max, url, notes, created_at

  ## Security
  - RLS enabled on all tables
  - Public read/write access for anon role (personal app, no auth required)
*/

CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_price numeric(12,2),
  out_the_door_price numeric(12,2),
  down_payment numeric(12,2),
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mod_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES mod_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_min numeric(12,2),
  price_max numeric(12,2),
  url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read cars"
  ON cars FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert cars"
  ON cars FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update cars"
  ON cars FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete cars"
  ON cars FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read mod_categories"
  ON mod_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert mod_categories"
  ON mod_categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update mod_categories"
  ON mod_categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete mod_categories"
  ON mod_categories FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read mods"
  ON mods FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert mods"
  ON mods FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update mods"
  ON mods FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete mods"
  ON mods FOR DELETE
  TO anon, authenticated
  USING (true);
