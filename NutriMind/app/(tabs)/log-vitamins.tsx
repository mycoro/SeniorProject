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
} from "react-native";
import { ArrowLeft, Pill, Check } from "lucide-react-native";
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

  const toggleVitamin = (vitamin: string) => {
    if (selectedVitamins.includes(vitamin)) {
      setSelectedVitamins(selectedVitamins.filter((v) => v !== vitamin));
    } else {
      setSelectedVitamins([...selectedVitamins, vitamin]);
    }
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
      const vitaminLog: MealLog = {
        id: `${Date.now()}-${index}`,
        name: vitamin,
        protein: 0,
        calories: 0,
        carbs: 0,
        mealType: "Snack",
        timestamp: new Date(),
      };
      addMealLog(vitaminLog);
    });

    Alert.alert("Success", `${vitaminsToLog.length} vitamin(s) logged successfully!`);
    setSelectedVitamins([]);
    setCustomVitamin("");
    setNotes("");
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
