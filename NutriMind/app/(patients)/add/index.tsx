import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function AddEntry() {
  const router = useRouter();

  const options = [
    { id: "1", label: "Liquid Intake", color: "#BADA76" }, // lime green
    { id: "2", label: "Meal", color: "#FFBF48" },          // yellow
    { id: "3", label: "Exercise", color: "#009235" },      // bright green
    { id: "4", label: "Sleep", color: "#FF7739" },         // orange
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add New Entry</Text>

      {options.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.option, { backgroundColor: item.color }]}
          onPress={() => {
            if (item.label === "Meal") router.push("/add/meal-entry");
            if (item.label === "Liquid Intake") router.push("/add/liquid-entry");
          }}
        >
          <Text style={styles.optionText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    backgroundColor: "#FFFDF4", // cream background
  },
  header: { 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 20, 
    color: "#004734", // dark green
  },
  option: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: { 
    fontSize: 18, 
    fontWeight: "600",
    color: "#004734",
  },
});
