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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  Calendar,
  Pill,
  Target,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Clipboard from 'expo-clipboard';
import UserTypeSelector from "@/components/UserTypeSelector";
import OnboardingFooter from "../components/OnboardingFooter";
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";
import { updateProfile } from "firebase/auth";
import { setUserProfile as saveUserProfile } from "@/config/users";

const surgeryTypes = ["Gastric Sleeve", "Gastric Bypass", "Duodenal Switch"];
const intoleranceOptions = ["Lactose", "Gluten", "Red Meat", "Eggs"];
const cuisineOptions = ["Mexican", "Italian", "Asian", "American", "Mediterranean", "Indian"];
const defaultTastePreferences = { sweet: 3, spicy: 3, savory: 3, bitter: 3, sour: 3 };

export default function Onboarding() {
  const { userProfile: existingProfile, setUserProfile, setIsOnboarded } = useUser();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<'patient' | 'doctor' | null>(null);

  useEffect(() => {
    console.log('Onboarding mounted — step:', step, 'userType:', userType);
  }, [step, userType]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const formatDateUS = (date: Date | string) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const parseUSDate = (dateString: string) => {
    if (!dateString) return null;
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length !== 3) return null;
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return null;
      return date;
    } else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date;
    }
  };

  const toISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDobDisplay = (isoDate: string) => {
    if (!isoDate || isoDate.length < 10) return "";
    const parsed = new Date(isoDate.slice(0, 10));
    if (isNaN(parsed.getTime())) return "";
    return formatDateUS(parsed);
  };
  
  const getInitialProfile = (): UserProfile => {
    if (existingProfile && existingProfile.surgeryDate) {
      const rawDate = existingProfile.surgeryDate ?? "";
      const formattedDate = rawDate.includes("/")
          ? rawDate
          : formatDateUS(new Date(rawDate));
      return {
        name: existingProfile.name || "",
        dateOfBirth: (existingProfile as UserProfile).dateOfBirth ?? "",
        isPreOp: existingProfile.isPreOp ?? false,
        surgeryDate: formattedDate,
        surgeryType: existingProfile.surgeryType || "Gastric Sleeve",
        hasDiabetes: existingProfile.hasDiabetes ?? false,
        hasDumpingSyndrome: existingProfile.hasDumpingSyndrome ?? false,
        intolerances: existingProfile.intolerances ?? [],
        proteinGoal: existingProfile.proteinGoal,
        fluidGoal: existingProfile.fluidGoal,
        calorieGoal: existingProfile.calorieGoal,
      };
    }
    return {
      name: existingProfile?.name || "",
      dateOfBirth: (existingProfile as UserProfile)?.dateOfBirth ?? "",
      isPreOp: false,
      surgeryDate: "",
      surgeryType: "Gastric Sleeve",
      hasDiabetes: false,
      hasDumpingSyndrome: false,
      intolerances: [],
      tastePreferences: defaultTastePreferences,
      dislikedFoods: "",
      favoriteCuisines: [],
    };
  };

  const [profile, setProfile] = useState<UserProfile>(getInitialProfile());
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [tempDobDate, setTempDobDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    return d;
  });

  useEffect(() => {
    if (existingProfile && existingProfile.surgeryDate) {
      const rawDate = existingProfile.surgeryDate ?? "";
      const formattedDate = rawDate.includes("/")
        ? rawDate
        : formatDateUS(new Date(rawDate));

      setProfile({
        name: existingProfile.name || "",
        isPreOp: existingProfile.isPreOp ?? false,
        surgeryDate: formattedDate,
        surgeryType: existingProfile.surgeryType || "Gastric Sleeve",
        hasDiabetes: existingProfile.hasDiabetes ?? false,
        hasDumpingSyndrome: existingProfile.hasDumpingSyndrome ?? false,
        intolerances: existingProfile.intolerances ?? [],
        proteinGoal: existingProfile.proteinGoal,
        fluidGoal: existingProfile.fluidGoal,
        calorieGoal: existingProfile.calorieGoal,
      });
      if (formattedDate) {
        const parsed = parseUSDate(formattedDate);
        if (parsed) {
          setTempDate(parsed);
        }
      }
    }
  }, [existingProfile]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        setTempDate(selectedDate);
        const formatted = formatDateUS(selectedDate);
        setProfile({ ...profile, surgeryDate: formatted });
      }
    } else if (Platform.OS === "ios") {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleDateTextChange = (text: string) => {
    setProfile({ ...profile, surgeryDate: text });
    const parsed = parseUSDate(text);
    if (parsed) {
      setTempDate(parsed);
    }
  };

  const handleNext = async () => {
    // User type selection
    if (step === 0) {
      if (!userType) {
        Alert.alert("Required", "Please select whether you're a patient or doctor.");
        return;
      }
      // If doctor, redirect to doctor onboarding
      if (userType === "doctor") {
        router.replace("/doctorOnboarding");
        return;
      }
      // Otherwise continue to patient onboarding
      setStep(1);
      return;
    }
    if (step === 1) {
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
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      const user = auth.currentUser;
      if (user) {
        try {
          const surgeryDateStr = profile.surgeryDate ?? "";
          const parsedDate = parseUSDate(surgeryDateStr);
          const isoDate = parsedDate ? parsedDate.toISOString().split("T")[0] : profile.surgeryDate ?? "";
          
          const nameStr = profile.name?.trim() || existingProfile?.name?.trim();
          if (nameStr) {
            try {
              await updateProfile(user, { displayName: nameStr as string });
            } catch (_) {}
          }
          const dobIso = (profile.dateOfBirth ?? "").trim().slice(0, 10);
          const hasValidDob = dobIso.length === 10 && !isNaN(new Date(dobIso).getTime());

          await saveUserProfile(user.uid, {
            name: nameStr || undefined,
            dateOfBirth: hasValidDob ? dobIso : undefined,
            isPreOp: profile.isPreOp,
            surgeryDate: isoDate,
            surgeryType: profile.surgeryType,
            hasDiabetes: profile.hasDiabetes,
            hasDumpingSyndrome: profile.hasDumpingSyndrome,
            intolerances: profile.intolerances ?? [],
            tastePreferences: profile.tastePreferences ?? defaultTastePreferences,
            dislikedFoods: profile.dislikedFoods ?? "",
            favoriteCuisines: profile.favoriteCuisines ?? [],
          });

          setUserProfile({ ...profile, dateOfBirth: hasValidDob ? dobIso : undefined } as UserProfile);
          setIsOnboarded(true);
          router.replace("/(tabs)/dashboard");
        } catch (error) {
          console.error("Error saving profile:", error);
          Alert.alert("Error", "Failed to save profile. Please try again.");
        }
      } else {
        Alert.alert("Error", "You must be logged in to complete setup.");
        router.replace("/auth");
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Invite code (optional for patients)
  const [inviteCodeInput, setInviteCodeInput] = useState<string>("");
  const [inviteApplying, setInviteApplying] = useState(false);
  const [inviteApplied, setInviteApplied] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const handleApplyInvite = async () => {
    const code = (inviteCodeInput || "").trim();
    if (!code) {
      setInviteMessage("Enter a code to verify (optional).");
      return;
    }
    setInviteApplying(true);
    setInviteMessage(null);
    try {
      // Verify code first
      const v = await fetch(`${API_BASE_URL}/api/invites/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });
      const jv = await v.json();
      if (!v.ok || !jv?.inviteId) {
        setInviteMessage(jv?.error || "Invalid invite code");
        setInviteApplying(false);
        return;
      }

      const inviteId = jv.inviteId;

      // Claim invite using current user's ID token
      const user = auth.currentUser;
      if (!user) {
        setInviteMessage("You must be signed in to claim an invite.");
        setInviteApplying(false);
        return;
      }
      const idToken = await user.getIdToken();
      const r = await fetch(`${API_BASE_URL}/api/invites/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ inviteId }),
      });
      const jr = await r.json();
      if (!r.ok) {
        setInviteMessage(jr?.error || "Failed to claim invite");
        setInviteApplying(false);
        return;
      }

      // Refresh token to pick up any server-side claims
      try {
        await user.getIdToken(true);
      } catch (e) {
        console.warn("Failed to refresh ID token after claiming invite", e);
      }

      setInviteApplied(true);
      setInviteMessage("Invite applied successfully.");
    } catch (err: any) {
      console.error("Invite apply error:", err);
      setInviteMessage(err?.message || "Failed to apply invite");
    } finally {
      setInviteApplying(false);
    }
  };

  const handleSkipInvite = () => {
    setInviteCodeInput("");
    setInviteApplying(false);
    setInviteApplied(false);
    setInviteMessage(null);
    // Advance to the next onboarding step when skipping
    setStep((s) => Math.min(s + 1, 3));
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setInviteCodeInput(text.trim());
        setInviteMessage(null);
      } else {
        Alert.alert('Clipboard empty', 'No text found in clipboard');
      }
    } catch (e) {
      console.error('Clipboard read error', e);
      Alert.alert('Error', 'Failed to read clipboard');
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Leaf size={24} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>NutriMind Setup</Text>
                  <Text style={styles.headerSubtitle}>{step === 0 ? 'Account Type' : `Step ${step} of 3`}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Calendar size={20} color="#008080" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Surgery Details</Text>
                <Text style={styles.cardSubtitle}>Tell us about your procedure</Text>
              </View>
            </View>

            {/* Optional invite code for patients */}
            {userType !== "doctor" && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Invitation Code (optional)</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TextInput
                    placeholder="Enter code"
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                    style={[styles.textInput, { flex: 1 }]}
                    autoCapitalize="characters"
                    editable={!inviteApplying && !inviteApplied}
                  />
                  <Pressable
                    onPress={handlePasteFromClipboard}
                    style={[styles.backButton, { paddingHorizontal: 12, paddingVertical: 10 }]}
                  >
                    <Text style={styles.backButtonText}>Paste</Text>
                  </Pressable>
                  
                  <Pressable      
                    onPress={handleApplyInvite}
                    style={[styles.nextButton, { paddingHorizontal: 12, paddingVertical: 10 }]}
                    disabled={inviteApplying || inviteApplied}
                  >
                    <Text style={styles.nextButtonText}>{inviteApplied ? "Applied" : "Apply"}</Text>
                  </Pressable>
                </View>
                {inviteMessage ? (
                  <Text style={{ marginTop: 8, color: inviteApplied ? "#0f5132" : "#b02a37" }}>{inviteMessage}</Text>
                ) : null}
              </View>
            )}

            {!existingProfile?.name?.trim() && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Your name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex"
                  value={profile.name || ""}
                  onChangeText={(text) => setProfile({ ...profile, name: text })}
                  autoCapitalize="words"
                />
              </View>
            )}
            {existingProfile?.name?.trim() && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Name</Text>
                <Text style={styles.nameDisplay}>{existingProfile.name}</Text>
                <Text style={styles.nameHint}>Set during sign up. You can change it later in Settings.</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Date of Birth</Text>
              <Pressable
                onPress={() => {
                  if (profile.dateOfBirth && profile.dateOfBirth.length >= 10) {
                    const d = new Date(profile.dateOfBirth.slice(0, 10));
                    if (!isNaN(d.getTime())) setTempDobDate(d);
                  }
                  setShowDobPicker(true);
                }}
                style={styles.dateInputContainer}
              >
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
                            setProfile({ ...profile, dateOfBirth: toISODate(tempDobDate) });
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
                        if (selectedDate) setProfile({ ...profile, dateOfBirth: toISODate(selectedDate) });
                      }}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Name</Text>
              <TextInput
                placeholder="Enter your preferred name"
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                style={styles.textInput}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Are you Pre-Op or Post-Op?</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setProfile({ ...profile, isPreOp: false })}
                  style={[
                    styles.toggleButton,
                    !profile.isPreOp && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !profile.isPreOp && styles.toggleButtonTextActive,
                    ]}
                  >
                    Post-Op
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProfile({ ...profile, isPreOp: true })}
                  style={[
                    styles.toggleButton,
                    profile.isPreOp && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      profile.isPreOp && styles.toggleButtonTextActive,
                    ]}
                  >
                    Pre-Op
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Surgery Date</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInputContainer}
              >
                <TextInput
                  placeholder="MM/DD/YYYY"
                  value={profile.surgeryDate}
                  onChangeText={handleDateTextChange}
                  style={styles.textInput}
                  editable={true}
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
                        <Pressable
                          onPress={() => {
                            setShowDatePicker(false);
                          }}
                          style={styles.datePickerCancel}
                        >
                          <Text style={styles.datePickerCancelText}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.datePickerTitle}>Select Date</Text>
                        <Pressable
                          onPress={() => {
                            if (tempDate) {
                              const formatted = formatDateUS(tempDate);
                              setProfile({ ...profile, surgeryDate: formatted });
                            }
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
                    onPress={() =>
                      setProfile({ ...profile, surgeryType: type as any })
                    }
                    style={[
                      styles.optionButton,
                      profile.surgeryType === type && styles.optionButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        profile.surgeryType === type && styles.optionButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 0 && (
          <UserTypeSelector userType={userType} setUserType={setUserType} />
        )}

        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Pill size={20} color="#008080" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Medical Risks</Text>
                <Text style={styles.cardSubtitle}>
                  Important for personalized guidance
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Do you have Diabetes?</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setProfile({ ...profile, hasDiabetes: true })}
                  style={[
                    styles.toggleButton,
                    profile.hasDiabetes && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      profile.hasDiabetes && styles.toggleButtonTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProfile({ ...profile, hasDiabetes: false })}
                  style={[
                    styles.toggleButton,
                    !profile.hasDiabetes && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !profile.hasDiabetes && styles.toggleButtonTextActive,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Do you suffer from Dumping Syndrome?
              </Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() =>
                    setProfile({ ...profile, hasDumpingSyndrome: true })
                  }
                  style={[
                    styles.toggleButton,
                    profile.hasDumpingSyndrome && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      profile.hasDumpingSyndrome && styles.toggleButtonTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setProfile({ ...profile, hasDumpingSyndrome: false })
                  }
                  style={[
                    styles.toggleButton,
                    !profile.hasDumpingSyndrome && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !profile.hasDumpingSyndrome && styles.toggleButtonTextActive,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helpText}>
                This helps us customize food recommendations
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Food Intolerances (select all that apply)
              </Text>
              <View style={styles.intoleranceRow}>
                {intoleranceOptions.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => toggleIntolerance(item)}
                    style={[
                      styles.intoleranceButton,
                      (profile.intolerances ?? []).includes(item) &&
                        styles.intoleranceButtonActive,
                    ]}

                  >
                    <Text
                      style={[
                        styles.intoleranceButtonText,
                        (profile.intolerances ?? []).includes(item) &&
                          styles.intoleranceButtonTextActive,
                      ]}

                    >
                      {(profile.intolerances ?? []).includes(item) && "✓ "}
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Target size={20} color="#008080" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Food Preferences</Text>
                <Text style={styles.cardSubtitle}>Help us personalize your meals</Text>
              </View>
            </View>

            {(["sweet", "spicy", "savory", "bitter", "sour"] as const).map((key) => (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} Preference (1–5)
                </Text>
                <View style={styles.toggleRow}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Pressable
                      key={num}
                      onPress={() =>
                        setProfile({
                          ...profile,
                          tastePreferences: {
                            ...(profile.tastePreferences ?? defaultTastePreferences),
                            [key]: num,
                          },
                        })
                      }
                      style={[
                        styles.intoleranceButton,
                        (profile.tastePreferences ?? defaultTastePreferences)[key] === num &&
                          styles.intoleranceButtonActive,
                      ]}
                    >
                      <Text style={styles.intoleranceButtonText}>{num}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Foods you Dislike</Text>
              <TextInput
                placeholder="e.g. mushrooms, seafood..."
                value={profile.dislikedFoods ?? ""}
                onChangeText={(text) =>
                  setProfile({ ...profile, dislikedFoods: text })
                }
                style={styles.textInput}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Favorite Cuisines (select all that apply)
              </Text>
              <View style={styles.intoleranceRow}>
                {cuisineOptions.map((cuisine) => (
                  <Pressable
                    key={cuisine}
                    onPress={() => {
                      const current = profile.favoriteCuisines ?? [];
                      setProfile({
                        ...profile,
                        favoriteCuisines: current.includes(cuisine)
                          ? current.filter((c) => c !== cuisine)
                          : [...current, cuisine],
                      });
                    }}
                    style={[
                      styles.intoleranceButton,
                      (profile.favoriteCuisines ?? []).includes(cuisine) &&
                        styles.intoleranceButtonActive,
                    ]}
                  >
                    <Text style={styles.intoleranceButtonText}>
                      {(profile.favoriteCuisines ?? []).includes(cuisine) && "✓ "}
                      {cuisine}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <OnboardingFooter
        step={step}
        onBack={handleBack}
        onNext={handleNext}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },

  /* Header */
  header: {
    backgroundColor: "#004734",
    padding: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#009235",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "700",
    color: "white",
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#CFF3DF",
    marginTop: 2,
  },

  progressBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  progressDot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  progressDotActive: {
    backgroundColor: "#FFB703",
  },

  typeOption: {
    backgroundColor: '#FFFDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E3D4',
  },
  typeOptionActive: {
    backgroundColor: '#009235',
    borderColor: '#009235',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004734',
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  typeOptionHint: {
    fontSize: 13,
    color: '#3F5E52',
    marginTop: 6,
  },

  /* Body */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 130,
  },

  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 24,
    padding: 22,
    gap: 22,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    gap: 10,
  },
  sectionLabel: {
    color: "#004734",
    fontSize: 15,
    fontWeight: "600",
  },
  nameDisplay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
    marginTop: 4,
  },
  nameHint: {
    fontSize: 13,
    color: "#3F5E52",
    marginTop: 6,
  },

  /* Toggles */
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

  /* Inputs */
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

  /* Options */
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
  },

  /* Intolerances */
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

  /* Footer */
  footer: {
    padding: 18,
    backgroundColor: "#FFFDF4",
    borderTopWidth: 1,
    borderTopColor: "#E6DDC8",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 14,
  },

  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E7",
  },
  backButtonText: {
    color: "#3F5E52",
    fontWeight: "700",
    marginLeft: 6,
  },

  nextButton: {
    flex: 1,
    backgroundColor: "#FF7A2F",
    paddingVertical: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontWeight: "800",
    marginRight: 6,
  },

  /* Date Picker */
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
  datePickerCancel: {
    padding: 6,
  },

  datePickerDone: {
    padding: 6,
  },
});
