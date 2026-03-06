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
import { router, useLocalSearchParams } from "expo-router";
import { useUser } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";
import { formatSurgeryMonthYear, calculatePostOpTime } from "@/utils/formatters";

type PatientItem = {
  id: string;
  name: string | null;
  email: string | null;
  surgeryDate: string | null;
  surgeryType?: string | null;
  assignedDoctors?: string[];
};

export default function DoctorDashboard() {
  const { userProfile } = useUser();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const cleanName = (raw?: string | null) => {
    if (!raw) return "";
    let s = raw.trim();
    s = s.replace(/^Dr\.?\s*/i, "");
    return s;
  };

  // Build a cleaned full name, prefer profile -> auth displayName -> email local-part
  const fullCleanName = cleanName(userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email || "");
  const nameParts = fullCleanName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || (auth.currentUser?.email ? auth.currentUser.email.split("@")[0] : "Doctor");
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;

  const isDoctor = Boolean(userProfile?.role === "healthcare_prof" || userProfile?.isDoctor);
  const greeting = isDoctor
    ? lastName && lastName !== "Doctor"
      ? `Dr. ${lastName}`
      : "Dr."
    : firstName;

  const filteredPatients = patients.filter((patient) => {
    const q = searchQuery.toLowerCase();
    const name = (patient.name || "").toLowerCase();
    const email = (patient.email || "").toLowerCase();
    const surgery = (patient.surgeryDate || "").toLowerCase();
    return name.includes(q) || email.includes(q) || surgery.includes(q);
  });

  const handlePatientPress = (patientId: string) => {
    // You have specificPatient.tsx inside (tabs), so route there explicitly:
    router.push({
      pathname: "/specificPatient",
      params: { id: patientId },
    });
  };

  

  const params = useLocalSearchParams();

  useEffect(() => {
    let mounted = true;
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("Not signed in");
          setPatients([]);
          setLoading(false);
          return;
        }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/doctor/patients`, {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) {
          let errJson: any = null;
          try {
            errJson = await res.json();
          } catch {}
          setError((errJson && errJson.error) || "Failed to load patients");
          setPatients([]);
          setLoading(false);
          return;
        }
        const j = await res.json();
        const list = (j.patients || []).map((p: any) => ({
          id: p.uid,
          name: p.name ?? null,
          email: p.email ?? null,
          surgeryDate: p.surgeryDate ?? null,
          surgeryType: p.surgeryType ?? null,
          assignedDoctors: p.assignedDoctors ?? [],
        }));
        if (mounted) setPatients(list);
      } catch (err) {
        console.error("Error fetching patients:", err);
        if (mounted) setError("Failed to load patients");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPatients();
    return () => {
      mounted = false;
    };
  }, [params?.refreshed]);

  // Color pattern: green, orange, yellow
  const getPatientColor = (index: number) => {
    const colors = ["#009235", "#FF7A2F", "#FFBF48"];
    return colors[index % colors.length];
  };

  const getSurgeryDisplayText = (surgeryDateStr: string | null) => {
    if (!surgeryDateStr) return "";
    const monthYear = formatSurgeryMonthYear(surgeryDateStr);
    const postOp = calculatePostOpTime(surgeryDateStr);
    if (monthYear === "Not provided") return "";
    return postOp ? `${monthYear} (${postOp})` : monthYear;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi {greeting}!</Text>
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
                    index < filteredPatients.length - 1 && styles.patientDivider,
                  ]}
                  onPress={() => handlePatientPress(patient.id)}
                >
                  <View style={styles.patientLeft}>
                    <HeartPulse
                      size={28}
                      color={getPatientColor(index)}
                      strokeWidth={2}
                    />
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{patient.name ?? ""}</Text>
                      {(patient.surgeryType || patient.surgeryDate) ? (
                        <Text style={styles.patientSubtitle}>
                          {patient.surgeryType ?? ""}
                          {patient.surgeryDate ? ` • ${getSurgeryDisplayText(patient.surgeryDate)}` : ""}
                        </Text>
                      ) : null}
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
