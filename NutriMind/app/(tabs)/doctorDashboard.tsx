import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { HeartPulse, ChevronRight, Search } from "lucide-react-native";
import { router } from "expo-router";
import { useUser } from "@/context/UserContext";

// Mock patient data - replace with actual data fetching
const MOCK_PATIENTS = [
  { id: "1", name: "Mayra Coronilla", subtitle: "Gastric Sleeve • 45 days post-op" },
  { id: "2", name: "Kim Nguyen", subtitle: "Gastric Bypass • 120 days post-op" },
  { id: "3", name: "Michelle Jimenez", subtitle: "Gastric Sleeve • 30 days post-op" },
  { id: "4", name: "Sujit Bhandari", subtitle: "Gastric Bypass • 90 days post-op" },
  { id: "5", name: "Samiksha Gupta", subtitle: "Gastric Sleeve • 15 days post-op" },
  { id: "6", name: "Nibesh Yadav", subtitle: "Gastric Bypass • 60 days post-op" },
];

export default function DoctorDashboard() {
  const { userProfile } = useUser();
  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePatientPress = (patientId: string) => {
    router.push(`/specificPatient?id=${patientId}`);
  };

  // Color pattern: green, orange, yellow
  const getPatientColor = (index: number) => {
    const colors = ["#009235", "#FF7A2F", "#FFBF48"];
    return colors[index % colors.length];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi {userProfile?.name?.split(" ")[0] || "Doctor"}!</Text>
          <Text style={styles.subGreeting}>Here are your patients</Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#7A9C8A" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            placeholderTextColor="#7A9C8A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.patientList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#009235" />
            </View>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No patients found</Text>
            </View>
          ) : (
            filteredPatients.map((patient, index) => (
              <Pressable
                key={patient.id}
                style={[
                  styles.patientCard,
                  index < filteredPatients.length - 1 && styles.patientDivider
                ]}
                onPress={() => handlePatientPress(patient.id)}
              >
                <View style={styles.patientLeft}>
                  <HeartPulse size={28} color={getPatientColor(index)} strokeWidth={2} />
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientSubtitle}>{patient.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#7A9C8A" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  /* Header */
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004734",
  },
  subGreeting: {
    fontSize: 14,
    color: "#3F5E52",
    marginTop: 4,
  },

  /* Search */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D6C89A",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#004734",
  },

  /* Patient List */
  patientList: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#7A9C8A",
    fontWeight: "500",
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  patientDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8E3D4",
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
  },
  patientSubtitle: {
    fontSize: 13,
    color: "#3F5E52",
    marginTop: 2,
  },
});