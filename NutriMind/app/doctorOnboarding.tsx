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
import { ChevronLeft, ChevronRight, User, Briefcase } from "lucide-react-native";
import { router } from "expo-router";
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { setUserProfile as saveUserProfile } from "@/config/users";

export default function DoctorOnboarding() {
  const { setUserProfile, setIsOnboarded } = useUser();

  const [step, setStep] = useState(1);
  const [doctorInfo, setDoctorInfo] = useState({
    name: "",
    specialty: "",
    licenseNumber: "",
    yearsExperience: "",
    practiceType: "",
  });

  const handleNext = async () => {
    // Basic validation
    if (step === 1) {
      if (!doctorInfo.name || !doctorInfo.specialty) {
        Alert.alert("Required", "Please enter your name and specialty.");
        return;
      }
    } else if (step === 2) {
      if (!doctorInfo.practiceType || !doctorInfo.yearsExperience) {
        Alert.alert("Required", "Please complete all fields.");
        return;
      }
    }

    if (step < 2) {
      setStep(step + 1);
    } else {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to complete setup.");
        router.replace("/auth");
        return;
      }

      try {
        await saveUserProfile(user.uid, {
          role: "healthcare_prof",
          isDoctor: true,
          name: doctorInfo.name,
          specialty: doctorInfo.specialty,
          licenseNumber: doctorInfo.licenseNumber ?? null,
          yearsExperience: doctorInfo.yearsExperience ?? null,
          practiceType: doctorInfo.practiceType ?? null,
        } as UserProfile);

        setUserProfile({
          role: "healthcare_prof",
          isDoctor: true,
          name: doctorInfo.name,
          specialty: doctorInfo.specialty,
          licenseNumber: doctorInfo.licenseNumber ?? null,
          yearsExperience: doctorInfo.yearsExperience ?? null,
          practiceType: doctorInfo.practiceType ?? null,
        } as UserProfile);

        setIsOnboarded(true);
        router.replace("/(tabs)/doctorDashboard");
      } catch (error) {
        console.error("Error saving doctor profile:", error);
        Alert.alert("Error", "Failed to save profile. Please check your permissions.");
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Setup</Text>
          <Text style={styles.subtitle}>Step {step} of 2</Text>
        </View>

        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <User size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Personal Info</Text>
                <Text style={styles.cardSubtitle}>Tell us about yourself</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={doctorInfo.name}
                onChangeText={(text) => setDoctorInfo({ ...doctorInfo, name: text })}
                placeholder="Dr. John Doe"
                placeholderTextColor="#7A9C8A"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Specialty</Text>
              <TextInput
                style={styles.textInput}
                value={doctorInfo.specialty}
                onChangeText={(text) => setDoctorInfo({ ...doctorInfo, specialty: text })}
                placeholder="Bariatric Surgery"
                placeholderTextColor="#7A9C8A"
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Briefcase size={24} color="#009235" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Professional Info</Text>
                <Text style={styles.cardSubtitle}>Credentials & Experience</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>License Number (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={doctorInfo.licenseNumber}
                onChangeText={(text) => setDoctorInfo({ ...doctorInfo, licenseNumber: text })}
                placeholder="12345678"
                placeholderTextColor="#7A9C8A"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.textInput}
                value={doctorInfo.yearsExperience}
                onChangeText={(text) => setDoctorInfo({ ...doctorInfo, yearsExperience: text })}
                placeholder="5"
                keyboardType="numeric"
                placeholderTextColor="#7A9C8A"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Practice Type</Text>
              <TextInput
                style={styles.textInput}
                value={doctorInfo.practiceType}
                onChangeText={(text) => setDoctorInfo({ ...doctorInfo, practiceType: text })}
                placeholder="Private Clinic, Hospital, etc."
                placeholderTextColor="#7A9C8A"
              />
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={20} color="#3F5E52" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          <Pressable 
            onPress={handleNext} 
            style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          >
            <Text style={styles.nextButtonText}>
              {step === 2 ? "Complete Setup" : "Continue"}
            </Text>
            {step < 2 && <ChevronRight size={20} color="white" />}
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

  /* Buttons */
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