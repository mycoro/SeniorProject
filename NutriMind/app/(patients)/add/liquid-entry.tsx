import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

//for firebase
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/config/firebase";



export default function LiquidEntry() {
  const router = useRouter();

  //for firebase UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

//form state
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
  const handleSaveLiquid = async () => {
    setError(null);

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError("You must be logged in to save a drink.");
      return;
    }

    if (liquidType === "Select") {
      setError("Please select a liquid type.");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "patients", uid, "liquids"), {
        date: date.toISOString(),
        liquidType,
        amount: { value: amountNum, unit: amountUnit },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save liquid.");
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
        {error ? <Text style={{ color: "red", marginBottom: 12 }}>{error}</Text> : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveLiquid}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
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
