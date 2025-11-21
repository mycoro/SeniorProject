import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HealthcareDashboard() {
  const router = useRouter();

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
      <Text style={styles.header}>Healthcare Dashboard</Text>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.attentionCard]}>
          <Text style={styles.summaryLabel}>Requiring Attention</Text>
          <Text style={styles.summaryValue}>{requiringAttentionCount}</Text>
        </View>

        <View style={[styles.summaryCard, styles.onTrackCard]}>
          <Text style={styles.summaryLabel}>On Track</Text>
          <Text style={styles.summaryValue}>{onTrackCount}</Text>
        </View>
      </View>

      {/* Patient List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patients</Text>

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
                  ? styles.onTrackBadge
                  : styles.attentionBadge,
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
    backgroundColor: "#fffdf4",
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },

  // SUMMARY CARDS
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    marginHorizontal: 6,
    alignItems: "center",
    elevation: 2,
  },
  attentionCard: {
    backgroundColor: "#ffbf48", // soft red
  },
  onTrackCard: {
    backgroundColor: "#bada76", // green (matches AddEntry)
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
    color: "#111827",
  },

  // SECTION HEADER
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
    color: "#1F2937",
  },

  // PATIENT CARDS
  patientCard: {
    flexDirection: "row",
    backgroundColor: "#FFF8E7",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderLeftWidth: 6,
    borderLeftColor: "#009235", // light blue accent (from AddEntry)
    elevation: 1,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  patientSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  // BADGES
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  onTrackBadge: {
    backgroundColor: "#d4f295ff",
  },
  attentionBadge: {
    backgroundColor: "#ffcf76ff",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  onTrackText: {
    color: "#166534",
  },
  attentionText: {
    color: "#B91C1C",
  },
});