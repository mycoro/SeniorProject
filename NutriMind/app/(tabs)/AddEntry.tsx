import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function AddEntry() {
  const options = [
    { id: "1", label: "Liquid Intake", color: "#81D4FA" },
    { id: "2", label: "Meal", color: "#FFCC80" },
    { id: "3", label: "Exercise", color: "#AED581" },
    { id: "4", label: "Sleep", color: "#CE93D8" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add New Entry</Text>

      {options.map((item) => (
        <TouchableOpacity key={item.id} style={[styles.option, { backgroundColor: item.color }]}>
          <Text style={styles.optionText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  option: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  optionText: { fontSize: 18, fontWeight: "600" },
});
