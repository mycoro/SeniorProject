'use strict';

const { query } = require('../db/connection');

async function addMealEntry(patientId, mealType, foodName, calories, protein, carbs, fat, entryDate, entryKind, volume, entryTime) {
	const sql = `
		INSERT INTO meal_entries
			(patient_id, meal_type, entry_kind, food_name, calories, protein, carbs, fat, volume, entry_date, entry_time)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	const params = [
		patientId,
		mealType || 'snack',
		entryKind || 'meal',
		foodName,
		calories || 0,
		protein || 0,
		carbs || 0,
		fat || 0,
		volume || null,
		entryDate,
		entryTime || null
	];
	const result = await query(sql, params);
	return { id: result.insertId, patientId, mealType, entryKind, foodName, calories, protein, carbs, fat, volume, entryDate, entryTime };
}

async function getDailyMeals(patientId, date) {
	const sql = `
		SELECT id, patient_id AS patientId, meal_type AS mealType, entry_kind AS entryKind, food_name AS foodName,
			calories, protein, carbs, fat, volume, entry_date AS entryDate, entry_time AS entryTime, created_at AS createdAt
		FROM meal_entries
		WHERE patient_id = ? AND entry_date = ?
		ORDER BY entry_time ASC, created_at ASC, id ASC
	`;
	return query(sql, [patientId, date]);
}

async function getDailySummary(patientId, date) {
	const allSql = `
		SELECT 
			COALESCE(SUM(calories), 0) AS totalCalories,
			COALESCE(SUM(protein), 0) AS totalProtein,
			COALESCE(SUM(carbs), 0) AS totalCarbs,
			COALESCE(SUM(fat), 0) AS totalFat
		FROM meal_entries
		WHERE patient_id = ? AND entry_date = ?
	`;
	const allRows = await query(allSql, [patientId, date]);
	const all = allRows[0] || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
	
	const liquidSql = `
		SELECT COALESCE(SUM(volume), 0) AS totalLiquid
		FROM meal_entries
		WHERE patient_id = ? AND entry_date = ? AND entry_kind = 'liquid' AND volume IS NOT NULL
	`;
	const liquidRows = await query(liquidSql, [patientId, date]);
	const liquid = liquidRows[0]?.totalLiquid || 0;
	
	return { ...all, totalLiquid: liquid };
}

// Dashboard helpers
async function getTargets(patientId) {
	const rows = await query(
		`SELECT daily_calorie_target AS kcal, daily_protein_target AS protein, daily_carbs_target AS carbs, daily_fat_target AS fat
		 FROM patient_goals WHERE patient_id = ? LIMIT 1`, [patientId]
	);
	if (rows[0]) return rows[0];
	return { kcal: 2000, protein: 120, carbs: 250, fat: 70 };
}

async function getRecentMeals(patientId, limit = 5) {
	return query(
		`SELECT id, meal_type AS mealType, entry_kind AS entryKind, food_name AS foodName, calories, protein, carbs, fat, created_at AS createdAt
		 FROM meal_entries WHERE patient_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
		[patientId, Number(limit)]
	);
}

async function getWeeklySummary(patientId, endDate, days = 7) {
	// Compute start date in SQL by subtracting days-1
	return query(
		`SELECT entry_date AS date,
			COALESCE(SUM(calories),0) AS calories,
			COALESCE(SUM(protein),0) AS protein,
			COALESCE(SUM(carbs),0) AS carbs,
			COALESCE(SUM(fat),0) AS fat
		 FROM meal_entries
		 WHERE patient_id = ? AND entry_date BETWEEN DATE_SUB(?, INTERVAL ? DAY) AND ?
		 GROUP BY entry_date
		 ORDER BY entry_date`,
		[patientId, endDate, Number(days) - 1, endDate]
	);
}

async function getTodaySummaryWithTargets(patientId, date) {
	const [summary, targets] = await Promise.all([
		getDailySummary(patientId, date),
		getTargets(patientId)
	]);
	return { ...summary, targets };
}

async function getMealsByType(patientId, date) {
	const allSql = `
		SELECT 
			meal_type AS mealType,
			COALESCE(SUM(calories), 0) AS calories,
			COALESCE(SUM(protein), 0) AS protein
		FROM meal_entries
		WHERE patient_id = ? AND entry_date = ?
		GROUP BY meal_type
	`;
	const allRows = await query(allSql, [patientId, date]);
	
	const liquidSql = `
		SELECT 
			meal_type AS mealType,
			COALESCE(SUM(volume), 0) AS liquid
		FROM meal_entries
		WHERE patient_id = ? AND entry_date = ? AND entry_kind = 'liquid' AND volume IS NOT NULL
		GROUP BY meal_type
	`;
	const liquidRows = await query(liquidSql, [patientId, date]);
	
	const result = {
		breakfast: { calories: 0, protein: 0, liquid: 0 },
		lunch: { calories: 0, protein: 0, liquid: 0 },
		dinner: { calories: 0, protein: 0, liquid: 0 },
		snack: { calories: 0, protein: 0, liquid: 0 }
	};
	
	for (const row of allRows) {
		if (result[row.mealType]) {
			result[row.mealType].calories = row.calories;
			result[row.mealType].protein = row.protein;
		}
	}
	
	for (const row of liquidRows) {
		if (result[row.mealType]) {
			result[row.mealType].liquid = row.liquid;
		}
	}
	
	return result;
}

async function getDashboardData(patientId, date) {
	const [summary, mealsByType] = await Promise.all([
		getDailySummary(patientId, date),
		getMealsByType(patientId, date)
	]);
	
	return {
		summary: {
			calories: summary.totalCalories,
			protein: summary.totalProtein,
			liquid: summary.totalLiquid
		},
		meals: mealsByType
	};
}

module.exports = {
	addMealEntry,
	getDailyMeals,
	getDailySummary,
	getTargets,
	getRecentMeals,
	getWeeklySummary,
	getTodaySummaryWithTargets,
	getMealsByType,
	getDashboardData
};
