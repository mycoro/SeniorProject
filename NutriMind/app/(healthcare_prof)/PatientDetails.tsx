import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function PatientDetails() {
  const { patient } = useLocalSearchParams();
  const parsedPatient = JSON.parse(patient as string);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{parsedPatient.name}</Text>
      <Text style={styles.subHeader}>Age: {parsedPatient.age}</Text>

      <View style={styles.cardContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Current Weight</Text>
          <Text style={styles.cardValue}>{parsedPatient.weight} lbs</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Goal Weight</Text>
          <Text style={styles.cardValue}>{parsedPatient.goal} lbs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subHeader: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
});
