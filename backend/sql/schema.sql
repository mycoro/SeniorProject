-- NutriMind schema
CREATE DATABASE IF NOT EXISTS nutrimind;
USE nutrimind;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS meal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  meal_type ENUM('breakfast','lunch','dinner','snack'),
  food_name VARCHAR(255),
  calories FLOAT,
  protein FLOAT,
  carbs FLOAT,
  fat FLOAT,
  entry_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
