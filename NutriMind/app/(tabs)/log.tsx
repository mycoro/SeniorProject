import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Camera, Timer, X, Loader2 } from "lucide-react-native";
import { useUser } from "@/context/UserContext";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { API_BASE_URL } from "@/config/api";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type EntryMode = "manual" | "camera";

export default function LogMeal() {
  const { addMealLog, userProfile } = useUser();
  const [mealType, setMealType] = useState<MealType>("Breakfast");
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [showBiteTimer, setShowBiteTimer] = useState(false);
  const [timerPhase, setTimerPhase] = useState<"chew" | "swallow" | "wait">("chew");
  const [scanResult, setScanResult] = useState<{
    name: string;
    dishName?: string;
    ingredients?: string[];
    protein: number;
    calories: number;
    carbs?: number;
  } | null>(null);
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [foodName, setFoodName] = useState("");
  const [ingredients, setIngredients] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (showBiteTimer) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [pulseAnim, showBiteTimer]);

  useEffect(() => {
    if (!showBiteTimer) {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
      return;
    }

    // 20-20-20 rule (bariatric): chew ~20 times (~20s), brief swallow, wait 20s–1 min between bites.
    const phases: ("chew" | "swallow" | "wait")[] = ["chew", "swallow", "wait"];
    const durations = {
      chew: 20000,   // 20 sec – time for ~20 chews (1/sec) to reach pureed consistency
      swallow: 5000, // 5 sec – brief moment to swallow
      wait: 20000,   // 20 sec – wait between bites (20-20-20; some guidelines use up to 60 sec)
    };
    let currentIndex = 0;
    setTimerPhase("chew");

    const scheduleNext = () => {
      phaseTimeoutRef.current = setTimeout(() => {
        currentIndex = (currentIndex + 1) % phases.length;
        setTimerPhase(phases[currentIndex]);
        scheduleNext();
      }, durations[phases[currentIndex]]);
    };

    phaseTimeoutRef.current = setTimeout(() => {
      currentIndex = 1;
      setTimerPhase("swallow");
      scheduleNext();
    }, durations.chew);

    return () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
    };
  }, [showBiteTimer]);

  const handleScan = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Camera permission is required!");
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) {
        setIsScanning(false);
        return;
      }

      const imageUri = result.assets[0].uri;
      const base64 = result.assets[0].base64;

      if (!base64) {
        const fileContent = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        await analyzePhoto(fileContent);
      } else {
        await analyzePhoto(base64);
      }
    } catch (error: any) {
      console.error("Photo scan error:", error);
      alert("Failed to scan photo. Please try again.");
      setIsScanning(false);
    }
  };

  const analyzePhoto = async (imageBase64: string) => {
    if (!userProfile?.surgeryDate) {
      alert("Please complete your profile setup first. You can do this in Settings.");
      setIsScanning(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_BASE_URL}/api/analyze-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          userProfile: {
            surgeryDate: userProfile.surgeryDate,
            surgeryType: userProfile.surgeryType,
            hasDumpingSyndrome: userProfile.hasDumpingSyndrome,
            hasDiabetes: userProfile.hasDiabetes,
            intolerances: userProfile.intolerances || [],
            tastePreferences: userProfile.tastePreferences,
            dislikedFoods: userProfile.dislikedFoods,
            favoriteCuisines: userProfile.favoriteCuisines || [],
          },
        }),
        signal: controller.signal,
      }).catch((fetchError) => {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timed out. The analysis is taking longer than expected. Please try again.");
        }
        throw new Error(`Network error: ${fetchError.message}`);
      });

      clearTimeout(timeoutId);

      if (response.status === 413) {
        throw new Error("Image is too large. Please take a smaller photo or reduce image quality.");
      }

      const contentType = response.headers.get("content-type");
      let result;
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        const preview = text ? text.slice(0, 200) : "";
        throw new Error(
          `Server returned non-JSON response (${response.status}). ${preview ? `Response: ${preview}` : "Check if backend is running."}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      result = await response.json();

      if (result.error) {
        alert(`Analysis Error: ${result.error}`);
        setIsScanning(false);
        return;
      }

      setIsScanning(false);
      setScanResult({
        name: result.name || "Food Item",
        dishName: result.dishName,
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : undefined,
        protein: result.protein || 0,
        calories: result.calories || 0,
        carbs: result.carbs || 0,
      });

      if (result.recommendation && !result.isAppropriate) {
        alert(`Warning: ${result.recommendation}`);
      }
    } catch (error: any) {
      console.error("Photo analysis error:", error);
      let errorMessage = "Failed to analyze photo. ";
      
      if (error.message && error.message.includes("too large")) {
        errorMessage = "Image is too large. Please try again with a smaller photo.";
      } else if (error.message && (error.message.includes("Network request failed") || error.message.includes("Network error"))) {
        errorMessage = "Cannot connect to server. Please check your network connection.";
      } else if (error.message && (error.message.includes("JSON Parse") || error.message.includes("non-JSON"))) {
        errorMessage = "Server returned invalid response. Please try again.";
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      alert(errorMessage);
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!foodName.trim() || !protein || !calories) {
      alert("Please fill in all required fields (Food Name, Protein, and Calories)");
      return;
    }

    const proteinValue = parseFloat(protein);
    const caloriesValue = parseFloat(calories);
    const carbsValue = carbs ? parseFloat(carbs) : 0;

    if (isNaN(proteinValue) || isNaN(caloriesValue) || proteinValue < 0 || caloriesValue < 0) {
      alert("Please enter valid numbers for protein and calories");
      return;
    }

    const fullName = ingredients.trim()
      ? `${foodName.trim()} (${ingredients.trim()})`
      : foodName.trim();

    await addMealLog({
      id: Date.now().toString(),
      name: fullName,
      protein: proteinValue,
      calories: caloriesValue,
      carbs: carbsValue > 0 ? carbsValue : undefined,
      mealType,
      timestamp: new Date(),
    });

    setFoodName("");
    setIngredients("");
    setProtein("");
    setCalories("");
    setCarbs("");
    setScanResult(null);
    alert("Meal logged successfully!");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <Text style={styles.title}>Log Food</Text>

      <View style={styles.mealTypeRow}>
        {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => setMealType(type)}
            style={[
              styles.mealTypeButton,
              mealType === type && styles.mealTypeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.mealTypeText,
                mealType === type && styles.mealTypeTextActive,
              ]}
            >
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setEntryMode("manual")}
          style={[
            styles.modeButton,
            entryMode === "manual" && styles.modeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              entryMode === "manual" && styles.modeButtonTextActive,
            ]}
          >
            Manual Entry
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setEntryMode("camera")}
          style={[
            styles.modeButton,
            entryMode === "camera" && styles.modeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              entryMode === "camera" && styles.modeButtonTextActive,
            ]}
          >
            AI Camera
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setShowBiteTimer(true)}
        style={styles.biteTimerButton}
      >
        <Timer size={16} color="#008080" />
        <Text style={styles.biteTimerText}>Smart Bite Timer</Text>
      </Pressable>


      {entryMode === "camera" ? (
        <View style={styles.scanCard}>
          <Text style={styles.scanTitle}>AI Food Scanner</Text>
          <Text style={styles.scanSubtitle}>
            Take a photo of your meal for instant analysis
          </Text>

          {!isScanning && !scanResult && (
            <Pressable onPress={handleScan} style={styles.scanButton}>
              <Camera size={32} color="white" />
              <Text style={styles.scanButtonText}>Snap a Photo</Text>
            </Pressable>
          )}

          {isScanning && (
            <View style={styles.scanningContainer}>
              <Loader2 size={32} color="#008080" />
              <Text style={styles.scanningText}>Analyzing your food...</Text>
            </View>
          )}

          {scanResult && (
            <View style={styles.scanResult}>
              <Text style={styles.scanResultTitle}>AI Analysis Results</Text>
              <Text style={styles.scanResultName}>
                {scanResult.dishName || scanResult.name}
              </Text>
              {scanResult.ingredients && scanResult.ingredients.length > 0 && (
                <Text style={styles.scanResultIngredients}>
                  {scanResult.ingredients.join(", ")}
                </Text>
              )}
              <View style={styles.scanResultRow}>
                <Text style={styles.scanResultProtein}>
                  {scanResult.protein}g Protein
                </Text>
                <Text style={styles.scanResultCalories}>
                  {scanResult.calories} Cal
                </Text>
                {scanResult.carbs !== undefined && scanResult.carbs > 0 && (
                  <Text style={styles.scanResultCarbs}>
                    {scanResult.carbs}g Carbs
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setFoodName(scanResult.dishName || scanResult.name);
                  setIngredients(
                    scanResult.ingredients?.length
                      ? scanResult.ingredients.join(", ")
                      : ""
                  );
                  setProtein(scanResult.protein.toString());
                  setCalories(scanResult.calories.toString());
                  setCarbs(scanResult.carbs?.toString() || "");
                  setEntryMode("manual");
                  setScanResult(null);
                }}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Confirm & Log</Text>
              </Pressable>
              <Text style={styles.scanDisclaimer}>
                AI-generated analysis.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Manual Entry</Text>

          <View style={styles.proteinInput}>
            <Text style={styles.proteinLabel}>Protein Grams</Text>
            <View style={styles.proteinInputRow}>
              <TextInput
                style={styles.proteinInputText}
                placeholder="25"
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
              />
              <Text style={styles.proteinUnit}>g</Text>
            </View>
          </View>

          <View style={styles.macrosRow}>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Calories</Text>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInputText}
                  placeholder="180"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
                <Text style={styles.macroUnit}>kcal</Text>
              </View>
            </View>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInputText}
                  placeholder="15"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
                <Text style={styles.macroUnit}>g</Text>
              </View>
            </View>
          </View>

          <View style={styles.foodNameInput}>
            <Text style={styles.foodNameLabel}>Food Name</Text>
            <TextInput
              style={styles.foodNameTextInput}
              placeholder="e.g., Greek Yogurt"
              value={foodName}
              onChangeText={setFoodName}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
          </View>

          <View style={styles.foodNameInput}>
            <Text style={styles.foodNameLabel}>Ingredients (optional)</Text>
            <TextInput
              style={styles.foodNameTextInput}
              placeholder="e.g., Lettuce, Tomato, Pickles"
              value={ingredients}
              onChangeText={setIngredients}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
          </View>

          <Pressable onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={showBiteTimer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBiteTimer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              onPress={() => setShowBiteTimer(false)}
              style={styles.closeButton}
            >
              <X size={20} color="#64748b" />
            </Pressable>

            <Text style={styles.modalTitle}>Smart Bite Timer</Text>

            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  backgroundColor:
                    timerPhase === "chew"
                      ? "#008080"
                      : timerPhase === "swallow"
                      ? "#3b82f6"
                      : "#f97316",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.pulseText}>
                {timerPhase === "chew" && "Chew..."}
                {timerPhase === "swallow" && "Swallow"}
                {timerPhase === "wait" && "Wait..."}
              </Text>
            </Animated.View>

            <Text style={styles.pulseInstruction}>
              {timerPhase === "chew" && "Chew your food thoroughly"}
              {timerPhase === "swallow" && "Take a small swallow"}
              {timerPhase === "wait" && "Wait before next bite"}
            </Text>

            <View style={styles.phaseIndicators}>
              <View
                style={[
                  styles.phaseDot,
                  timerPhase === "chew" && styles.phaseDotActive,
                  { backgroundColor: timerPhase === "chew" ? "#008080" : "#e2e8f0" },
                ]}
              />
              <View
                style={[
                  styles.phaseDot,
                  timerPhase === "swallow" && styles.phaseDotActive,
                  {
                    backgroundColor:
                      timerPhase === "swallow" ? "#3b82f6" : "#e2e8f0",
                  },
                ]}
              />
              <View
                style={[
                  styles.phaseDot,
                  timerPhase === "wait" && styles.phaseDotActive,
                  {
                    backgroundColor: timerPhase === "wait" ? "#f97316" : "#e2e8f0",
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={() => setShowBiteTimer(false)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done Eating</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 160,
    flexGrow: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#004734",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 8,
  },

  /* meal type */
  mealTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  mealTypeButton: {
    flex: 1,
    minWidth: "22%",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF8E7",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6D8A8",
  },
  mealTypeButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B8F7A",
    textAlign: "center",
  },
  mealTypeTextActive: {
    color: "white",
  },

  /* mode */
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  modeButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8A8",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
  },
  modeButtonActive: {
    backgroundColor: "#004734",
    borderColor: "#004734",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#004734",
  },
  modeButtonTextActive: {
    color: "white",
  },

  /* bite timer */
  biteTimerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#009235",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#F1F8F4",
  },
  biteTimerText: {
    color: "#009235",
    fontWeight: "600",
  },

  /* cards */
  scanCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 16,
  },
  manualCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },

  scanTitle: {
    fontWeight: "600",
    color: "#004734",
    textAlign: "center",
  },
  scanSubtitle: {
    fontSize: 14,
    color: "#6B8F7A",
    textAlign: "center",
  },

  scanButton: {
    height: 128,
    backgroundColor: "#FF7A2F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "white",
    fontWeight: "600",
  },

  scanningContainer: {
    height: 128,
    backgroundColor: "#F1F8F4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: "#6B8F7A",
  },

  scanResult: {
    backgroundColor: "#F1F8F4",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  scanResultTitle: {
    fontWeight: "600",
    color: "#004734",
  },
  scanResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },
  scanResultIngredients: {
    fontSize: 13,
    color: "#6B8F7A",
    marginTop: 2,
  },
  scanResultRow: {
    flexDirection: "row",
    gap: 16,
  },
  scanResultProtein: {
    color: "#009235",
    fontWeight: "600",
    fontSize: 14,
  },
  scanResultCalories: {
    color: "#004734",
    fontSize: 14,
  },
  scanResultCarbs: {
    color: "#6B8F7A",
    fontSize: 14,
  },

  confirmButton: {
    width: "100%",
    backgroundColor: "#009235",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "600",
  },
  scanDisclaimer: {
    fontSize: 11,
    color: "#6B8F7A",
    marginTop: 10,
    textAlign: "center",
    fontStyle: "italic",
  },

  manualTitle: {
    fontWeight: "600",
    color: "#004734",
  },

  proteinInput: {
    backgroundColor: "#FFF3C4",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  proteinLabel: {
    fontSize: 14,
    color: "#9A6700",
    marginBottom: 8,
  },
  proteinInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proteinInputText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: "#004734",
    minWidth: 60,
  },
  proteinUnit: {
    fontSize: 16,
    color: "#9A6700",
  },

  macrosRow: {
    flexDirection: "row",
    gap: 16,
  },
  macroInput: {
    flex: 1,
    backgroundColor: "#F1F8F4",
    borderRadius: 12,
    padding: 12,
  },
  macroLabel: {
    fontSize: 12,
    color: "#6B8F7A",
    marginBottom: 4,
  },
  macroInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  macroInputText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#004734",
    flex: 1,
  },
  macroUnit: {
    fontSize: 12,
    color: "#6B8F7A",
  },

  foodNameInput: {
    gap: 8,
  },
  foodNameLabel: {
    fontSize: 14,
    color: "#004734",
  },
  foodNameTextInput: {
    borderWidth: 1,
    borderColor: "#E6D8A8",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFDF4",
    color: "#004734",
  },

  saveButton: {
    width: "100%",
    backgroundColor: "#FF7A2F",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
  },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF8E7",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 24,
  },

  pulseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pulseText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
    textTransform: "capitalize",
  },
  pulseInstruction: {
    fontSize: 14,
    color: "#6B8F7A",
    marginBottom: 16,
    textAlign: "center",
  },

  phaseIndicators: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E6D8A8",
  },
  phaseDotActive: {
    backgroundColor: "#009235",
  },

  doneButton: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E6D8A8",
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#004734",
    fontWeight: "600",
  },
});
