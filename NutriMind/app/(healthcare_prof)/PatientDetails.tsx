import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";

interface Meal {
  id: number;
  mealType: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  liquid: number;
}

export default function PatientDetails() {
  const { patient } = useLocalSearchParams();
  const parsedPatient = JSON.parse(patient as string);
  const [activeTab, setActiveTab] = useState("overview");

  const mockMeals: Meal[] = parsedPatient.meals || [];

  const totalCalories = mockMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = mockMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = mockMeals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFiber = mockMeals.reduce((sum, meal) => sum + meal.fiber, 0);
  const totalLiquid = mockMeals.reduce((sum, meal) => sum + meal.liquid, 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{parsedPatient.name}</Text>
      <Text style={styles.subHeader}>Age: {parsedPatient.age}</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "macros" && styles.activeTab]}
          onPress={() => setActiveTab("macros")}
        >
          <Text style={[styles.tabText, activeTab === "macros" && styles.activeTabText]}>
            Macros
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Tab */}
      {activeTab === "overview" && (
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
      )}

      {/* Macros Tab */}
      {activeTab === "macros" && (
        <>
          {/* Summary Cards */}
          <View style={styles.macroSummaryContainer}>
            <View style={[styles.macroSummaryCard, { backgroundColor: "#ffbf48" }]}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>{totalCalories} kcal</Text>
            </View>
            <View style={[styles.macroSummaryCard, { backgroundColor: "#BADA76" }]}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{totalProtein} g</Text>
            </View>
            <View style={[styles.macroSummaryCard, { backgroundColor: "#FF7739" }]}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{totalCarbs} g</Text>
            </View>
          </View>

          <View style={styles.macroSummaryContainer}>
            <View style={[styles.macroSummaryCard, { backgroundColor: "#009235" }]}>
              <Text style={styles.macroLabel}>Fiber</Text>
              <Text style={styles.macroValue}>{totalFiber} g</Text>
            </View>
            <View style={[styles.macroSummaryCard, { backgroundColor: "#004734" }]}>
              <Text style={styles.macroLabel}>Liquid</Text>
              <Text style={styles.macroValue}>{totalLiquid.toFixed(2)} L</Text>
            </View>
          </View>

          {/* Recent Meals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Meals</Text>

            {mockMeals.map((meal) => (
              <View key={meal.id} style={[styles.mealCard, { backgroundColor: "#FFFDF4" }]}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealType}>{meal.mealType}</Text>
                  <Text style={styles.mealDate}>{meal.date}</Text>
                </View>
                <View style={styles.mealDetails}>
                  <Text style={styles.mealDetail}>Calories: {meal.calories} kcal</Text>
                  <Text style={styles.mealDetail}>Protein: {meal.protein} g</Text>
                  <Text style={styles.mealDetail}>Carbs: {meal.carbs} g</Text>
                  <Text style={styles.mealDetail}>Fiber: {meal.fiber} g</Text>
                  <Text style={styles.mealDetail}>Liquid: {meal.liquid} L</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#004734",
  },
  subHeader: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#FFBF48",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#FFFDF4",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  activeTabText: {
    color: "#004734",
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#BADA76",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    color: "#111827",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#004734",
    marginTop: 4,
  },
  macroSummaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  macroSummaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  macroLabel: {
    fontSize: 13,
    color: "#FFF",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#004734",
  },
  mealCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  mealType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },
  mealDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  mealDetails: {
    gap: 4,
  },
  mealDetail: {
    fontSize: 14,
    color: "#111827",
  },
});
