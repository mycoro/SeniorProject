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
  const [proteinGoal, setProteinGoal] = useState("");
  const [fluidGoal, setFluidGoal] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  
  const isProfileComplete = userProfile?.surgeryDate && userProfile?.surgeryType && userProfile?.name;

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
              Please complete your profile to use all features including AI photo scanning.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Pressable
            onPress={() => router.push("/onboarding")}
            style={styles.editButton}
          >
            <Edit3 size={16} color="#008080" />
            <Text style={styles.editButtonText}>
              {isProfileComplete ? "Edit" : "Complete"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.profileCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userProfile?.name || "Not set"}</Text>
        </View>
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
      </View>

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
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#003366",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#008080",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#008080",
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#b45309",
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  logoutButton: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: "auto",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1e293b",
    backgroundColor: "white",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelButtonText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonModal: {
    backgroundColor: "#003366",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

