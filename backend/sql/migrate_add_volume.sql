USE nutrimind;

ALTER TABLE meal_entries
  ADD COLUMN volume FLOAT DEFAULT NULL AFTER fat;

