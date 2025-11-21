import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      {/* Theme */}
      <TouchableOpacity style={styles.box}>
        <Text style={styles.boxText}>Theme</Text>
      </TouchableOpacity>

      {/* Account Info */}
      <TouchableOpacity style={styles.box}>
        <Text style={styles.boxText}>Account Info</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFDF4", // soft cream background
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 20,
  },
  box: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  boxText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },
});
