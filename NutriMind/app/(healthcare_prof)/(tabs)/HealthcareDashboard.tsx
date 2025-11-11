import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HealthcareDashboard() {
  const router = useRouter();

  // Mock data with meals for each patient
  const mockPatients = [
    { 
      id: 1, 
      name: "John Doe", 
      age: 45, 
      status: "On Track", 
      weight: 180, 
      goal: 170,
      meals: [
        {
          id: 1,
          mealType: "Breakfast",
          date: "11/11/2025",
          calories: 450,
          protein: 25,
          carbs: 55,
          fiber: 8,
          liquid: 0.35,
        },
        {
          id: 2,
          mealType: "Lunch",
          date: "11/11/2025",
          calories: 620,
          protein: 35,
          carbs: 68,
          fiber: 12,
          liquid: 0.5,
        },
        {
          id: 3,
          mealType: "Dinner",
          date: "11/10/2025",
          calories: 580,
          protein: 40,
          carbs: 52,
          fiber: 10,
          liquid: 0.4,
        },
        {
          id: 4,
          mealType: "Breakfast",
          date: "11/10/2025",
          calories: 380,
          protein: 20,
          carbs: 48,
          fiber: 6,
          liquid: 0.3,
        },
      ]
    },
    { 
      id: 2, 
      name: "Jane Smith", 
      age: 52, 
      status: "Requiring Attention", 
      weight: 195, 
      goal: 160,
      meals: [
        {
          id: 1,
          mealType: "Breakfast",
          date: "11/11/2025",
          calories: 320,
          protein: 15,
          carbs: 42,
          fiber: 5,
          liquid: 0.25,
        },
        {
          id: 2,
          mealType: "Lunch",
          date: "11/11/2025",
          calories: 480,
          protein: 22,
          carbs: 58,
          fiber: 7,
          liquid: 0.3,
        },
        {
          id: 3,
          mealType: "Snack",
          date: "11/10/2025",
          calories: 180,
          protein: 8,
          carbs: 24,
          fiber: 3,
          liquid: 0.2,
        },
      ]
    },
    { 
      id: 3, 
      name: "Michael Lee", 
      age: 38, 
      status: "On Track", 
      weight: 165, 
      goal: 160,
      meals: [
        {
          id: 1,
          mealType: "Breakfast",
          date: "11/11/2025",
          calories: 520,
          protein: 30,
          carbs: 62,
          fiber: 10,
          liquid: 0.4,
        },
        {
          id: 2,
          mealType: "Lunch",
          date: "11/11/2025",
          calories: 680,
          protein: 42,
          carbs: 72,
          fiber: 14,
          liquid: 0.5,
        },
        {
          id: 3,
          mealType: "Dinner",
          date: "11/10/2025",
          calories: 650,
          protein: 45,
          carbs: 60,
          fiber: 12,
          liquid: 0.45,
        },
        {
          id: 4,
          mealType: "Snack",
          date: "11/10/2025",
          calories: 200,
          protein: 10,
          carbs: 28,
          fiber: 4,
          liquid: 0.15,
        },
        {
          id: 5,
          mealType: "Breakfast",
          date: "11/09/2025",
          calories: 480,
          protein: 28,
          carbs: 58,
          fiber: 9,
          liquid: 0.35,
        },
      ]
    },
  ];

  const requiringAttentionCount = mockPatients.filter(
    (p) => p.status === "Requiring Attention"
  ).length;
  const onTrackCount = mockPatients.filter((p) => p.status === "On Track").length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Dashboard</Text>

      {/* Summary section */}
      <View style={styles.requireAttentionSection}>
        <View style={styles.requireAttentionCard}>
          <Text style={styles.label}>Requiring Attention</Text>
          <Text style={styles.value}>{requiringAttentionCount}</Text>
        </View>

        <View style={styles.requireAttentionCard}>
          <Text style={styles.label}>On Track</Text>
          <Text style={styles.value}>{onTrackCount}</Text>
        </View>
      </View>

      {/* Patient List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient List</Text>

        {mockPatients.map((patient) => (
          <TouchableOpacity
            key={patient.id}
            style={styles.patientCard}
            onPress={() =>
              router.push({
                pathname: "/(healthcare_prof)/PatientDetails",
                params: { patient: JSON.stringify(patient) },
              })
            }
          >
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientSub}>Age: {patient.age}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                patient.status === "On Track"
                  ? styles.onTrack
                  : styles.needsAttention,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  patient.status === "On Track"
                    ? styles.onTrackText
                    : styles.attentionText,
                ]}
              >
                {patient.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  requireAttentionSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  requireAttentionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  patientCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  patientSub: {
    fontSize: 13,
    color: "#6B7280",
    marginVertical: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  onTrack: {
    backgroundColor: "#DCFCE7",
  },
  needsAttention: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  onTrackText: {
    color: "#166534",
  },
  attentionText: {
    color: "#991B1B",
  },
});