USE nutrimind;

ALTER TABLE meal_entries
  ADD COLUMN entry_time TIME DEFAULT NULL AFTER entry_date;

