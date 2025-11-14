import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function LiquidEntry() {
  const router = useRouter();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [liquidType, setLiquidType] = useState("Select");
  const [showLiquidDropdown, setShowLiquidDropdown] = useState(false);

  const [amount, setAmount] = useState("");
  const [amountUnit, setAmountUnit] = useState("mL");
  const [showAmountDropdown, setShowAmountDropdown] = useState(false);

  const liquidTypes = ["Water", "Juice", "Electrolytes", "Milk", "Other"];
  const units = ["mL", "L", "oz", "cups"];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  // added function to send data to backend using fetch
  const handleSave = async () => {
  if (liquidType === "Select" || !amount) {
    alert("Please fill out all fields.");
    return;
  }

  // convert to mL (if not already)
  let intakeValue = parseFloat(amount);
  if (amountUnit === "L") intakeValue *= 1000;
  else if (amountUnit === "oz") intakeValue *= 29.5735;
  else if (amountUnit === "cups") intakeValue *= 236.588;

  try {
    const response = await fetch("http://192.168.1.249:3000/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: 1, // temporary hardcoded value
        liquidType,
        intake: intakeValue,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error(err);
      alert("Failed to save record.");
      return;
    }

    const data = await response.json();
    console.log("Saved intake:", data);
    alert("Liquid intake recorded!");
    router.back();
  } catch (error) {
    console.error(error);
    alert("Error connecting to server.");
  }
};

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Liquid</Text>
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

        {/* Liquid Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Liquid Type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowLiquidDropdown(!showLiquidDropdown)}>
            <Text style={styles.dropdownText}>{liquidType}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          {showLiquidDropdown && (
            <View style={styles.dropdownMenu}>
              {liquidTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setLiquidType(type);
                    setShowLiquidDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              placeholder="Type here..."
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.unitDropdown}
              onPress={() => setShowAmountDropdown(!showAmountDropdown)}
            >
              <Text style={styles.unitText}>{amountUnit}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
          {showAmountDropdown && (
            <View style={styles.dropdownMenu}>
              {units.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setAmountUnit(unit);
                    setShowAmountDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Liquid</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { marginRight: 12 },
  backArrow: { fontSize: 24, fontWeight: "bold" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  form: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  textInput: { backgroundColor: "#FFF", borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  dateDisplay: { backgroundColor: "#FFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  dateText: { fontSize: 14, color: "#111827" },
  dropdown: { backgroundColor: "#FFF", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  dropdownText: { fontSize: 14, color: "#111827" },
  dropdownArrow: { fontSize: 12, color: "#6B7280" },
  dropdownMenu: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  dropdownItemText: { fontSize: 14, color: "#111827" },
  amountRow: { flexDirection: "row", gap: 8 },
  amountInput: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  unitDropdown: { minWidth: 80, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  unitText: { fontSize: 14, color: "#111827" },
  buttonContainer: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  saveButton: { flex: 1, backgroundColor: "#4A4A4A", borderRadius: 12, padding: 16, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
