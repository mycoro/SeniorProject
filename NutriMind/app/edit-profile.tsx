import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ChevronLeft, Calendar, Pill, Target, Leaf } from "lucide-react-native";
import { router } from "expo-router";
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { updateProfile } from "firebase/auth";
import { setUserProfile as saveUserProfile } from "@/config/users";

const surgeryTypes = ["Gastric Sleeve", "Gastric Bypass", "Duodenal Switch"] as const;
const intoleranceOptions = ["Lactose", "Gluten", "Red Meat", "Eggs"];
const cuisineOptions = ["Mexican", "Italian", "Asian", "American", "Mediterranean", "Indian"];
const defaultTastePreferences = { sweet: 3, spicy: 3, savory: 3, bitter: 3, sour: 3 };

function formatDateUS(date: Date | string) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseUSDate(dateString: string) {
  if (!dateString) return null;
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDobDisplay(isoDate: string) {
  if (!isoDate || isoDate.length < 10) return "";
  const parsed = new Date(isoDate.slice(0, 10));
  if (isNaN(parsed.getTime())) return "";
  return formatDateUS(parsed);
}

export default function EditProfile() {
  const { userProfile: existingProfile, setUserProfile, setIsOnboarded } = useUser();
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    dateOfBirth: "",
    isPreOp: false,
    surgeryDate: "",
    surgeryType: "Gastric Sleeve",
    hasDiabetes: false,
    hasDumpingSyndrome: false,
    intolerances: [],
    tastePreferences: defaultTastePreferences,
    dislikedFoods: "",
    favoriteCuisines: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [tempDobDate, setTempDobDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    return d;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existingProfile) return;
    const rawDate = existingProfile.surgeryDate ?? "";
    const formattedDate = rawDate && rawDate.includes("/")
      ? rawDate
      : rawDate ? formatDateUS(new Date(rawDate)) : "";
    const parsed = formattedDate ? parseUSDate(formattedDate) : null;
    const dobRaw = (existingProfile as UserProfile).dateOfBirth ?? "";
    const dobParsed = dobRaw && dobRaw.length >= 10 ? new Date(dobRaw.slice(0, 10)) : null;
    if (dobParsed && !isNaN(dobParsed.getTime())) setTempDobDate(dobParsed);

    setProfile({
      name: existingProfile.name || "",
      dateOfBirth: dobRaw,
      isPreOp: existingProfile.isPreOp ?? false,
      surgeryDate: formattedDate,
      surgeryType: (existingProfile.surgeryType as "Gastric Sleeve" | "Gastric Bypass" | "Duodenal Switch") || "Gastric Sleeve",
      hasDiabetes: existingProfile.hasDiabetes ?? false,
      hasDumpingSyndrome: existingProfile.hasDumpingSyndrome ?? false,
      intolerances: existingProfile.intolerances ?? [],
      proteinGoal: existingProfile.proteinGoal,
      fluidGoal: existingProfile.fluidGoal,
      calorieGoal: existingProfile.calorieGoal,
      tastePreferences: existingProfile.tastePreferences ?? defaultTastePreferences,
      dislikedFoods: existingProfile.dislikedFoods ?? "",
      favoriteCuisines: existingProfile.favoriteCuisines ?? [],
    });
    if (parsed) setTempDate(parsed);
  }, [existingProfile]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        setTempDate(selectedDate);
        setProfile((p) => ({ ...p, surgeryDate: formatDateUS(selectedDate) }));
      }
    } else if (Platform.OS === "ios" && selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleDateTextChange = (text: string) => {
    setProfile((p) => ({ ...p, surgeryDate: text }));
    const parsed = parseUSDate(text);
    if (parsed) setTempDate(parsed);
  };

  const toggleIntolerance = (intolerance: string) => {
    setProfile((prev) => {
      const list = prev.intolerances ?? [];
      return {
        ...prev,
        intolerances: list.includes(intolerance)
          ? list.filter((i) => i !== intolerance)
          : [...list, intolerance],
      };
    });
  };

  const handleDone = async () => {
    const nameStr = profile.name?.trim();
    if (!nameStr) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    if (!profile.surgeryDate) {
      Alert.alert("Required", "Please enter your surgery date.");
      return;
    }
    const parsed = parseUSDate(profile.surgeryDate ?? "");
    if (!parsed) {
      Alert.alert("Invalid Date", "Please enter a valid date in MM/DD/YYYY format.");
      return;
    }
    if (!profile.surgeryType) {
      Alert.alert("Required", "Please select your surgery type.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save.");
      return;
    }

    setSaving(true);
    try {
      const isoDate = parsed.toISOString().split("T")[0];
      try {
        await updateProfile(user, { displayName: nameStr });
      } catch (_) {}

      const dobIso = (profile.dateOfBirth ?? "").trim().slice(0, 10);
      const hasValidDob = dobIso.length === 10 && !isNaN(new Date(dobIso).getTime());

      await saveUserProfile(user.uid, {
        name: nameStr,
        dateOfBirth: hasValidDob ? dobIso : undefined,
        isPreOp: profile.isPreOp,
        surgeryDate: isoDate,
        surgeryType: profile.surgeryType,
        hasDiabetes: profile.hasDiabetes,
        hasDumpingSyndrome: profile.hasDumpingSyndrome,
        intolerances: profile.intolerances ?? [],
        proteinGoal: profile.proteinGoal,
        fluidGoal: profile.fluidGoal,
        calorieGoal: profile.calorieGoal,
        tastePreferences: profile.tastePreferences ?? defaultTastePreferences,
        dislikedFoods: profile.dislikedFoods ?? "",
        favoriteCuisines: profile.favoriteCuisines ?? [],
      });

      setUserProfile({
        ...existingProfile,
        name: nameStr,
        dateOfBirth: hasValidDob ? dobIso : undefined,
        isPreOp: profile.isPreOp,
        surgeryDate: isoDate,
        surgeryType: profile.surgeryType,
        hasDiabetes: profile.hasDiabetes,
        hasDumpingSyndrome: profile.hasDumpingSyndrome,
        intolerances: profile.intolerances ?? [],
        proteinGoal: profile.proteinGoal,
        fluidGoal: profile.fluidGoal,
        calorieGoal: profile.calorieGoal,
        tastePreferences: profile.tastePreferences ?? defaultTastePreferences,
        dislikedFoods: profile.dislikedFoods ?? "",
        favoriteCuisines: profile.favoriteCuisines ?? [],
      } as UserProfile);
      setIsOnboarded(true);

      router.back();
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tasteKeys = ["sweet", "spicy", "savory", "bitter", "sour"] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backTouch}>
          <ChevronLeft size={24} color="white" />
          <Text style={styles.headerBackText}>Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Leaf size={22} color="white" />
          </View>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Surgery Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Calendar size={20} color="#008080" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Surgery Details</Text>
              <Text style={styles.cardSubtitle}>Name, date & procedure</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Alex"
              value={profile.name || ""}
              onChangeText={(text) => setProfile((p) => ({ ...p, name: text }))}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date of Birth</Text>
            <Pressable onPress={() => { if (profile.dateOfBirth) { const d = new Date(profile.dateOfBirth.slice(0, 10)); if (!isNaN(d.getTime())) setTempDobDate(d); } setShowDobPicker(true); }} style={styles.dateInputContainer}>
              <TextInput
                placeholder="Tap to select (for age-based advice)"
                value={profile.dateOfBirth ? formatDobDisplay(profile.dateOfBirth) : ""}
                editable={false}
                style={styles.textInput}
              />
              <Calendar size={20} color="#008080" />
            </Pressable>
            {showDobPicker && (
              <>
                {Platform.OS === "ios" && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Pressable onPress={() => setShowDobPicker(false)} style={styles.datePickerCancel}>
                        <Text style={styles.datePickerCancelText}>Cancel</Text>
                      </Pressable>
                      <Text style={styles.datePickerTitle}>Date of Birth</Text>
                      <Pressable
                        onPress={() => {
                          setProfile((p) => ({ ...p, dateOfBirth: toISODate(tempDobDate) }));
                          setShowDobPicker(false);
                        }}
                        style={styles.datePickerDone}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={tempDobDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => d && setTempDobDate(d)}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      textColor="#1e293b"
                    />
                  </View>
                )}
                {Platform.OS === "android" && (
                  <DateTimePicker
                    value={tempDobDate}
                    mode="date"
                    display="default"
                    onChange={(_, selectedDate) => {
                      setShowDobPicker(false);
                      if (selectedDate) setProfile((p) => ({ ...p, dateOfBirth: toISODate(selectedDate) }));
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pre-Op or Post-Op?</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, isPreOp: false }))}
                style={[styles.toggleButton, !profile.isPreOp && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, !profile.isPreOp && styles.toggleButtonTextActive]}>Post-Op</Text>
              </Pressable>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, isPreOp: true }))}
                style={[styles.toggleButton, profile.isPreOp && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, profile.isPreOp && styles.toggleButtonTextActive]}>Pre-Op</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Surgery Date</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateInputContainer}>
              <TextInput
                placeholder="MM/DD/YYYY"
                value={profile.surgeryDate ?? ""}
                onChangeText={handleDateTextChange}
                style={styles.textInput}
                editable
                keyboardType="numeric"
                maxLength={10}
              />
              <Calendar size={20} color="#008080" />
            </Pressable>
            {showDatePicker && (
              <>
                {Platform.OS === "ios" && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerCancel}>
                        <Text style={styles.datePickerCancelText}>Cancel</Text>
                      </Pressable>
                      <Text style={styles.datePickerTitle}>Select Date</Text>
                      <Pressable
                        onPress={() => {
                          const formatted = formatDateUS(tempDate);
                          setProfile((p) => ({ ...p, surgeryDate: formatted }));
                          setShowDatePicker(false);
                        }}
                        style={styles.datePickerDone}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      minimumDate={profile.isPreOp ? new Date() : undefined}
                      maximumDate={profile.isPreOp ? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) : new Date()}
                      textColor="#1e293b"
                    />
                  </View>
                )}
                {Platform.OS === "android" && (
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={profile.isPreOp ? new Date() : undefined}
                    maximumDate={profile.isPreOp ? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) : new Date()}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Surgery Type</Text>
            <View style={styles.optionsList}>
              {surgeryTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setProfile((p) => ({ ...p, surgeryType: type }))}
                  style={[styles.optionButton, profile.surgeryType === type && styles.optionButtonActive]}
                >
                  <Text style={[styles.optionButtonText, profile.surgeryType === type && styles.optionButtonTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Medical Risks */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Pill size={20} color="#008080" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Medical & Intolerances</Text>
              <Text style={styles.cardSubtitle}>For personalized guidance</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Do you have Diabetes?</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, hasDiabetes: true }))}
                style={[styles.toggleButton, profile.hasDiabetes && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, profile.hasDiabetes && styles.toggleButtonTextActive]}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, hasDiabetes: false }))}
                style={[styles.toggleButton, !profile.hasDiabetes && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, !profile.hasDiabetes && styles.toggleButtonTextActive]}>No</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Dumping Syndrome?</Text>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, hasDumpingSyndrome: true }))}
                style={[styles.toggleButton, profile.hasDumpingSyndrome && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, profile.hasDumpingSyndrome && styles.toggleButtonTextActive]}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => setProfile((p) => ({ ...p, hasDumpingSyndrome: false }))}
                style={[styles.toggleButton, !profile.hasDumpingSyndrome && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleButtonText, !profile.hasDumpingSyndrome && styles.toggleButtonTextActive]}>No</Text>
              </Pressable>
            </View>
            <Text style={styles.helpText}>Helps us customize food recommendations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Food Intolerances (select all that apply)</Text>
            <View style={styles.intoleranceRow}>
              {intoleranceOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => toggleIntolerance(item)}
                  style={[styles.intoleranceButton, (profile.intolerances ?? []).includes(item) && styles.intoleranceButtonActive]}
                >
                  <Text style={[styles.intoleranceButtonText, (profile.intolerances ?? []).includes(item) && styles.intoleranceButtonTextActive]}>
                    {(profile.intolerances ?? []).includes(item) && "✓ "}{item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Food Preferences */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Target size={20} color="#008080" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Food Preferences</Text>
              <Text style={styles.cardSubtitle}>Taste & cuisines</Text>
            </View>
          </View>

          {tasteKeys.map((key) => (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionLabel}>{key.charAt(0).toUpperCase() + key.slice(1)} (1–5)</Text>
              <View style={styles.toggleRow}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() =>
                      setProfile((p) => ({
                        ...p,
                        tastePreferences: { ...(p.tastePreferences ?? defaultTastePreferences), [key]: num },
                      }))
                    }
                    style={[
                      styles.intoleranceButton,
                      (profile.tastePreferences ?? defaultTastePreferences)[key] === num && styles.intoleranceButtonActive,
                    ]}
                  >
                    <Text style={styles.intoleranceButtonText}>{num}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Foods you dislike</Text>
            <TextInput
              placeholder="e.g. mushrooms, seafood..."
              value={profile.dislikedFoods ?? ""}
              onChangeText={(text) => setProfile((p) => ({ ...p, dislikedFoods: text }))}
              style={styles.textInput}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Favorite cuisines (select all that apply)</Text>
            <View style={styles.intoleranceRow}>
              {cuisineOptions.map((cuisine) => {
                const selected = (profile.favoriteCuisines ?? []).includes(cuisine);
                return (
                  <Pressable
                    key={cuisine}
                    onPress={() => {
                      const current = profile.favoriteCuisines ?? [];
                      setProfile((p) => ({
                        ...p,
                        favoriteCuisines: selected ? current.filter((c) => c !== cuisine) : [...current, cuisine],
                      }));
                    }}
                    style={[styles.intoleranceButton, selected && styles.intoleranceButtonActive]}
                  >
                    <Text style={[styles.intoleranceButtonText, selected && styles.intoleranceButtonTextActive]}>
                      {selected && "✓ "}{cuisine}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Daily Goals */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Target size={20} color="#008080" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Daily Goals</Text>
              <Text style={styles.cardSubtitle}>Protein, fluid & calories</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Protein goal (g/day)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 60"
              value={profile.proteinGoal != null ? String(profile.proteinGoal) : ""}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                setProfile((p) => ({ ...p, proteinGoal: text === "" ? undefined : isNaN(n) ? p.proteinGoal : n }));
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fluid goal (oz/day)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 64"
              value={profile.fluidGoal != null ? String(profile.fluidGoal) : ""}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                setProfile((p) => ({ ...p, fluidGoal: text === "" ? undefined : isNaN(n) ? p.fluidGoal : n }));
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Calorie goal (cal/day)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 800"
              value={profile.calorieGoal != null ? String(profile.calorieGoal) : ""}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                setProfile((p) => ({ ...p, calorieGoal: text === "" ? undefined : isNaN(n) ? p.calorieGoal : n }));
              }}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleDone}
          style={[styles.doneButton, saving && styles.doneButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.doneButtonText}>Done</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#004734",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backTouch: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  headerBackText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#009235",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "700",
    color: "white",
    fontSize: 18,
  },
  headerRight: {
    width: 80,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 24,
  },
  footerSpacer: {
    height: 20,
  },

  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    gap: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#009235",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontWeight: "700",
    color: "#004734",
    fontSize: 18,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#3F5E52",
    marginTop: 2,
  },

  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    color: "#004734",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    alignItems: "center",
    backgroundColor: "#FFFDF4",
  },
  toggleButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#004734",
  },
  toggleButtonTextActive: {
    color: "white",
  },

  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 16,
    paddingRight: 14,
    backgroundColor: "#FFFDF4",
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#004734",
  },

  optionsList: {
    gap: 10,
  },
  optionButton: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    backgroundColor: "#FFFDF4",
  },
  optionButtonActive: {
    borderColor: "#009235",
    backgroundColor: "#009235",
  },
  optionButtonText: {
    fontWeight: "600",
    color: "#004734",
    fontSize: 15,
  },
  optionButtonTextActive: {
    color: "white",
    fontWeight: "700",
  },

  helpText: {
    fontSize: 13,
    color: "#3F5E52",
    marginTop: 6,
  },

  intoleranceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  intoleranceButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#E6DDC8",
  },
  intoleranceButtonActive: {
    backgroundColor: "#FFB703",
    borderColor: "#FFB703",
  },
  intoleranceButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004734",
  },
  intoleranceButtonTextActive: {
    color: "#004734",
  },

  datePickerContainer: {
    backgroundColor: "#FFFDF4",
    borderRadius: 20,
    marginTop: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6DDC8",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E6DDC8",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#004734",
  },
  datePickerCancel: { padding: 6 },
  datePickerDone: { padding: 6 },
  datePickerCancelText: {
    fontSize: 16,
    color: "#3F5E52",
    fontWeight: "600",
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#009235",
  },

  footer: {
    padding: 18,
    backgroundColor: "#FFFDF4",
    borderTopWidth: 1,
    borderTopColor: "#E6DDC8",
  },
  doneButton: {
    backgroundColor: "#009235",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 18,
  },
});
