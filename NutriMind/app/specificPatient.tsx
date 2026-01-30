import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChevronLeft, Activity, Target, TrendingUp } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";

// Mock patient data - replace with actual data fetching
const MOCK_PATIENT_DATA = {
  id: "1",
  name: "Jane Doe",
  gender: "Female",
  age: 33,
  surgery: "Gastric Sleeve",
  surgeryDate: "March 9, 2026",
  daysPostOp: 45,
  currentWeight: 210,
  startingWeight: 280,
  goalWeight: 180,
  proteinGoal: 60,
  fluidGoal: 64,
  calorieGoal: 800,
  todayProtein: 52,
  todayFluids: 48,
  todayCalories: 650,
  notes: "Patient is doing well. Mentioned some nausea in the mornings. Recommended smaller, more frequent meals.",
};

export default function SpecificPatient() {
  const { id } = useLocalSearchParams();
  const [patient, setPatient] = useState(MOCK_PATIENT_DATA);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(MOCK_PATIENT_DATA.notes);
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert("Success", "Notes saved successfully!");
    }, 500);
  };

  const weightLoss = patient.startingWeight - patient.currentWeight;
  const weightLossPercentage = ((weightLoss / patient.startingWeight) * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#004734" />
          </Pressable>
          <Text style={styles.title}>{patient.name}</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009235" />
          </View>
        ) : (
          <>
            {/* Patient Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Patient Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>{patient.age} years</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>{patient.gender}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery</Text>
                <Text style={styles.detailValue}>{patient.surgery}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery Date</Text>
                <Text style={styles.detailValue}>{patient.surgeryDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Days Post-Op</Text>
                <Text style={styles.detailValue}>{patient.daysPostOp} days</Text>
              </View>
            </View>

            {/* Weight Progress Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Progress</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Activity size={20} color="#FF7A2F" />
                  <Text style={styles.statValue}>{patient.currentWeight}</Text>
                  <Text style={styles.statLabel}>Current</Text>
                </View>
                <View style={styles.statCard}>
                  <Target size={20} color="#009235" />
                  <Text style={styles.statValue}>{patient.goalWeight}</Text>
                  <Text style={styles.statLabel}>Goal</Text>
                </View>
                <View style={styles.statCard}>
                  <TrendingUp size={20} color="#3b82f6" />
                  <Text style={styles.statValue}>-{weightLoss}</Text>
                  <Text style={styles.statLabel}>Lost ({weightLossPercentage}%)</Text>
                </View>
              </View>
            </View>

            {/* Today's Nutrition Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today's Nutrition</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{patient.todayProtein}g</Text>
                  <Text style={styles.macroGoal}>Goal: {patient.proteinGoal}g</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Fluids</Text>
                  <Text style={styles.macroValue}>{patient.todayFluids}oz</Text>
                  <Text style={styles.macroGoal}>Goal: {patient.fluidGoal}oz</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <Text style={styles.macroValue}>{patient.todayCalories}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient.calorieGoal}</Text>
                </View>
              </View>
            </View>

            {/* Notes Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Clinical Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this patient..."
                placeholderTextColor="#7A9C8A"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Pressable 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSaveNotes}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
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

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },

  /* Loading */
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  /* Cards */
  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 16,
  },

  /* Detail Rows */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E3D4",
  },
  detailLabel: {
    fontSize: 14,
    color: "#3F5E52",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#004734",
    fontWeight: "600",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004734",
  },
  statLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "500",
    textAlign: "center",
  },

  /* Macros */
  macrosGrid: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "600",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },
  macroGoal: {
    fontSize: 11,
    color: "#7A9C8A",
    fontWeight: "500",
  },

  /* Notes */
  notesInput: {
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#004734",
    minHeight: 120,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#009235",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});