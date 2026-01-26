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
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { setUserProfile as saveUserProfile } from "@/config/users";


const surgeryTypes = ["Gastric Sleeve", "Gastric Bypass", "Duodenal Switch"];
const intoleranceOptions = ["Lactose", "Gluten", "Red Meat", "Eggs"];

export default function Onboarding() {
  const { userProfile: existingProfile, setUserProfile, setIsOnboarded } = useUser();
  const [step, setStep] = useState(1);
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
  
  const getInitialProfile = (): UserProfile => {
    if (existingProfile && existingProfile.surgeryDate) {
      const rawDate = existingProfile.surgeryDate ?? "";
      const formattedDate = rawDate.includes("/")
          ? rawDate
          : formatDateUS(new Date(rawDate));
      return {
        name: existingProfile.name || "",
        isPreOp: existingProfile.isPreOp ?? false,
        surgeryDate: formattedDate,
        surgeryType: existingProfile.surgeryType || "Gastric Sleeve",
        hasDiabetes: existingProfile.hasDiabetes ?? false,
        hasDumpingSyndrome: existingProfile.hasDumpingSyndrome ?? false,
        intolerances: [],
        proteinGoal: existingProfile.proteinGoal,
        fluidGoal: existingProfile.fluidGoal,
        calorieGoal: existingProfile.calorieGoal,
      };
    }
    return {
      name: "",
      isPreOp: false,
      surgeryDate: "",
      surgeryType: "Gastric Sleeve",
      hasDiabetes: false,
      hasDumpingSyndrome: false,
      intolerances: [],
    };
  };

  const [profile, setProfile] = useState<UserProfile>(getInitialProfile());

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
    
    if (step < 2) {
      setStep(step + 1);
    } else {
      const user = auth.currentUser;
      if (user) {
        try {
          const parsedDate = parseUSDate(profile.surgeryDate ?? "");
          const isoDate = parsedDate ? parsedDate.toISOString().split("T")[0] : profile.surgeryDate;
          
          await saveUserProfile(user.uid, {
            name: profile.name ?? "",
            isPreOp: profile.isPreOp,
            surgeryDate: isoDate,
            surgeryType: profile.surgeryType,
            hasDiabetes: profile.hasDiabetes,
            hasDumpingSyndrome: profile.hasDumpingSyndrome,
            intolerances: profile.intolerances ?? [],
});

          setUserProfile(profile);
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

  const toggleIntolerance = (intolerance: string) => {
  setProfile((prev) => {
    const current = prev.intolerances ?? [];

    return {
      ...prev,
      intolerances: current.includes(intolerance)
        ? current.filter((i) => i !== intolerance)
        : [...current, intolerance],
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
                <Text style={styles.headerSubtitle}>Step {step} of 2</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          {[1, 2].map((s) => (
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
                        maximumDate={new Date()}
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
                      maximumDate={new Date()}
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
                      (profile.intolerances?.includes(item) ?? false) &&
                      styles.intoleranceButtonActive,
                    ]}

                  >
                    <Text
                      style={[
                        styles.intoleranceButtonText,
                        (profile.intolerances?.includes(item) ?? false) &&
                        styles.intoleranceButtonTextActive,
                      ]}

                    >
                      {(profile.intolerances?.includes(item) ?? false) && "✓ "}
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {step > 1 && (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={16} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          <Pressable onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>
              {step === 2 ? "Complete Setup" : "Continue"}
            </Text>
            {step < 2 && <ChevronRight size={16} color="white" />}
          </Pressable>
        </View>
      </View>
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
