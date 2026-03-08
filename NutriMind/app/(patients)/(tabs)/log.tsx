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
  ActivityIndicator,
  Alert,
} from "react-native";
import { Camera, Timer, X, Loader2, Mic, Sparkles, Edit3, Check, ChevronDown, ChevronUp, Calendar } from "lucide-react-native";
import { useUser } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_BASE_URL } from "@/config/api";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type EntryMode = "manual" | "camera" | "ai";

interface ParsedFoodItem {
  food_name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AIResult {
  dishName: string;
  items: ParsedFoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  transcription?: string;
}

export default function LogMeal() {
  const { addMealLog, userProfile, setUserProfile } = useUser();
  const [mealType, setMealType] = useState<MealType>("Breakfast");
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
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
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    vitamins?: Record<string, number | string>;
    minerals?: Record<string, number | string>;
  } | null>(null);
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [foodName, setFoodName] = useState("");
  const [ingredients, setIngredients] = useState("");

  // AI / Voice state
  const [describeText, setDescribeText] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [processingLabel, setProcessingLabel] = useState("Analyzing your meal...");

  // Date & time picker — defaults to now
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  

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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voicePulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const dotAnim4 = useRef(new Animated.Value(0)).current;
  const dotAnim5 = useRef(new Animated.Value(0)).current;
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Bite timer pulse
  useEffect(() => {
    if (showBiteTimer) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [pulseAnim, showBiteTimer]);

  // Bite timer phases
  useEffect(() => {
    if (!showBiteTimer) {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
      return;
    }
    const phases: ("chew" | "swallow" | "wait")[] = ["chew", "swallow", "wait"];
    const durations = { chew: 20000, swallow: 5000, wait: 20000 };
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

  // Voice recording waveform animation
  useEffect(() => {
    if (isRecording) {
      const dots = [dotAnim1, dotAnim2, dotAnim3, dotAnim4, dotAnim5];
      const animations = dots.map((dot, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 120),
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      );
      animations.forEach((a) => a.start());

      const vp = Animated.loop(
        Animated.sequence([
          Animated.timing(voicePulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(voicePulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      vp.start();

      return () => {
        animations.forEach((a) => a.stop());
        vp.stop();
        dots.forEach((d) => d.setValue(0));
        voicePulseAnim.setValue(1);
      };
    }
  }, [isRecording, dotAnim1, dotAnim2, dotAnim3, dotAnim4, dotAnim5, voicePulseAnim]);

  // ── Camera scan ──
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
        allowsEditing: true, quality: 0.5, base64: true, allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets[0]) { setIsScanning(false); return; }
      const imageUri = result.assets[0].uri;
      const base64 = result.assets[0].base64;
      if (!base64) {
        const fileContent = await FileSystem.readAsStringAsync(imageUri, { encoding: "base64" });
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
      alert("Please complete your profile setup first.");
      setIsScanning(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`${API_BASE_URL}/api/analyze-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          userProfile: {
            surgeryDate: userProfile.surgeryDate,
            surgeryType: userProfile.surgeryType,
            hasDiabetes: userProfile.hasDiabetes,
            intolerances: userProfile.intolerances || [],
            tastePreferences: userProfile.tastePreferences,
            dislikedFoods: userProfile.dislikedFoods,
            favoriteCuisines: userProfile.favoriteCuisines || [],
          },
        }),
        signal: controller.signal,
      }).catch((fetchError: any) => {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") throw new Error("Request timed out.");
        throw new Error(`Network error: ${fetchError.message}`);
      });
      clearTimeout(timeoutId);
      if (response.status === 413) throw new Error("Image too large.");
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON (${response.status}). ${text.slice(0, 200)}`);
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      const result = await response.json();
      if (result.error) { alert(`Analysis Error: ${result.error}`); setIsScanning(false); return; }
      setIsScanning(false);
      setScanResult({
        name: result.name || "Food Item",
        dishName: result.dishName,
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : undefined,
        protein: result.protein || 0,
        calories: result.calories || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        fiber: result.fiber || 0,
        sugar: result.sugar || 0,
        sodium: result.sodium || 0,
        vitamins: result.vitamins || {},
        minerals: result.minerals || {},
      });
      if (result.recommendation && !result.isAppropriate) {
        alert(`Warning: ${result.recommendation}`);
      }
    } catch (error: any) {
      console.error("Photo analysis error:", error);
      alert(error.message || "Failed to analyze photo.");
      setIsScanning(false);
    }
  };

  // ── AI Text Processing ──
  const handleDescribeSubmit = async () => {
    if (!describeText.trim()) { alert("Please describe what you ate."); return; }
    setIsProcessingAI(true);
    setProcessingLabel("Analyzing your meal...");
    try {
      const response = await fetch(`${API_BASE_URL}/api/process-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: describeText.trim(),
          userProfile: {
            surgeryDate: userProfile?.surgeryDate,
            surgeryType: userProfile?.surgeryType,
          },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Failed to analyze meal");
      }
      const result = await response.json();
      setAiResult(result);
    } catch (error: any) {
      console.error("AI describe error:", error);
      alert(error.message || "Failed to analyze meal. Please try again.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // ── Voice Recording ──
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Microphone access is needed for voice logging.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecordingInstance(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Error", "Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recordingInstance) return;
    setIsRecording(false);
    setProcessingLabel("Transcribing audio...");
    setIsProcessingAI(true);
    setShowVoiceModal(false);

    try {
      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingInstance.getURI();
      setRecordingInstance(null);

      if (!uri) throw new Error("No recording URI");

      setProcessingLabel("Analyzing your meal...");

      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);
      formData.append("userProfile", JSON.stringify({
        surgeryDate: userProfile?.surgeryDate,
        surgeryType: userProfile?.surgeryType,
      }));

      const response = await fetch(`${API_BASE_URL}/api/process-meal`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Failed to process voice input");
      }

      const result = await response.json();
      setAiResult(result);
      if (result.transcription) {
        setDescribeText(result.transcription);
      }
    } catch (error: any) {
      console.error("Voice processing error:", error);
      Alert.alert("Error", error.message || "Failed to process voice input.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const cancelRecording = async () => {
    if (recordingInstance) {
      try {
        await recordingInstance.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {}
      setRecordingInstance(null);
    }
    setIsRecording(false);
    setShowVoiceModal(false);
  };

  // ── Edit AI result item ──
  const updateAiItem = (index: number, field: keyof ParsedFoodItem, value: string) => {
    if (!aiResult) return;
    const updated = { ...aiResult };
    const items = [...updated.items];
    items[index] = { ...items[index], [field]: field === "food_name" ? value : (parseFloat(value) || 0) };
    updated.items = items;

    let totCal = 0, totPro = 0, totCarb = 0, totFat = 0;
    for (const item of items) {
      totCal += item.calories;
      totPro += item.protein;
      totCarb += item.carbs;
      totFat += item.fat;
    }
    updated.totals = {
      calories: Math.round(totCal),
      protein: Math.round(totPro),
      carbs: Math.round(totCarb),
      fat: Math.round(totFat),
    };
    setAiResult(updated);
  };

  // ── Save Handlers ──
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
    const fullName = ingredients.trim() ? `${foodName.trim()} (${ingredients.trim()})` : foodName.trim();
    await addMealLog({
      id: Date.now().toString(),
      name: fullName,
      protein: proteinValue,
      calories: caloriesValue,
      carbs: carbsValue > 0 ? carbsValue : undefined,
      mealType,
      timestamp: selectedDateTime,
    });
    setFoodName(""); setIngredients(""); setProtein(""); setCalories(""); setCarbs("");
    setScanResult(null);
    setSelectedDateTime(new Date());
    alert("Meal logged successfully!");
  };

  const handleLogAiMeal = async () => {
    if (!aiResult || aiResult.items.length === 0) return;
    const ingredientNames = aiResult.items.map((i) => i.food_name).join(", ");
    const fullName = aiResult.dishName
      ? `${aiResult.dishName} (${ingredientNames})`
      : ingredientNames;

    await addMealLog({
      id: Date.now().toString(),
      name: fullName,
      protein: aiResult.totals.protein,
      calories: aiResult.totals.calories,
      carbs: aiResult.totals.carbs > 0 ? aiResult.totals.carbs : undefined,
      fat: aiResult.totals.fat > 0 ? aiResult.totals.fat : undefined,
      mealType,
      timestamp: selectedDateTime,
    });

    setAiResult(null);
    setDescribeText("");
    setSelectedDateTime(new Date());
    Alert.alert("Logged!", "Your meal has been logged successfully.");
  };

  // ── Render ──
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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

          {/* Date & time selector chip */}
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

          {/* Patient weight entry (self) */} 
          <View style={{marginTop:10, marginBottom:8, flexDirection:'row'}}>
            <Pressable onPress={() => setShowWeightModal(true)} style={[styles.modeButton, {backgroundColor:"#FFF8E7", paddingHorizontal:12}] }>
              <Text style={[styles.modeButtonText, {color:'#004734'}]}>Record Weight</Text>
            </Pressable>
          </View>

          {/* Patient weight modal */}
          <Modal visible={showWeightModal} transparent animationType="fade" onRequestClose={() => setShowWeightModal(false)}>
            <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center'}}>
              <View style={{width:'90%', backgroundColor:'#fff', borderRadius:12, padding:14}}>
                <Text style={{fontSize:16, fontWeight:'700', color:'#004734', marginBottom:8}}>Record Weight</Text>
                <Text style={{fontSize:13, color:'#3F5E52', marginBottom:8}}>Enter your weight (lbs)</Text>
                <View style={{backgroundColor:'#FFFDF4', borderRadius:8, padding:8, borderWidth:1, borderColor:'#D6C89A', marginBottom:8}}>
                  <TextInput keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} placeholder="Weight in lbs" placeholderTextColor="#7A9C8A" style={{fontSize:18, color:'#004734'}} />
                </View>
                {/* Measurement date removed from modal — use header date selector instead */}
                <View style={{flexDirection:'row', justifyContent:'flex-end', gap:12, marginTop:12}}>
                  <Pressable onPress={() => { setShowWeightModal(false); setWeightInput(''); }} style={{padding:8}}><Text style={{color:'#6B7280'}}>Cancel</Text></Pressable>
                  <Pressable onPress={async () => {
                    try {
                      const val = Number(weightInput);
                      if (isNaN(val)) { Alert.alert('Invalid', 'Please enter a numeric weight'); return; }
                      const user = auth.currentUser;
                      if (!user) { Alert.alert('Auth', 'Not authenticated'); return; }
                      const idToken = await user.getIdToken();
                      // normalize selected date to YYYY-MM-DD and send as `weightdate`
                      const sd = selectedDateTime || new Date();
                      const weightDateIso = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
                      const resp = await fetch(`${API_BASE_URL}/api/doctor/patient/weight`, {
                        method: 'POST',
                        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${idToken}` },
                        body: JSON.stringify({ patientId: user.uid, weight: val, weightdate: weightDateIso })
                      });
                      const j = await resp.json().catch(() => null);
                      if (!resp.ok) { Alert.alert('Error', j?.error || 'Failed to save weight'); return; }
                      // update local user profile using server-returned currentWeight (may be null for past dates)
                      setUserProfile(p => p ? { ...p, currentWeight: (j && typeof j.currentWeight !== 'undefined') ? j.currentWeight : p.currentWeight, weightDate: (j && j.updatedCurrentWeight) ? weightDateIso : p.weightDate } : p);
                      setShowWeightModal(false);
                      setWeightInput('');
                      Alert.alert('Saved', 'Weight recorded.');
                    } catch (err) {
                      console.error('save weight (patient)', err);
                      Alert.alert('Error', 'Failed to save weight');
                    }
                  }} style={{backgroundColor:'#009235', paddingHorizontal:12, paddingVertical:8, borderRadius:8}}><Text style={{color:'white', fontWeight:'700'}}>Save</Text></Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* weight date picker removed — date is selected via header date selector */}

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
                textColor="#004734"
                style={Platform.OS === "ios" ? { alignSelf: "center" } : undefined}
              />
              {Platform.OS === "ios" && (
                <Pressable onPress={() => setShowDateTimePicker(false)} style={styles.datePickerDoneButton}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Meal type pills */}
          <View style={styles.mealTypeRow}>
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => setMealType(type)}
                style={[styles.mealTypeButton, mealType === type && styles.mealTypeButtonActive]}
              >
                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Mode tabs */}
          <View style={styles.modeRow}>
            {([
              { key: "ai" as EntryMode, label: "AI Log" },
              { key: "camera" as EntryMode, label: "AI Camera" },
              { key: "manual" as EntryMode, label: "Manual" },
            ]).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => { setEntryMode(key); setAiResult(null); }}
                style={[styles.modeButton, entryMode === key && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, entryMode === key && styles.modeButtonTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Bite timer */}
          <Pressable onPress={() => setShowBiteTimer(true)} style={styles.biteTimerButton}>
            <Timer size={16} color="#008080" />
            <Text style={styles.biteTimerText}>Smart Bite Timer</Text>
          </Pressable>

          {/* ════════════ AI LOG MODE ════════════ */}
          {entryMode === "ai" && (
            <View style={styles.aiCard}>
              {!aiResult && !isProcessingAI && (
                <>
                  <Text style={styles.aiCardTitle}>Describe what you ate</Text>
                  <Text style={styles.aiCardSubtitle}>
                    Type or use voice — works in any language
                  </Text>

                  <View style={styles.describeInputRow}>
                    <TextInput
                      style={styles.describeInput}
                      placeholder="Grilled chicken with rice and veggies..."
                      placeholderTextColor="#9CB5A6"
                      value={describeText}
                      onChangeText={setDescribeText}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.aiActionRow}>
                    <Pressable onPress={() => setShowVoiceModal(true)} style={styles.voiceButton}>
                      <Mic size={20} color="#FFFDF4" />
                      <Text style={styles.voiceButtonText}>Voice Log</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDescribeSubmit}
                      style={[styles.analyzeButton, !describeText.trim() && styles.analyzeButtonDisabled]}
                      disabled={!describeText.trim()}
                    >
                      <Sparkles size={18} color="#FFFDF4" />
                      <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Processing state */}
              {isProcessingAI && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#009235" />
                  <Text style={styles.processingText}>{processingLabel}</Text>
                  <Text style={styles.processingSubtext}>This usually takes 2-4 seconds</Text>
                </View>
              )}

              {/* ── Receipt UI ── */}
              {aiResult && !isProcessingAI && (
                <View style={styles.receiptContainer}>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptTitle}>{aiResult.dishName}</Text>
                    {aiResult.transcription && (
                      <Text style={styles.receiptTranscription}>
                        "{aiResult.transcription}"
                      </Text>
                    )}
                  </View>

                  {/* Totals bar */}
                  <View style={styles.totalsRow}>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalValue}>{aiResult.totals.calories}</Text>
                      <Text style={styles.totalLabel}>Cal</Text>
                    </View>
                    <View style={styles.totalBadge}>
                      <Text style={[styles.totalValue, { color: "#009235" }]}>{aiResult.totals.protein}g</Text>
                      <Text style={styles.totalLabel}>Protein</Text>
                    </View>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalValue}>{aiResult.totals.carbs}g</Text>
                      <Text style={styles.totalLabel}>Carbs</Text>
                    </View>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalValue}>{aiResult.totals.fat}g</Text>
                      <Text style={styles.totalLabel}>Fat</Text>
                    </View>
                  </View>

                  {/* Food items list */}
                  <Text style={styles.ingredientsTitle}>Ingredients</Text>
                  {aiResult.items.map((item, index) => (
                    <View key={index} style={styles.receiptItem}>
                      <Pressable
                        style={styles.receiptItemHeader}
                        onPress={() => setEditingItemIndex(editingItemIndex === index ? null : index)}
                      >
                        <View style={styles.receiptItemLeft}>
                          <View style={styles.itemDot} />
                          <View>
                            <Text style={styles.itemName}>{item.food_name}</Text>
                            <Text style={styles.itemMeta}>
                              {item.calories} cal · {item.grams}g
                            </Text>
                          </View>
                        </View>
                        <View style={styles.receiptItemRight}>
                          <Text style={styles.itemProtein}>{item.protein}g P</Text>
                          {editingItemIndex === index
                            ? <ChevronUp size={16} color="#6B8F7A" />
                            : <ChevronDown size={16} color="#6B8F7A" />
                          }
                        </View>
                      </Pressable>

                      {/* Expandable edit row */}
                      {editingItemIndex === index && (
                        <View style={styles.editRow}>
                          <View style={styles.editField}>
                            <Text style={styles.editFieldLabel}>Cal</Text>
                            <TextInput
                              style={styles.editFieldInput}
                              value={String(item.calories)}
                              onChangeText={(v) => updateAiItem(index, "calories", v)}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editFieldLabel}>Protein</Text>
                            <TextInput
                              style={styles.editFieldInput}
                              value={String(item.protein)}
                              onChangeText={(v) => updateAiItem(index, "protein", v)}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editFieldLabel}>Carbs</Text>
                            <TextInput
                              style={styles.editFieldInput}
                              value={String(item.carbs)}
                              onChangeText={(v) => updateAiItem(index, "carbs", v)}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editFieldLabel}>Fat</Text>
                            <TextInput
                              style={styles.editFieldInput}
                              value={String(item.fat)}
                              onChangeText={(v) => updateAiItem(index, "fat", v)}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.editField}>
                            <Text style={styles.editFieldLabel}>Grams</Text>
                            <TextInput
                              style={styles.editFieldInput}
                              value={String(item.grams)}
                              onChangeText={(v) => updateAiItem(index, "grams", v)}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}

                  <Text style={styles.receiptHint}>Tap an ingredient to edit its values</Text>

                  <Pressable onPress={handleLogAiMeal} style={styles.logMealButton}>
                    <Check size={18} color="#FFFDF4" />
                    <Text style={styles.logMealButtonText}>Log Meal</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setAiResult(null); setDescribeText(""); }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </Pressable>

                  <Text style={styles.scanDisclaimer}>AI-estimated nutrition. Tap values to adjust.</Text>
                </View>
              )}
            </View>
          )}

          {/* ════════════ CAMERA MODE ════════════ */}
          {entryMode === "camera" && (
            <View style={styles.scanCard}>
              <Text style={styles.scanTitle}>AI Food Scanner</Text>
              <Text style={styles.scanSubtitle}>Take a photo of your meal for instant analysis</Text>

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
                  <Text style={styles.scanResultName}>{scanResult.dishName || scanResult.name}</Text>
                  {scanResult.ingredients && scanResult.ingredients.length > 0 && (
                    <Text style={styles.scanResultIngredients}>{scanResult.ingredients.join(", ")}</Text>
                  )}
                  <View style={styles.scanResultRow}>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientValue}>{scanResult.calories}</Text>
                      <Text style={styles.nutrientLabel}>Calories</Text>
                    </View>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientValue}>{scanResult.protein}g</Text>
                      <Text style={styles.nutrientLabel}>Protein</Text>
                    </View>
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientValue}>{scanResult.carbs || 0}g</Text>
                      <Text style={styles.nutrientLabel}>Carbs</Text>
                    </View>
                    {(scanResult.fat || 0) > 0 && (
                      <View style={styles.nutrientBadge}>
                        <Text style={styles.nutrientValue}>{scanResult.fat}g</Text>
                        <Text style={styles.nutrientLabel}>Fat</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.additionalNutrients}>
                    <Text style={styles.additionalNutrientsTitle}>Nutritional Information</Text>
                    <View style={styles.nutrientGrid}>
                      {(scanResult.fiber || 0) > 0 && (
                        <View style={styles.nutrientItem}>
                          <Text style={styles.nutrientItemLabel}>Fiber</Text>
                          <Text style={styles.nutrientItemValue}>{scanResult.fiber}g</Text>
                        </View>
                      )}
                      {(scanResult.sugar || 0) > 0 && (
                        <View style={styles.nutrientItem}>
                          <Text style={styles.nutrientItemLabel}>Sugar</Text>
                          <Text style={styles.nutrientItemValue}>{scanResult.sugar}g</Text>
                        </View>
                      )}
                      {(scanResult.sodium || 0) > 0 && (
                        <View style={styles.nutrientItem}>
                          <Text style={styles.nutrientItemLabel}>Sodium</Text>
                          <Text style={styles.nutrientItemValue}>{Math.round(scanResult.sodium!)}mg</Text>
                        </View>
                      )}
                    </View>
                    {scanResult.vitamins && Object.keys(scanResult.vitamins).length > 0 && (
                      <View style={styles.vitaminsSection}>
                        <Text style={styles.sectionLabel}>Vitamins</Text>
                        <View style={styles.nutrientGrid}>
                          {Object.entries(scanResult.vitamins).map(([key, value]) => {
                            if (!value || value === 0) return null;
                            const displayName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
                            return (
                              <View key={key} style={styles.nutrientItem}>
                                <Text style={styles.nutrientItemLabel}>{displayName}</Text>
                                <Text style={styles.nutrientItemValue}>{String(value)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                    {scanResult.minerals && Object.keys(scanResult.minerals).length > 0 && (
                      <View style={styles.mineralsSection}>
                        <Text style={styles.sectionLabel}>Minerals</Text>
                        <View style={styles.nutrientGrid}>
                          {Object.entries(scanResult.minerals).map(([key, value]) => {
                            if (!value || value === 0) return null;
                            const displayName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
                            return (
                              <View key={key} style={styles.nutrientItem}>
                                <Text style={styles.nutrientItemLabel}>{displayName}</Text>
                                <Text style={styles.nutrientItemValue}>{String(value)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={() => {
                      setFoodName(scanResult.dishName || scanResult.name);
                      setIngredients(scanResult.ingredients?.length ? scanResult.ingredients.join(", ") : "");
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
                  <Text style={styles.scanDisclaimer}>AI-generated analysis.</Text>
                </View>
              )}
            </View>
          )}

          {/* ════════════ MANUAL MODE ════════════ */}
          {entryMode === "manual" && (
            <View style={styles.manualCard}>
              <Text style={styles.manualTitle}>Manual Entry</Text>

              <View style={styles.proteinInput}>
                <Text style={styles.proteinLabel}>Protein</Text>
                <View style={styles.proteinInputRow}>
                  <TextInput
                    style={styles.proteinInputText}
                    placeholder="25"
                    placeholderTextColor="#7A9C8A"
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
                      placeholderTextColor="#7A9C8A"
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
                      placeholderTextColor="#7A9C8A"
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
                  placeholder="Hamburger"
                  placeholderTextColor="#7A9C8A"
                  value={foodName}
                  onChangeText={setFoodName}
                  onFocus={() => { setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100); }}
                />
              </View>

              <View style={styles.foodNameInput}>
                <Text style={styles.foodNameLabel}>Ingredients (Optional)</Text>
                <TextInput
                  style={styles.foodNameTextInput}
                  placeholder="Lettuce, Tomato, Pickles"
                  placeholderTextColor="#7A9C8A"
                  value={ingredients}
                  onChangeText={setIngredients}
                  onFocus={() => { setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100); }}
                />
              </View>

              <Pressable onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </Pressable>
            </View>
          )}

          {/* ════════════ BITE TIMER MODAL ════════════ */}
          <Modal visible={showBiteTimer} transparent animationType="fade" onRequestClose={() => setShowBiteTimer(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Pressable onPress={() => setShowBiteTimer(false)} style={styles.closeButton}>
                  <X size={20} color="#64748b" />
                </Pressable>
                <Text style={styles.modalTitle}>Smart Bite Timer</Text>
                <Animated.View
                  style={[
                    styles.pulseCircle,
                    {
                      backgroundColor: timerPhase === "chew" ? "#008080" : timerPhase === "swallow" ? "#3b82f6" : "#f97316",
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
                  <View style={[styles.phaseDot, timerPhase === "chew" && styles.phaseDotActive, { backgroundColor: timerPhase === "chew" ? "#008080" : "#e2e8f0" }]} />
                  <View style={[styles.phaseDot, timerPhase === "swallow" && styles.phaseDotActive, { backgroundColor: timerPhase === "swallow" ? "#3b82f6" : "#e2e8f0" }]} />
                  <View style={[styles.phaseDot, timerPhase === "wait" && styles.phaseDotActive, { backgroundColor: timerPhase === "wait" ? "#f97316" : "#e2e8f0" }]} />
                </View>
                <Pressable onPress={() => setShowBiteTimer(false)} style={styles.doneButton}>
                  <Text style={styles.doneButtonText}>Done Eating</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* ════════════ VOICE RECORDING MODAL ════════════ */}
          <Modal visible={showVoiceModal} transparent animationType="fade" onRequestClose={cancelRecording}>
            <View style={styles.voiceModalOverlay}>
              <View style={styles.voiceModalContent}>
                {!isRecording ? (
                  <>
                    <Text style={styles.voiceModalTitle}>Voice Log</Text>
                    <Text style={styles.voiceModalSubtitle}>
                      Speak in any language — we'll translate and analyze it
                    </Text>
                    <Pressable onPress={startRecording} style={styles.bigMicButton}>
                      <Mic size={48} color="#FFFDF4" />
                    </Pressable>
                    <Text style={styles.voiceModalHint}>Tap to start recording</Text>
                    <Pressable onPress={cancelRecording} style={styles.voiceCancelButton}>
                      <Text style={styles.voiceCancelText}>Cancel</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.voiceModalTitle}>Listening...</Text>
                    <Text style={styles.voiceModalSubtitle}>
                      Describe everything you ate
                    </Text>

                    {/* Waveform dots */}
                    <View style={styles.waveformContainer}>
                      {[dotAnim1, dotAnim2, dotAnim3, dotAnim4, dotAnim5].map((dot, i) => (
                        <Animated.View
                          key={i}
                          style={[
                            styles.waveformDot,
                            {
                              transform: [{
                                scaleY: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }),
                              }],
                              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                            },
                          ]}
                        />
                      ))}
                    </View>

                    <Animated.View style={{ transform: [{ scale: voicePulseAnim }] }}>
                      <Pressable onPress={stopRecordingAndProcess} style={styles.stopRecordingButton}>
                        <Check size={36} color="#FFFDF4" />
                      </Pressable>
                    </Animated.View>
                    <Text style={styles.voiceModalHint}>Tap to finish</Text>

                    <Pressable onPress={cancelRecording} style={styles.voiceCancelSmall}>
                      <X size={24} color="#6B8F7A" />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFDF4" },
  keyboardAvoid: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 160, flexGrow: 1 },

  title: { fontSize: 20, fontWeight: "600", color: "#004734", textAlign: "center", marginBottom: 8, marginTop: 8 },

  dateChip: {
    flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6,
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: "#F1F8F4", borderWidth: 1, borderColor: "#D4E8DA", marginBottom: 12,
  },
  dateChipActive: { backgroundColor: "#FFF3C4", borderColor: "#E6C85E" },
  dateChipText: { fontSize: 13, fontWeight: "500", color: "#6B8F7A" },
  dateChipTextActive: { color: "#004734", fontWeight: "600" },

  datePickerContainer: {
    backgroundColor: "#FFF8E7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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

  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  mealTypeButton: { flex: 1, minWidth: "22%", paddingHorizontal: 8, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFF8E7", alignItems: "center", borderWidth: 1, borderColor: "#E6D8A8" },
  mealTypeButtonActive: { backgroundColor: "#009235", borderColor: "#009235" },
  mealTypeText: { fontSize: 11, fontWeight: "500", color: "#6B8F7A", textAlign: "center" },
  mealTypeTextActive: { color: "white" },

  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  modeButton: { flex: 1, minWidth: "30%", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E6D8A8", alignItems: "center", backgroundColor: "#FFF8E7" },
  modeButtonActive: { backgroundColor: "#004734", borderColor: "#004734" },
  modeButtonText: { fontSize: 13, fontWeight: "500", color: "#004734" },
  modeButtonTextActive: { color: "white" },

  biteTimerButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: "#009235", borderRadius: 12, marginBottom: 16, backgroundColor: "#F1F8F4" },
  biteTimerText: { color: "#009235", fontWeight: "600" },

  // ── AI Card ──
  aiCard: { backgroundColor: "#FFF8E7", borderRadius: 16, padding: 16, marginBottom: 16 },
  aiCardTitle: { fontSize: 16, fontWeight: "600", color: "#004734", textAlign: "center", marginBottom: 4 },
  aiCardSubtitle: { fontSize: 13, color: "#6B8F7A", textAlign: "center", marginBottom: 16 },

  describeInputRow: { marginBottom: 12 },
  describeInput: {
    borderWidth: 1, borderColor: "#E6D8A8", borderRadius: 12, padding: 14, fontSize: 15,
    backgroundColor: "#FFFDF4", color: "#004734", minHeight: 80, lineHeight: 22,
  },

  aiActionRow: { flexDirection: "row", gap: 10 },
  voiceButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#004734",
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, flex: 1, justifyContent: "center",
  },
  voiceButtonText: { color: "#FFFDF4", fontWeight: "600", fontSize: 14 },
  analyzeButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FF7A2F",
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, flex: 1.2, justifyContent: "center",
  },
  analyzeButtonDisabled: { opacity: 0.5 },
  analyzeButtonText: { color: "#FFFDF4", fontWeight: "600", fontSize: 14 },

  // ── Processing ──
  processingContainer: { alignItems: "center", paddingVertical: 48, gap: 12 },
  processingText: { fontSize: 16, fontWeight: "600", color: "#004734" },
  processingSubtext: { fontSize: 13, color: "#6B8F7A" },

  // ── Receipt UI ──
  receiptContainer: { gap: 12 },
  receiptHeader: { alignItems: "center", marginBottom: 4 },
  receiptTitle: { fontSize: 18, fontWeight: "700", color: "#004734" },
  receiptTranscription: { fontSize: 13, color: "#6B8F7A", fontStyle: "italic", marginTop: 4, textAlign: "center" },

  totalsRow: { flexDirection: "row", gap: 8 },
  totalBadge: { flex: 1, backgroundColor: "#F1F8F4", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#D4E8DA" },
  totalValue: { fontSize: 18, fontWeight: "700", color: "#004734" },
  totalLabel: { fontSize: 10, color: "#6B8F7A", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  ingredientsTitle: { fontSize: 14, fontWeight: "600", color: "#004734", marginTop: 4 },

  receiptItem: { backgroundColor: "#FFFDF4", borderRadius: 12, borderWidth: 1, borderColor: "#E6D8A8", overflow: "hidden" },
  receiptItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  receiptItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#009235" },
  itemName: { fontSize: 14, fontWeight: "600", color: "#004734" },
  itemMeta: { fontSize: 12, color: "#6B8F7A", marginTop: 1 },
  receiptItemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemProtein: { fontSize: 13, fontWeight: "600", color: "#009235" },

  editRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: "#F0EADB" },
  editField: { flex: 1, minWidth: "17%" },
  editFieldLabel: { fontSize: 10, color: "#6B8F7A", marginBottom: 2 },
  editFieldInput: {
    borderWidth: 1, borderColor: "#E6D8A8", borderRadius: 8, padding: 6,
    fontSize: 14, fontWeight: "600", color: "#004734", textAlign: "center", backgroundColor: "#FFF8E7",
  },

  receiptHint: { fontSize: 12, color: "#9CB5A6", textAlign: "center", fontStyle: "italic" },

  logMealButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#009235", paddingVertical: 14, borderRadius: 14,
  },
  logMealButtonText: { color: "#FFFDF4", fontWeight: "700", fontSize: 16 },

  retryButton: { paddingVertical: 10, alignItems: "center" },
  retryButtonText: { color: "#6B8F7A", fontWeight: "500", fontSize: 14 },

  // ── Camera / Scan ──
  scanCard: { backgroundColor: "#FFF8E7", borderRadius: 16, padding: 16, gap: 16, marginBottom: 16 },
  scanTitle: { fontWeight: "600", color: "#004734", textAlign: "center" },
  scanSubtitle: { fontSize: 14, color: "#6B8F7A", textAlign: "center" },
  scanButton: { height: 128, backgroundColor: "#FF7A2F", borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  scanButtonText: { color: "white", fontWeight: "600" },
  scanningContainer: { height: 128, backgroundColor: "#F1F8F4", borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  scanningText: { fontSize: 14, color: "#6B8F7A" },

  scanResult: { backgroundColor: "#F1F8F4", borderRadius: 12, padding: 16, gap: 12 },
  scanResultTitle: { fontWeight: "600", color: "#004734" },
  scanResultName: { fontSize: 16, fontWeight: "600", color: "#004734" },
  scanResultIngredients: { fontSize: 13, color: "#6B8F7A", marginTop: 2 },
  scanResultRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  nutrientBadge: { flex: 1, minWidth: "22%", backgroundColor: "#FFFDF4", borderRadius: 8, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "#E6D8A8" },
  nutrientValue: { fontSize: 16, fontWeight: "700", color: "#004734" },
  nutrientLabel: { fontSize: 10, color: "#6B8F7A", marginTop: 2 },
  additionalNutrients: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E6D8A8" },
  additionalNutrientsTitle: { fontSize: 14, fontWeight: "600", color: "#004734", marginBottom: 8 },
  nutrientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  nutrientItem: { flex: 1, minWidth: "30%", backgroundColor: "#FFFDF4", borderRadius: 6, padding: 6, borderWidth: 1, borderColor: "#E6D8A8" },
  nutrientItemLabel: { fontSize: 10, color: "#6B8F7A", marginBottom: 2 },
  nutrientItemValue: { fontSize: 12, fontWeight: "600", color: "#004734" },
  vitaminsSection: { marginTop: 12 },
  mineralsSection: { marginTop: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#004734", marginBottom: 6 },
  confirmButton: { width: "100%", backgroundColor: "#009235", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  confirmButtonText: { color: "white", fontWeight: "600" },
  scanDisclaimer: { fontSize: 11, color: "#6B8F7A", marginTop: 10, textAlign: "center", fontStyle: "italic" },

  // ── Manual ──
  manualCard: { backgroundColor: "#FFF8E7", borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  manualTitle: { fontWeight: "600", color: "#004734" },
  proteinInput: { backgroundColor: "#FFF3C4", borderRadius: 12, padding: 16, alignItems: "center" },
  proteinLabel: { fontSize: 14, color: "#9A6700", marginBottom: 8 },
  proteinInputRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  proteinInputText: { fontSize: 32, fontWeight: "bold", textAlign: "center", color: "#004734", minWidth: 60 },
  proteinUnit: { fontSize: 16, color: "#9A6700" },
  macrosRow: { flexDirection: "row", gap: 16 },
  macroInput: { flex: 1, backgroundColor: "#F1F8F4", borderRadius: 12, padding: 12 },
  macroLabel: { fontSize: 12, color: "#6B8F7A", marginBottom: 4 },
  macroInputRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  macroInputText: { fontSize: 20, fontWeight: "600", color: "#004734", flex: 1 },
  macroUnit: { fontSize: 12, color: "#6B8F7A" },
  foodNameInput: { gap: 8 },
  foodNameLabel: { fontSize: 14, color: "#004734" },
  foodNameTextInput: { borderWidth: 1, borderColor: "#E6D8A8", borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: "#FFFDF4", color: "#004734" },
  saveButton: { width: "100%", backgroundColor: "#FF7A2F", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "700" },

  // ── Bite Timer Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF8E7", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", position: "relative" },
  closeButton: { position: "absolute", top: 16, right: 16, padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#004734", marginBottom: 24 },
  pulseCircle: { width: 160, height: 160, borderRadius: 80, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  pulseText: { color: "white", fontWeight: "bold", fontSize: 20, textTransform: "capitalize" },
  pulseInstruction: { fontSize: 14, color: "#6B8F7A", marginBottom: 16, textAlign: "center" },
  phaseIndicators: { flexDirection: "row", gap: 8, marginBottom: 24 },
  phaseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E6D8A8" },
  phaseDotActive: { backgroundColor: "#009235" },
  doneButton: { width: "100%", paddingVertical: 12, borderWidth: 1, borderColor: "#E6D8A8", borderRadius: 12, alignItems: "center" },
  doneButtonText: { color: "#004734", fontWeight: "600" },

  // ── Voice Modal ──
  voiceModalOverlay: { flex: 1, backgroundColor: "rgba(0,47,34,0.92)", alignItems: "center", justifyContent: "center", padding: 24 },
  voiceModalContent: { width: "100%", maxWidth: 360, alignItems: "center", gap: 20 },
  voiceModalTitle: { fontSize: 24, fontWeight: "700", color: "#FFFDF4" },
  voiceModalSubtitle: { fontSize: 14, color: "#9CB5A6", textAlign: "center", lineHeight: 20 },
  bigMicButton: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: "#009235",
    alignItems: "center", justifyContent: "center", marginVertical: 16,
    shadowColor: "#009235", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
  },
  voiceModalHint: { fontSize: 13, color: "#6B8F7A" },
  voiceCancelButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, borderColor: "#3F5E52", marginTop: 8 },
  voiceCancelText: { color: "#9CB5A6", fontWeight: "500" },

  waveformContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 60, marginVertical: 12 },
  waveformDot: { width: 6, height: 24, borderRadius: 3, backgroundColor: "#009235" },

  stopRecordingButton: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#FF7A2F",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7A2F", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16,
  },
  voiceCancelSmall: { position: "absolute", bottom: 0, left: 24, padding: 12 },
});
