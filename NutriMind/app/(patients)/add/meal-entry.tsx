import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

//add meal entry to firebase
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/config/firebase";




export default function MealEntry() {
  const router = useRouter();
  //for firebase
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mealType, setMealType] = useState("Select");
  const [showMealDropdown, setShowMealDropdown] = useState(false);

  const [calories, setCalories] = useState("");
  const [caloriesUnit, setCaloriesUnit] = useState("kcal");
  const [showCaloriesDropdown, setShowCaloriesDropdown] = useState(false);

  const [protein, setProtein] = useState("");
  const [proteinUnit, setProteinUnit] = useState("g");
  const [showProteinDropdown, setShowProteinDropdown] = useState(false);

  const [carbs, setCarbs] = useState("");
  const [carbsUnit, setCarbsUnit] = useState("g");
  const [showCarbsDropdown, setShowCarbsDropdown] = useState(false);

  const [fiber, setFiber] = useState("");
  const [fiberUnit, setFiberUnit] = useState("g");
  const [showFiberDropdown, setShowFiberDropdown] = useState(false);

  const [foodDescription, setFoodDescription] = useState("");

  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const units = ["g", "mg", "oz", "kcal"];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  //for firebase
  const handleSaveMeal = async () => {
  setError(null);

  const uid = auth.currentUser?.uid;
  if (!uid) {
    setError("You must be logged in to save a meal.");
    return;
  }

  // Helper: convert numeric string -> number | null
  const toNum = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const caloriesNum = toNum(calories);
  const proteinNum = protein ? toNum(protein) : null;
  const carbsNum = carbs ? toNum(carbs) : null;
  const fiberNum = fiber ? toNum(fiber) : null;

  if (!caloriesNum || caloriesNum <= 0) {
    setError("Please enter valid calories.");
    return;
  }

  if (mealType === "Select") {
    setError("Please select a meal type.");
    return;
  }

  setSaving(true);
  try {
    await addDoc(collection(db, "patients", uid, "meals"), {
      date: date.toISOString(),                 // the date selected in UI
      mealType,                                 // Breakfast/Lunch/Dinner/Snack
      foodDescription: foodDescription.trim(),   // text input
      macros: {
        calories: { value: caloriesNum, unit: caloriesUnit },
        protein: proteinNum != null ? { value: proteinNum, unit: proteinUnit } : null,
        carbs: carbsNum != null ? { value: carbsNum, unit: carbsUnit } : null,
        fiber: fiberNum != null ? { value: fiberNum, unit: fiberUnit } : null,
      },
      createdAt: serverTimestamp(),             // Firestore timestamp
      updatedAt: serverTimestamp(),
    });

    router.back();
  } catch (e: any) {
    setError(e?.message ?? "Failed to save meal.");
  } finally {
    setSaving(false);
  }
};

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Meal Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Meal Type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowMealDropdown(!showMealDropdown)}>
            <Text style={styles.dropdownText}>{mealType}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          {showMealDropdown && (
            <View style={styles.dropdownMenu}>
              {mealTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setMealType(type);
                    setShowMealDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Food Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Food Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type here..."
            value={foodDescription}
            onChangeText={setFoodDescription}
          />
        </View>

        {/* Macronutrients */}
        <View style={styles.macroSection}>
          <Text style={styles.macroTitle}>Macronutrients</Text>
          {[
            { label: "Calories", value: calories, setValue: setCalories, unit: caloriesUnit, setUnit: setCaloriesUnit, showDropdown: showCaloriesDropdown, setShowDropdown: setShowCaloriesDropdown },
            { label: "Protein", value: protein, setValue: setProtein, unit: proteinUnit, setUnit: setProteinUnit, showDropdown: showProteinDropdown, setShowDropdown: setShowProteinDropdown },
            { label: "Carbs", value: carbs, setValue: setCarbs, unit: carbsUnit, setUnit: setCarbsUnit, showDropdown: showCarbsDropdown, setShowDropdown: setShowCarbsDropdown },
            { label: "Fiber", value: fiber, setValue: setFiber, unit: fiberUnit, setUnit: setFiberUnit, showDropdown: showFiberDropdown, setShowDropdown: setShowFiberDropdown },
          ].map((macro) => (
            <View key={macro.label} style={styles.macroRowWrapper}>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <View style={styles.macroRow}>
                <TextInput
                  style={styles.macroInput}
                  placeholder="Type here..."
                  value={macro.value}
                  onChangeText={macro.setValue}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.unitDropdown}
                  onPress={() => macro.setShowDropdown(!macro.showDropdown)}
                >
                  <Text style={styles.unitText}>{macro.unit}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
              {macro.showDropdown && (
                <View style={styles.dropdownMenu}>
                  {units.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={styles.dropdownItem}
                      onPress={() => {
                        macro.setUnit(unit);
                        macro.setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Buttons */}
        {error ? <Text style={{ color: "red", marginBottom: 12 }}>{error}</Text> : null}
        {/* for firebase, show the error message in the UI */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}> */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveMeal} disabled={saving}> 
            {/*for firebase*/}

            <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Meal"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF4" },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { marginRight: 12 },
  backArrow: { fontSize: 24, fontWeight: "700", color: "#004734" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#004734" },
  form: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#004734" },
  textInput: { backgroundColor: "#FFFDF4", borderRadius: 16, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#009235" },
  dateDisplay: { backgroundColor: "#BADA76", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#009235" },
  dateText: { fontSize: 14, color: "#004734" },
  dropdown: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#009235" },
  dropdownText: { fontSize: 14, color: "#004734" },
  dropdownArrow: { fontSize: 12, color: "#004734" },
  dropdownMenu: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#009235", marginTop: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  dropdownItemText: { fontSize: 14, color: "#004734" },
  macroSection: { backgroundColor: "#FFF8E7", borderRadius: 16, padding: 16, marginBottom: 24 },
  macroTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "#004734" },
  macroRowWrapper: { marginBottom: 16 },
  macroLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4, color: "#004734" },
  macroRow: { flexDirection: "row", gap: 8 },
  macroInput: { flex: 1, backgroundColor: "#FFFDF4", borderRadius: 16, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#009235" },
  unitDropdown: { minWidth: 80, backgroundColor: "#FFFDF4", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#009235" },
  unitText: { fontSize: 14, color: "#004734" },
  buttonContainer: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, backgroundColor: "#FFBF48", borderRadius: 16, padding: 16, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#004734" },
  saveButton: { flex: 1, backgroundColor: "#004734", borderRadius: 16, padding: 16, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});