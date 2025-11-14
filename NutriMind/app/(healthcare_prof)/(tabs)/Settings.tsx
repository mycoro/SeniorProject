import { View, Text, StyleSheet } from "react-native";

export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      <View style={styles.box}>
        <Text>Theme</Text>
      </View>
      <View style={styles.box}>
        <Text>Account Info</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  box: {
    backgroundColor: "#E0E0E0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
});
