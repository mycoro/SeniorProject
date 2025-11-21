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
        <View style={[styles.summaryCard, styles.caloriesCard]}>
          <CircleProgress
            current={400}
            goal={1200}
            unit="kcal"
            tintColor="#016024ff"          
            backgroundColor="rgba(183, 210, 123, 1)"  
            label="Calories"
          />
        </View>

        {/* Protein Summary */}
        <View style={[styles.summaryCard, styles.proteinCard]}>
          <CircleProgress
            current={30}
            goal={120}
            unit="g"
            tintColor="#df9c1eff"          
            backgroundColor="#fcd58eff"    
            label="Protein"
          />
        </View>

        {/* Liquid Summary */}
        <View style={[styles.summaryCard, styles.liquidCard]}>
          <CircleProgress
            current={30}
            goal={180}
            unit="L"
            tintColor="#da4f0eff"          // dark green
            backgroundColor="#fc9f73ff"    // soft pink accent
            label="Liquid"
          />
        </View>

      </View>

      {/* Meal Log Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Logs</Text>

        <View style={[styles.mealCard, styles.mealLogCard]}>
          <Text style={styles.mealTitle}>Breakfast</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={[styles.mealCard, styles.mealLogCard]}>
          <Text style={styles.mealTitle}>Lunch</Text>
          <Text style={styles.mealDetail}>Calories: -- kcal</Text>
          <Text style={styles.mealDetail}>Protein: -- g</Text>
          <Text style={styles.mealDetail}>Liquid: -- L</Text>
        </View>

        <View style={[styles.mealCard, styles.mealLogCard]}>
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
    backgroundColor: "#FFFDF4", // cream/light mode
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#004734", // dark green
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
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 8,
    marginHorizontal: 6,
    alignItems: "center",
    elevation: 3,
  },

  /* Updated Card Colors */
  caloriesCard: { backgroundColor: "#009235" }, 
  proteinCard: { backgroundColor: "#FFBF48" }, 
  liquidCard: { backgroundColor: "#ff7739" },  
  mealLogCard: { backgroundColor: "#FFF8E7" },  

  section: { marginBottom: 32 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
    color: "#004734",
  },

  mealCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004734",
  },
  mealDetail: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    color: "#3F5E52", // softer dark green/neutral
  },
});
