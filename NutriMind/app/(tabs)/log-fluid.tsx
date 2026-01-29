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
import { Droplets, ArrowLeft } from "lucide-react-native";
import { useUser } from "@/context/UserContext";
import { router } from "expo-router";
import { MealLog } from "@/context/UserContext";

const fluidTypes = [
  "Water",
  "Protein Shake",
  "Broth",
  "Sugar-Free Jell-O",
  "Skim Milk",
  "Herbal Tea",
  "Decaf Coffee",
  "Electrolyte Drink",
  "Other",
];

export default function LogFluid() {
  const { addMealLog, userProfile, dailyLogs } = useUser();
  const [fluidType, setFluidType] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [customType, setCustomType] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!fluidType) {
      Alert.alert("Required", "Please select a fluid type.");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Required", "Please enter a valid amount in ounces.");
      return;
    }

    const fluidName = fluidType === "Other" && customType.trim() 
      ? customType.trim() 
      : fluidType;

    const ounces = parseFloat(amount);
    
    const fluidLog: MealLog = {
      id: Date.now().toString(),
      name: `${fluidName} (${ounces}oz)`,
      protein: fluidType === "Protein Shake" ? Math.round(ounces * 1.5) : 0,
      calories: getCaloriesForFluid(fluidType, ounces),
      carbs: fluidType === "Protein Shake" ? Math.round(ounces * 0.5) : 0,
      mealType: "Snack",
      timestamp: new Date(),
    };

    await addMealLog(fluidLog);
    
    setFluidType("");
    setAmount("");
    setCustomType("");
    setNotes("");
    Alert.alert("Success", "Fluid logged successfully!");
  };

  const getCaloriesForFluid = (type: string, ounces: number): number => {
    const caloriesPerOz: { [key: string]: number } = {
      "Water": 0,
      "Protein Shake": 15,
      "Broth": 2,
      "Sugar-Free Jell-O": 10,
      "Skim Milk": 10,
      "Herbal Tea": 0,
      "Decaf Coffee": 2,
      "Electrolyte Drink": 8,
      "Other": 5,
    };
    
    return Math.round((caloriesPerOz[type] || 5) * ounces);
  };

  const getDaysPostOp = () => {
    if (!userProfile?.surgeryDate) return 14;
    const surgery = new Date(userProfile.surgeryDate);
    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - surgery.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diff);
  };

  const getFluidAmountFromLog = (log: MealLog) => {
    const match = log.name.match(/\((\d+(?:\.\d+)?)oz\)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  };

  const daysPostOp = getDaysPostOp();
  const fluidGoal = userProfile?.fluidGoal || 64;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayFluids = dailyLogs
    .filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= todayStart && logDate <= todayEnd;
    })
    .filter((log) => {
      const name = log.name.toLowerCase();
      return (
        name.includes("water") ||
        name.includes("shake") ||
        name.includes("broth") ||
        name.includes("milk") ||
        name.includes("tea") ||
        name.includes("coffee") ||
        name.includes("jell-o") ||
        name.includes("fluid") ||
        name.includes("drink") ||
        name.match(/\(\d+oz\)/)
      );
    })
    .reduce((sum, log) => {
      const fluidAmount = getFluidAmountFromLog(log);
      return sum + (fluidAmount > 0 ? fluidAmount : 0);
    }, 0);

  const remainingFluids = Math.max(0, fluidGoal - todayFluids);

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
          <Text style={styles.title}>Log Fluid</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Today's Total</Text>
              <Text style={styles.summaryValue}>{todayFluids.toFixed(1)} oz</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Daily Goal</Text>
              <Text style={styles.summaryValue}>{fluidGoal} oz</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: "#008080" }]}>
                {remainingFluids.toFixed(1)} oz
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fluid Type</Text>
          <Text style={styles.sectionHint}>
            Select the type of fluid you consumed
          </Text>
          <View style={styles.fluidTypesGrid}>
            {fluidTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setFluidType(type)}
                style={[
                  styles.fluidTypeButton,
                  fluidType === type && styles.fluidTypeButtonActive,
                ]}
              >
                <Droplets
                  size={20}
                  color={fluidType === type ? "white" : "#008080"}
                />
                <Text
                  style={[
                    styles.fluidTypeText,
                    fluidType === type && styles.fluidTypeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {fluidType === "Other" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Specify Fluid Type</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Coconut Water"
              value={customType}
              onChangeText={setCustomType}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount (ounces)</Text>
          <Text style={styles.sectionHint}>
            Enter the amount of fluid consumed
          </Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Text style={styles.amountUnit}>oz</Text>
          </View>
          <View style={styles.quickAmounts}>
            {[4, 8, 12, 16].map((oz) => (
              <Pressable
                key={oz}
                onPress={() => setAmount(oz.toString())}
                style={styles.quickAmountButton}
              >
                <Text style={styles.quickAmountText}>{oz} oz</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {daysPostOp < 14 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Phase 1 Reminder</Text>
            <Text style={styles.warningText}>
              During the first 14 days post-op, avoid caffeine, carbonation, and
              using straws. Sip fluids slowly throughout the day.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Add any notes about this fluid entry..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Droplets size={20} color="white" />
          <Text style={styles.saveButtonText}>Save Fluid Entry</Text>
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
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#004734",
  },
  placeholder: {
    width: 28,
  },

  /* summary */
  summaryCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7A9C8A",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004734",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E6DCC2",
    marginHorizontal: 4,
  },

  /* sections */
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: "#7A9C8A",
    marginBottom: 12,
  },

  /* fluid type buttons */
  fluidTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fluidTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6C89A",
    backgroundColor: "#FFFDF4",
    minWidth: "47%",
  },
  fluidTypeButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  fluidTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#004734",
  },
  fluidTypeTextActive: {
    color: "white",
  },

  /* amount input */
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFDF4",
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: "700",
    color: "#004734",
    textAlign: "center",
  },
  amountUnit: {
    fontSize: 18,
    color: "#7A9C8A",
    fontWeight: "500",
  },

  quickAmounts: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  quickAmountButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF7A2F",
    backgroundColor: "#FFF8E7",
  },
  quickAmountText: {
    fontSize: 14,
    color: "#FF7A2F",
    fontWeight: "600",
  },

  /* inputs */
  textInput: {
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFDF4",
    color: "#004734",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  /* warning */
  warningBox: {
    backgroundColor: "#FFF3C4",
    borderWidth: 1,
    borderColor: "#FFB703",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9A6700",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: "#9A6700",
    lineHeight: 18,
  },

  /* save */
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#009235",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
