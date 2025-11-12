'use strict';

const express = require('express');
const cors = require('cors');
const { createPool } = require('./db/connection');
const { addMealEntry, getDashboardData, getDailyMeals } = require('./models/mealModel');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

createPool();

function convertToLiters(amount, unit) {
	if (!amount || !unit) return null;
	const num = parseFloat(amount);
	if (isNaN(num)) return null;
	
	switch (unit.toLowerCase()) {
		case 'ml': return num / 1000;
		case 'l': return num;
		case 'oz': return num * 0.0295735;
		case 'cups': return num * 0.236588;
		default: return num;
	}
}

function convertToGrams(amount, unit) {
	if (!amount || !unit) return null;
	const num = parseFloat(amount);
	if (isNaN(num)) return null;
	
	switch (unit.toLowerCase()) {
		case 'g': return num;
		case 'mg': return num / 1000;
		case 'oz': return num * 28.3495;
		case 'kcal': return null;
		default: return num;
	}
}

function convertToKcal(amount, unit) {
	if (!amount || !unit) return null;
	const num = parseFloat(amount);
	if (isNaN(num)) return null;
	
	if (unit.toLowerCase() === 'kcal') return num;
	return null;
}

function formatDate(date) {
	if (!date) return new Date().toISOString().slice(0, 10);
	if (date instanceof Date) return date.toISOString().slice(0, 10);
	if (typeof date === 'string') {
		const d = new Date(date);
		if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
	}
	return new Date().toISOString().slice(0, 10);
}

function normalizeMealType(mealType) {
	if (!mealType) return 'snack';
	const normalized = mealType.toLowerCase();
	if (['breakfast', 'lunch', 'dinner', 'snack'].includes(normalized)) {
		return normalized;
	}
	return 'snack';
}

app.get('/api/dashboard', async (req, res) => {
	try {
		const patientId = parseInt(req.query.patientId) || 1;
		const date = req.query.date || new Date().toISOString().slice(0, 10);
		console.log(`[GET /api/dashboard] patientId=${patientId}, date=${date}`);
		
		const data = await getDashboardData(patientId, date);
		console.log(`[GET /api/dashboard] Returning data:`, JSON.stringify(data, null, 2));
		res.json(data);
	} catch (error) {
		console.error('Dashboard error:', error);
		res.status(500).json({ error: error.message });
	}
});

app.get('/api/meals', async (req, res) => {
	try {
		const patientId = parseInt(req.query.patientId) || 1;
		const date = req.query.date || new Date().toISOString().slice(0, 10);
		
		const meals = await getDailyMeals(patientId, date);
		res.json(meals);
	} catch (error) {
		console.error('Get meals error:', error);
		res.status(500).json({ error: error.message });
	}
});

app.post('/api/meals', async (req, res) => {
	try {
		console.log('[POST /api/meals] Received request body:', JSON.stringify(req.body, null, 2));
		const {
			patientId = 1,
			mealType,
			foodName,
			foodDescription,
			calories,
			caloriesUnit,
			protein,
			proteinUnit,
			carbs,
			carbsUnit,
			fiber,
			fiberUnit,
			fat,
			entryDate,
			entryKind,
			liquidType,
			amount,
			amountUnit,
			volume
		} = req.body;
		
		const normalizedMealType = normalizeMealType(mealType);
		const date = formatDate(entryDate);
		
		let finalFoodName = foodName || foodDescription || '';
		let finalEntryKind = entryKind || 'meal';
		let finalCalories = 0;
		let finalProtein = 0;
		let finalCarbs = 0;
		let finalFat = 0;
		let finalVolume = null;
		
		if (entryKind === 'liquid' || liquidType) {
			finalEntryKind = 'liquid';
			finalFoodName = liquidType || finalFoodName || 'Water';
			finalVolume = convertToLiters(amount, amountUnit) || volume;
			finalCalories = convertToKcal(calories, caloriesUnit) || 0;
			finalProtein = convertToGrams(protein, proteinUnit) || 0;
		} else {
			finalFoodName = foodDescription || foodName || '';
			finalCalories = convertToKcal(calories, caloriesUnit) || parseFloat(calories) || 0;
			finalProtein = convertToGrams(protein, proteinUnit) || parseFloat(protein) || 0;
			finalCarbs = convertToGrams(carbs, carbsUnit) || parseFloat(carbs) || 0;
			finalFat = convertToGrams(fiber, fiberUnit) || parseFloat(fiber) || parseFloat(fat) || 0;
		}
		
		if (!normalizedMealType || !finalFoodName) {
			return res.status(400).json({ error: 'mealType and foodName/foodDescription are required' });
		}
		
		const result = await addMealEntry(
			patientId,
			normalizedMealType,
			finalFoodName,
			finalCalories,
			finalProtein,
			finalCarbs,
			finalFat,
			date,
			finalEntryKind,
			finalVolume,
			null
		);
		
		console.log('[POST /api/meals] Entry saved:', JSON.stringify(result, null, 2));
		res.json(result);
	} catch (error) {
		console.error('Add meal error:', error);
		res.status(500).json({ error: error.message });
	}
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log(`Server accessible at http://172.16.2.134:${PORT}`);
});

