import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HealthcareDashboard() {
  const router = useRouter();

  // Mock data for now
  const mockPatients = [
    { id: 1, name: "John Doe", age: 45, status: "On Track", weight: 180, goal: 170 },
    { id: 2, name: "Jane Smith", age: 52, status: "Requiring Attention", weight: 195, goal: 160 },
    { id: 3, name: "Michael Lee", age: 38, status: "On Track", weight: 165, goal: 160 },
  ];

  // Count patients by status
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
