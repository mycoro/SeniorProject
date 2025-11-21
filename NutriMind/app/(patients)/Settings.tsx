import { View, Text, StyleSheet } from "react-native";

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      
      <View style={styles.box}>
        <Text style={styles.boxText}>Theme</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.boxText}>Account Info</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#FFFDF4", // cream background
  },
  header: { 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 16, 
    color: "#004734", // dark green
  },
  box: {
    backgroundColor: "#BADA76", // lime green for accent
    padding: 16,
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
    color: "#004734", // dark green text
  },
});
