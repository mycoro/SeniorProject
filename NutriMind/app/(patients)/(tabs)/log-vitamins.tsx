import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { ArrowLeft, Pill, Check, Calendar, X } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useUser, MealLog } from "@/context/UserContext";
import { router } from "expo-router";

const VITAMIN_TYPES = [
  "Multivitamin",
  "B12",
  "Calcium",
  "Vitamin D",
  "Iron",
  "Biotin",
  "Other",
];

export default function LogVitamins() {
  const { addMealLog } = useUser();
  const [selectedVitamins, setSelectedVitamins] = useState<string[]>([]);
  const [customVitamin, setCustomVitamin] = useState("");
  const [notes, setNotes] = useState("");
  const [amountByVitamin, setAmountByVitamin] = useState<Record<string, string>>({});

  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const formatDateLabel = (d: Date) => {
    if (isToday(d)) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const toggleVitamin = (vitamin: string) => {
    if (selectedVitamins.includes(vitamin)) {
      setSelectedVitamins(selectedVitamins.filter((v) => v !== vitamin));
      setAmountByVitamin((prev) => {
        const next = { ...prev };
        delete next[vitamin];
        return next;
      });
    } else {
      setSelectedVitamins([...selectedVitamins, vitamin]);
    }
  };

  const setAmountForVitamin = (vitamin: string, value: string) => {
    setAmountByVitamin((prev) => ({ ...prev, [vitamin]: value }));
  };

  const handleSave = () => {
    if (selectedVitamins.length === 0 && !customVitamin.trim()) {
      Alert.alert("Required", "Please select at least one vitamin or enter a custom vitamin.");
      return;
    }

    const vitaminsToLog = customVitamin.trim()
      ? [...selectedVitamins, customVitamin.trim()]
      : selectedVitamins;

    vitaminsToLog.forEach((vitamin, index) => {
      const amount = (amountByVitamin[vitamin] ?? "").trim();
      const displayName = amount ? `${vitamin} (${amount})` : vitamin;
      const vitaminLog: MealLog = {
        id: `${Date.now()}-${index}`,
        name: displayName,
        protein: 0,
        calories: 0,
        carbs: 0,
        mealType: "Vitamin",
        timestamp: selectedDateTime,
      };
      addMealLog(vitaminLog);
    });

    Alert.alert("Success", `${vitaminsToLog.length} vitamin(s) logged successfully!`);
    setSelectedVitamins([]);
    setCustomVitamin("");
    setNotes("");
    setAmountByVitamin({});
    setSelectedDateTime(new Date());
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color="#003366" />
          </Pressable>
          <Text style={styles.title}>Log Vitamins</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.infoCard}>
          <Pill size={24} color="#f97316" />
          <Text style={styles.infoText}>
            Select all vitamins you’ve taken today. This helps track your supplement intake.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date consumed</Text>
          <Pressable onPress={() => setShowDateTimePicker(true)} style={[styles.dateChip, !isToday(selectedDateTime) && styles.dateChipActive]}>
            <Calendar size={14} color={isToday(selectedDateTime) ? "#6B8F7A" : "#004734"} />
            <Text style={[styles.dateChipText, !isToday(selectedDateTime) && styles.dateChipTextActive]}>
              {formatDateLabel(selectedDateTime)}
            </Text>
            {!isToday(selectedDateTime) && (
              <Pressable
                onPress={(e) => { e.stopPropagation(); setSelectedDateTime(new Date()); }}
                hitSlop={8}
              >
                <X size={14} color="#004734" />
              </Pressable>
            )}
          </Pressable>
          {showDateTimePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedDateTime}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(event: any, date?: Date) => {
                  if (Platform.OS === "android") setShowDateTimePicker(false);
                  if (date) setSelectedDateTime(date);
                }}
                style={Platform.OS === "ios" ? { alignSelf: "center" } : undefined}
              />
              {Platform.OS === "ios" && (
                <Pressable onPress={() => setShowDateTimePicker(false)} style={styles.datePickerDoneButton}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Vitamins</Text>
          <View style={styles.vitaminsGrid}>
            {VITAMIN_TYPES.map((vitamin) => (
              <Pressable
                key={vitamin}
                onPress={() => toggleVitamin(vitamin)}
                style={[
                  styles.vitaminButton,
                  selectedVitamins.includes(vitamin) && styles.vitaminButtonActive,
                ]}
              >
                {selectedVitamins.includes(vitamin) && (
                  <Check size={16} color="white" style={styles.checkIcon} />
                )}
                <Text
                  style={[
                    styles.vitaminButtonText,
                    selectedVitamins.includes(vitamin) && styles.vitaminButtonTextActive,
                  ]}
                >
                  {vitamin}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {selectedVitamins.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Amount (optional)</Text>
            <Text style={styles.amountHint}>e.g. 500mcg, 65mg, 2000 IU</Text>
            {selectedVitamins.map((vitamin) => (
              <View key={vitamin} style={styles.amountRow}>
                <Text style={styles.amountLabel}>{vitamin}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="amount"
                  placeholderTextColor="#9CB5A6"
                  value={amountByVitamin[vitamin] ?? ""}
                  onChangeText={(v) => setAmountForVitamin(vitamin, v)}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
        )}

        {customVitamin.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Amount for {customVitamin.trim()} (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 500mcg, 65mg"
              placeholderTextColor="#9CB5A6"
              value={amountByVitamin[customVitamin.trim()] ?? ""}
              onChangeText={(v) => setAmountForVitamin(customVitamin.trim(), v)}
              autoCapitalize="none"
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom Vitamin (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Folic Acid"
            value={customVitamin}
            onChangeText={setCustomVitamin}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Add any additional notes about your vitamins"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Log Vitamins</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#004734",
  },
  placeholder: {
    width: 36,
  },

  /* info */
  infoCard: {
    backgroundColor: "#FFF3C4",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFB703",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#9A6700",
    lineHeight: 20,
  },

  /* date picker */
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F1F8F4",
    borderWidth: 1,
    borderColor: "#D4E8DA",
    alignSelf: "flex-start",
  },
  dateChipActive: { backgroundColor: "#FFF3C4", borderColor: "#E6C85E" },
  dateChipText: { fontSize: 13, fontWeight: "500", color: "#6B8F7A" },
  dateChipTextActive: { color: "#004734", fontWeight: "600" },
  datePickerContainer: {
    backgroundColor: "#FFF8E7",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E6D8A8",
  },
  datePickerDoneButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#009235",
    borderRadius: 10,
  },
  datePickerDoneText: { color: "#FFFDF4", fontWeight: "600", fontSize: 15 },

  /* sections */
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 12,
  },

  /* vitamins grid */
  vitaminsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitaminButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6C89A",
    backgroundColor: "#FFFDF4",
    minWidth: "45%",
  },
  vitaminButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  checkIcon: {
    marginRight: 6,
  },
  vitaminButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#004734",
  },
  vitaminButtonTextActive: {
    color: "white",
  },

  /* amount rows */
  amountHint: {
    fontSize: 13,
    color: "#6B8F7A",
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#004734",
    minWidth: 90,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#004734",
    backgroundColor: "#FFFDF4",
  },

  /* inputs */
  textInput: {
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#004734",
    backgroundColor: "#FFFDF4",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  /* save */
  saveButton: {
    backgroundColor: "#009235",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
