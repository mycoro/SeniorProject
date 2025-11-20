import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import CircleProgress from "../../components/CircleProgress"; 

export default function PatientDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Patient Dashboard</Text>

      {/* Summary Section */}
      <View style={styles.summarySection}>

        {/* Calories Summary */}
        <View style={[styles.summaryCard, styles.mealCardColor]}>
          <CircleProgress
            current={400}             
            goal={1200}
            unit="kcal"
            tintColor="#FB8C00"
            backgroundColor="#FFE0B2"
            label="Calories"
          />
        </View>

        {/* Protein Summary */}
        <View style={[styles.summaryCard, styles.exerciseCardColor]}>
          <CircleProgress
            current={30}
            goal={120}
            unit="g"
            tintColor="#7CB342"
            backgroundColor="#DCEDC8"
            label="Protein"
          />
        </View>

        {/* Liquid Summary */}
        <View style={[styles.summaryCard, styles.liquidCardColor]}>
          <CircleProgress
            current={30}
            goal={180}
            unit="L"
            tintColor="#039BE5"
            backgroundColor="#B3E5FC"
            label="Liquid"
          />
        </View>

      </View>

      {/* Meal Log Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Logs</Text>

        <View style={[styles.mealCard, styles.mealLogColor]}>
          <Text style={styles.mealTitle}>Breakfast</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={[styles.mealCard, styles.mealLogColor]}>
          <Text style={styles.mealTitle}>Lunch</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={[styles.mealCard, styles.mealLogColor]}>
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
    backgroundColor: "#F7F9FB",
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 20,
  },

  /* Summary Section */
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 8,
    marginHorizontal: 6,
    alignItems: "center",
    elevation: 3,
  },

  /* Colors */
  mealCardColor: { backgroundColor: "#FFCC80" },
  exerciseCardColor: { backgroundColor: "#AED581" },
  liquidCardColor: { backgroundColor: "#81D4FA" },
  mealLogColor: { backgroundColor: "#FFE0B2" },

  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
    color: "#1E293B",
  },

  mealCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  mealDetail: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    color: "#374151",
  },
});
