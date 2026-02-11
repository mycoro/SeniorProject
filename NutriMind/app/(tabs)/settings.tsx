import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView, ScrollView, StyleSheet, Alert, TextInput, Modal } from "react-native";
import { LogOut, Edit3, AlertCircle, Target } from "lucide-react-native";
import { auth } from "@/config/firebase";
import { signOut } from "firebase/auth";
import { router } from "expo-router";
import { useUser } from "@/context/UserContext";
import { updateUserProfile } from "@/config/users";

export default function Settings() {
  const { userProfile, setUserProfile } = useUser();
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [fluidGoal, setFluidGoal] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  
  const isDoctor = userProfile?.isDoctor;
  const isProfileComplete = isDoctor
    ? userProfile?.name && userProfile?.specialty && userProfile?.practiceType
    : userProfile?.surgeryDate && userProfile?.surgeryType && userProfile?.name;

  const handleSaveGoals = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to update goals.");
      return;
    }

    try {
      const updates: any = {};
      if (proteinGoal.trim()) {
        const protein = parseInt(proteinGoal.trim());
        if (isNaN(protein) || protein <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid protein goal (positive number).");
          return;
        }
        updates.proteinGoal = protein;
      }
      if (fluidGoal.trim()) {
        const fluid = parseInt(fluidGoal.trim());
        if (isNaN(fluid) || fluid <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid fluid goal (positive number).");
          return;
        }
        updates.fluidGoal = fluid;
      }
      if (calorieGoal.trim()) {
        const calories = parseInt(calorieGoal.trim());
        if (isNaN(calories) || calories <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid calorie goal (positive number).");
          return;
        }
        updates.calorieGoal = calories;
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert("No Changes", "Please enter at least one goal to save.");
        return;
      }

      await updateUserProfile(user.uid, updates);
      setUserProfile({ ...userProfile, ...updates } as any);
      setShowGoalsModal(false);
      setProteinGoal("");
      setFluidGoal("");
      setCalorieGoal("");
      Alert.alert("Success", "Goals updated successfully!");
    } catch (error: any) {
      console.error("Error updating goals:", error);
      Alert.alert("Error", "Failed to update goals. Please try again.");
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateUserProfile(user.uid, { name: trimmed });
      setUserProfile({ ...userProfile, name: trimmed } as any);
      setShowNameModal(false);
      setNameInput("");
      Alert.alert("Saved", "Your name has been updated.");
    } catch (e) {
      console.error("Error saving name:", e);
      Alert.alert("Error", "Failed to save name. Please try again.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/auth");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {!isProfileComplete && (
        <View style={styles.warningCard}>
          <AlertCircle size={20} color="#d97706" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Profile Incomplete</Text>
            <Text style={styles.warningText}>
              {isDoctor 
                ? "Please complete your profile to access all doctor features."
                : "Please complete your profile to use all features including AI photo scanning."
              }
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Pressable
            onPress={() => {
              console.log("Settings: edit pressed", { isDoctor, isProfileComplete, userProfile });
              const path = isDoctor ? "/edit-doctor" : "/edit-profile";
              if (!isProfileComplete) {
                router.push(isDoctor ? "/doctorOnboarding" : "/onboarding");
              } else {
                router.push(path as any);
              }
            }}
            style={styles.editButton}
          >
            <Edit3 size={16} color="#008080" />
            <Text style={styles.editButtonText}>
              {isProfileComplete ? "Edit" : "Complete"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.profileCard}
          onPress={() => {
            setNameInput(userProfile?.name || "");
            setShowNameModal(true);
          }}
        >
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userProfile?.name || "Not set"}</Text>
        </Pressable>
        <View style={styles.profileCard}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {userProfile?.isPreOp === true ? "Pre-Op" : userProfile?.isPreOp === false ? "Post-Op" : "Not set"}
          </Text>
        </View>
        
        {isDoctor ? (
          <>
            <View style={styles.profileCard}>
              <Text style={styles.label}>Specialty</Text>
              <Text style={styles.value}>
                {userProfile?.specialty || "Not set"}
              </Text>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.label}>Years of Experience</Text>
              <Text style={styles.value}>
                {userProfile?.yearsExperience || "Not set"}
              </Text>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.label}>Practice Type</Text>
              <Text style={styles.value}>
                {userProfile?.practiceType || "Not set"}
              </Text>
            </View>
            {userProfile?.licenseNumber && (
              <View style={styles.profileCard}>
                <Text style={styles.label}>License Number</Text>
                <Text style={styles.value}>
                  {userProfile.licenseNumber}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.profileCard}>
              <Text style={styles.label}>Surgery Date</Text>
              <Text style={styles.value}>
                {userProfile?.surgeryDate || "Not set"}
              </Text>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.label}>Surgery Type</Text>
              <Text style={styles.value}>
                {userProfile?.surgeryType || "Not set"}
              </Text>
            </View>
          </>
        )}
      </View>

      {!isDoctor && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Goals</Text>
            <Pressable
              onPress={() => {
                setProteinGoal(userProfile?.proteinGoal?.toString() || "");
                setFluidGoal(userProfile?.fluidGoal?.toString() || "");
                setCalorieGoal(userProfile?.calorieGoal?.toString() || "");
                setShowGoalsModal(true);
              }}
              style={styles.editButton}
            >
              <Target size={16} color="#008080" />
              <Text style={styles.editButtonText}>Set Goals</Text>
            </Pressable>
          </View>
          <View style={styles.profileCard}>
            <Text style={styles.label}>Protein Goal</Text>
            <Text style={styles.value}>
              {userProfile?.proteinGoal ? `${userProfile.proteinGoal}g/day` : "Not set - Tap 'Set Goals' to configure"}
            </Text>
          </View>
          <View style={styles.profileCard}>
            <Text style={styles.label}>Fluid Goal</Text>
            <Text style={styles.value}>
              {userProfile?.fluidGoal ? `${userProfile.fluidGoal}oz/day` : "Not set - Tap 'Set Goals' to configure"}
            </Text>
          </View>
          <View style={styles.profileCard}>
            <Text style={styles.label}>Calorie Goal</Text>
            <Text style={styles.value}>
              {userProfile?.calorieGoal ? `${userProfile.calorieGoal} cal/day` : "Not set - Tap 'Set Goals' to configure"}
            </Text>
          </View>
        </View>
      )}

      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your name</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Alex"
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowNameModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                style={[styles.modalButton, styles.saveButtonModal]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGoalsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Goals</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Protein Goal (grams/day)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 60"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fluid Goal (ounces/day)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 64"
                value={fluidGoal}
                onChangeText={setFluidGoal}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Calorie Goal (calories/day)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 800"
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowGoalsModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveGoals}
                style={[styles.modalButton, styles.saveButtonModal]}
              >
                <Text style={styles.saveButtonText}>Save Goals</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <LogOut size={20} color="white" />
        <Text style={styles.logoutButtonText}>Logout</Text>
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

  /* sections */
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#009235",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#009235",
  },

  /* warning */
  warningCard: {
    backgroundColor: "#FFF3D6",
    borderWidth: 1,
    borderColor: "#FFBF48",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9A5C00",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#B26A00",
    lineHeight: 20,
  },

  /* profile cards */
  profileCard: {
    backgroundColor: "#FFF8E7",
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    color: "#3F5E52",
    marginBottom: 4,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },

  /* logout */
  logoutButton: {
    backgroundColor: "#ff7739",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: "auto",
    elevation: 3,
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFDF4",
    borderRadius: 22,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 20,
    textAlign: "center",
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#004734",
    backgroundColor: "#FFF8E7",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#E6DDC8",
  },
  cancelButtonText: {
    color: "#3F5E52",
    fontWeight: "700",
    fontSize: 16,
  },

  saveButtonModal: {
    backgroundColor: "#009235",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});