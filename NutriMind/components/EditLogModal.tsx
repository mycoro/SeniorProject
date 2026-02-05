import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useUser, MealLog } from "@/context/UserContext";

const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

type Props = {
  visible: boolean;
  log: MealLog | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditLogModal({ visible, log, onClose, onSaved }: Props) {
  const { updateMealLog } = useUser();
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [sugar, setSugar] = useState("");
  const [mealType, setMealType] = useState<MealLog["mealType"]>("Snack");
  const [timestamp, setTimestamp] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (log && visible) {
      setName(log.name);
      setProtein(String(log.protein));
      setCalories(String(log.calories));
      setCarbs(log.carbs != null ? String(log.carbs) : "");
      setFat(log.fat != null ? String(log.fat) : "");
      setSugar(log.sugar != null ? String(log.sugar) : "");
      setMealType(log.mealType ?? "Snack");
      setTimestamp(log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp));
    }
  }, [log, visible]);

  const parseNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return isNaN(n) || n < 0 ? null : n;
  };

  const handleSave = async () => {
    if (!log) return;
    const nameTrim = name.trim();
    if (!nameTrim) {
      Alert.alert("Required", "Please enter a name for this entry.");
      return;
    }
    const proteinNum = parseNum(protein);
    if (proteinNum === null && protein.trim() !== "") {
      Alert.alert("Invalid", "Protein must be a valid number.");
      return;
    }
    const caloriesNum = parseNum(calories);
    if (caloriesNum === null && calories.trim() !== "") {
      Alert.alert("Invalid", "Calories must be a valid number.");
      return;
    }
    const proteinVal = proteinNum ?? 0;
    const caloriesVal = caloriesNum ?? 0;
    const carbsVal = parseNum(carbs);
    const fatVal = parseNum(fat);
    const sugarVal = parseNum(sugar);

    setSaving(true);
    try {
      await updateMealLog(log.id, {
        name: nameTrim,
        protein: proteinVal,
        calories: caloriesVal,
        carbs: carbsVal ?? 0,
        fat: fatVal ?? 0,
        sugar: sugarVal ?? 0,
        mealType,
        timestamp,
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error("Error updating log:", e);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setTimestamp(selectedDate);
  };

  if (!log) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit entry</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Grilled chicken"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Calories</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Sugar (g)</Text>
                <TextInput
                  style={styles.input}
                  value={sugar}
                  onChangeText={setSugar}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Meal type</Text>
              <View style={styles.mealTypeRow}>
                {mealTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setMealType(type)}
                    style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                  >
                    <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date & time</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.dateBtn}
              >
                <Text style={styles.dateBtnText}>
                  {timestamp.toLocaleDateString()} · {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <>
                  {Platform.OS === "ios" && (
                    <View style={styles.datePickerWrap}>
                      <View style={styles.datePickerHeader}>
                        <Pressable onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerCancel}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={timestamp}
                        mode="datetime"
                        display="spinner"
                        onChange={handleDateChange}
                        textColor="#1e293b"
                      />
                    </View>
                  )}
                  {Platform.OS === "android" && (
                    <DateTimePicker
                      value={timestamp}
                      mode="datetime"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </View>
          </ScrollView>

          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFDF4",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6DDC8",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },
  cancelText: {
    fontSize: 16,
    color: "#3F5E52",
    fontWeight: "600",
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#004734",
    backgroundColor: "#FFF8E7",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    backgroundColor: "#FFF8E7",
  },
  mealTypeBtnActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004734",
  },
  mealTypeTextActive: {
    color: "white",
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF8E7",
  },
  dateBtnText: {
    fontSize: 15,
    color: "#004734",
    fontWeight: "500",
  },
  datePickerWrap: {
    marginTop: 10,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6DDC8",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E6DDC8",
  },
  datePickerCancel: {
    fontSize: 16,
    color: "#3F5E52",
    fontWeight: "600",
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: "700",
    color: "#009235",
  },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "#009235",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
