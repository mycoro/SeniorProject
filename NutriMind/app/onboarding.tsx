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
import { ChevronLeft, ChevronRight, User, Calendar, Utensils, AlertCircle, Stethoscope, Heart } from "lucide-react-native";
import { router } from "expo-router";
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { setUserProfile as saveUserProfile } from "@/config/users";

type UserType = "patient" | "doctor" | null;

export default function Onboarding() {
  const { setUserProfile, setIsOnboarded } = useUser();

  const [step, setStep] = useState(0); // Start at 0 for user type selection
  const [userType, setUserType] = useState<UserType>(null);
  const [formData, setFormData] = useState({
    name: "",
    surgeryDate: "",
    surgeryType: "",
    hasDumpingSyndrome: false,
    intolerances: [] as string[],
  });

  const surgeryTypes = ["Gastric Sleeve", "Gastric Bypass", "Duodenal Switch", "Gastric Band"];
  const commonIntolerances = ["Lactose", "Gluten", "Red Meat", "Sugar", "Eggs", "Nuts"];

  const toggleIntolerance = (intolerance: string) => {
    if (formData.intolerances.includes(intolerance)) {
      setFormData({
        ...formData,
        intolerances: formData.intolerances.filter((i) => i !== intolerance),
      });
    } else {
      setFormData({
        ...formData,
        intolerances: [...formData.intolerances, intolerance],
      });
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

    // Patient onboarding validation
    if (step === 1) {
      if (!formData.name.trim()) {
        Alert.alert("Required", "Please enter your name.");
        return;
      }
    } else if (step === 2) {
      if (!formData.surgeryDate.trim()) {
        Alert.alert("Required", "Please enter your surgery date.");
        return;
      }
      // Basic date validation
      const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (!dateRegex.test(formData.surgeryDate)) {
        Alert.alert("Invalid Date", "Please enter date in MM/DD/YYYY format.");
        return;
      }
    } else if (step === 3) {
      if (!formData.surgeryType) {
        Alert.alert("Required", "Please select your surgery type.");
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Save patient profile
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to complete setup.");
        router.replace("/auth");
        return;
      }

      try {
        await saveUserProfile(user.uid, {
          name: formData.name,
          surgeryDate: formData.surgeryDate,
          surgeryType: formData.surgeryType,
          hasDumpingSyndrome: formData.hasDumpingSyndrome,
          intolerances: formData.intolerances.length > 0 ? formData.intolerances : null,
        } as UserProfile);

        setUserProfile({
          name: formData.name,
          surgeryDate: formData.surgeryDate,
          surgeryType: formData.surgeryType,
          hasDumpingSyndrome: formData.hasDumpingSyndrome,
          intolerances: formData.intolerances.length > 0 ? formData.intolerances : null,
        } as UserProfile);

        setIsOnboarded(true);
        router.replace("/(tabs)/dashboard");
      } catch (error) {
        console.error("Error saving profile:", error);
        Alert.alert("Error", "Failed to save profile. Please try again.");
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to NutriMind</Text>
          <Text style={styles.subtitle}>
            {step === 0 ? "Let's get started" : `Step ${step} of 4`}
          </Text>
        </View>

        {/* Step 0: User Type Selection */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>I am a...</Text>
            <Text style={styles.cardSubtitle}>Select your account type</Text>

            <View style={styles.userTypeContainer}>
              <Pressable
                style={[
                  styles.userTypeCard,
                  userType === "patient" && styles.userTypeCardActive,
                ]}
                onPress={() => setUserType("patient")}
              >
                <View style={[
                  styles.userTypeIcon,
                  userType === "patient" && styles.userTypeIconActive,
                ]}>
                  <Heart size={32} color={userType === "patient" ? "white" : "#009235"} />
                </View>
                <Text style={[
                  styles.userTypeTitle,
                  userType === "patient" && styles.userTypeTitleActive,
                ]}>
                  Patient
                </Text>
                <Text style={styles.userTypeDescription}>
                  Track your bariatric surgery recovery journey
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.userTypeCard,
                  userType === "doctor" && styles.userTypeCardActive,
                ]}
                onPress={() => setUserType("doctor")}
              >
                <View style={[
                  styles.userTypeIcon,
                  userType === "doctor" && styles.userTypeIconActive,
                ]}>
                  <Stethoscope size={32} color={userType === "doctor" ? "white" : "#009235"} />
                </View>
                <Text style={[
                  styles.userTypeTitle,
                  userType === "doctor" && styles.userTypeTitleActive,
                ]}>
                  Doctor
                </Text>
                <Text style={styles.userTypeDescription}>
                  Monitor and support your patients
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <User size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>What's your name?</Text>
                <Text style={styles.cardSubtitle}>We'll use this to personalize your experience</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="John Doe"
                placeholderTextColor="#7A9C8A"
              />
            </View>
          </View>
        )}

        {/* Step 2: Surgery Date */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Calendar size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Surgery Date</Text>
                <Text style={styles.cardSubtitle}>When was or will be your surgery?</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Date (MM/DD/YYYY)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.surgeryDate}
                onChangeText={(text) => setFormData({ ...formData, surgeryDate: text })}
                placeholder="01/15/2024"
                placeholderTextColor="#7A9C8A"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Step 3: Surgery Type */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Utensils size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Surgery Type</Text>
                <Text style={styles.cardSubtitle}>What type of bariatric surgery?</Text>
              </View>
            </View>

            <View style={styles.buttonGrid}>
              {surgeryTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFormData({ ...formData, surgeryType: type })}
                  style={[
                    styles.optionButton,
                    formData.surgeryType === type && styles.optionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.surgeryType === type && styles.optionButtonTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Additional Info */}
        {step === 4 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <AlertCircle size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Additional Information</Text>
                <Text style={styles.cardSubtitle}>Help us personalize your experience</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Do you have Dumping Syndrome?</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setFormData({ ...formData, hasDumpingSyndrome: false })}
                  style={[
                    styles.toggleButton,
                    !formData.hasDumpingSyndrome && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !formData.hasDumpingSyndrome && styles.toggleButtonTextActive,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFormData({ ...formData, hasDumpingSyndrome: true })}
                  style={[
                    styles.toggleButton,
                    formData.hasDumpingSyndrome && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      formData.hasDumpingSyndrome && styles.toggleButtonTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Food Intolerances (Optional)</Text>
              <View style={styles.buttonGrid}>
                {commonIntolerances.map((intolerance) => (
                  <Pressable
                    key={intolerance}
                    onPress={() => toggleIntolerance(intolerance)}
                    style={[
                      styles.optionButton,
                      formData.intolerances.includes(intolerance) && styles.optionButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.intolerances.includes(intolerance) && styles.optionButtonTextActive,
                      ]}
                    >
                      {intolerance}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {step > 0 && (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={20} color="#3F5E52" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          <Pressable 
            onPress={handleNext} 
            style={[styles.nextButton, step === 0 && styles.nextButtonFull]}
          >
            <Text style={styles.nextButtonText}>
              {step === 4 ? "Complete Setup" : "Continue"}
            </Text>
            {step < 4 && <ChevronRight size={20} color="white" />}
          </Pressable>
        </View>
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
    paddingBottom: 40,
    flexGrow: 1,
  },

  /* Header */
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#3F5E52",
    fontWeight: "500",
  },

  /* Card */
  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    gap: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#E8F5E9",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#3F5E52",
    marginTop: 2,
  },

  /* User Type Selection */
  userTypeContainer: {
    gap: 16,
  },
  userTypeCard: {
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D6C89A",
  },
  userTypeCardActive: {
    borderColor: "#009235",
    backgroundColor: "#E8F5E9",
  },
  userTypeIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#E8F5E9",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userTypeIconActive: {
    backgroundColor: "#009235",
  },
  userTypeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 8,
  },
  userTypeTitleActive: {
    color: "#009235",
  },
  userTypeDescription: {
    fontSize: 14,
    color: "#3F5E52",
    textAlign: "center",
  },

  /* Sections */
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004734",
  },
  textInput: {
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#004734",
  },

  /* Option Buttons */
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6C89A",
    backgroundColor: "#FFFDF4",
    minWidth: "47%",
  },
  optionButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#004734",
    textAlign: "center",
  },
  optionButtonTextActive: {
    color: "white",
  },

  /* Toggle */
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6C89A",
    backgroundColor: "#FFFDF4",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },
  toggleButtonTextActive: {
    color: "white",
  },

  /* Navigation Buttons */
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6C89A",
    backgroundColor: "#FFF8E7",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3F5E52",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#009235",
  },
  nextButtonFull: {
    flex: 2,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});