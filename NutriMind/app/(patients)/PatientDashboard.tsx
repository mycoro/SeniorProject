import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

export default function PatientDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Patient Dashboard</Text>

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Text style={styles.label}>Calories</Text>
          <Text style={styles.value}>-- kcal</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.label}>Protein</Text>
          <Text style={styles.value}>-- g</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.label}>Liquid</Text>
          <Text style={styles.value}>-- L</Text>
        </View>
      </View>

      {/* Meal Log Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Logs</Text>

        {/* Meal Cards */}
        <View style={styles.mealCard}>
          <Text style={styles.mealTitle}>Breakfast</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={styles.mealCard}>
          <Text style={styles.mealTitle}>Lunch</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={styles.mealCard}>
          <Text style={styles.mealTitle}>Dinner</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>
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
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
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
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  mealDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
});
