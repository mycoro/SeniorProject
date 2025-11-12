USE nutrimind;

CREATE TABLE IF NOT EXISTS patient_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  daily_calorie_target INT NOT NULL DEFAULT 2000,
  daily_protein_target FLOAT DEFAULT 120,
  daily_carbs_target FLOAT DEFAULT 250,
  daily_fat_target FLOAT DEFAULT 70,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
