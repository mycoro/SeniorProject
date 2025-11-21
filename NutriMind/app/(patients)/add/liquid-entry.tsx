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
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLiquidDropdown(!showLiquidDropdown)}
          >
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

          <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveButtonText}>Save Liquid</Text>
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
  dateDisplay: { backgroundColor: "#BADA76", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#009235" },
  dateText: { fontSize: 14, color: "#004734" },
  dropdown: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#009235" },
  dropdownText: { fontSize: 14, color: "#004734" },
  dropdownArrow: { fontSize: 12, color: "#004734" },
  dropdownMenu: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#009235", marginTop: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  dropdownItemText: { fontSize: 14, color: "#004734" },
  amountRow: { flexDirection: "row", gap: 8 },
  amountInput: { flex: 1, backgroundColor: "#FFFDF4", borderRadius: 16, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#009235" },
  unitDropdown: { minWidth: 80, backgroundColor: "#FFFDF4", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#009235" },
  unitText: { fontSize: 14, color: "#004734" },
  buttonContainer: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, backgroundColor: "#FFBF48", borderRadius: 16, padding: 16, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#004734" },
  saveButton: { flex: 1, backgroundColor: "#004734", borderRadius: 16, padding: 16, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
