USE nutrimind;

ALTER TABLE meal_entries
  ADD COLUMN entry_kind ENUM('meal','liquid') NOT NULL DEFAULT 'meal' AFTER meal_type;
