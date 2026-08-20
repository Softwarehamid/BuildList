/*
  # Add car nickname support

  Adds a nullable nickname field for each car build. The app now uses this
  instead of out_the_door_price and down_payment in the UI.
*/

ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS car_nickname text;
