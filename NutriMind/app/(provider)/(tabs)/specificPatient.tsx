import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChevronLeft, Activity, Target, TrendingUp } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { auth } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";

type PatientData = {
  id: string;
  name: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  surgeryType?: string | null;
  surgeryDate?: string | null;
  currentWeight?: number | null;
  startingWeight?: number | null;
  goalWeight?: number | null;
  proteinGoal?: number | null;
  fluidGoal?: number | null;
  calorieGoal?: number | null;
  notes?: string | null;
};

export default function SpecificPatient() {
  const { id } = useLocalSearchParams();
  const patientId = String(id || "");
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [todayProtein, setTodayProtein] = useState<number | null>(null);
  const [todayCalories, setTodayCalories] = useState<number | null>(null);
  const [todayFluids, setTodayFluids] = useState<number | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleSaveNotes = async () => {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/doctor/patient/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ patientId, notes: notes ?? null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error || 'Failed to save notes');
      }
      Alert.alert('Success', 'Notes saved successfully!');
    } catch (err: any) {
      console.error('Failed to save notes:', err);
      Alert.alert('Error', err?.message || 'Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const weightLoss =
    (patient?.startingWeight != null && patient?.currentWeight != null)
      ? (patient.startingWeight - patient.currentWeight)
      : null;
  const weightLossPercentage =
    weightLoss != null && patient && patient.startingWeight
      ? ((weightLoss / (patient.startingWeight || 1)) * 100).toFixed(1)
      : null;

  // compute days post-op
  const daysPostOp = (() => {
    try {
      if (patient?.surgeryDate) {
        const d = new Date(patient.surgeryDate);
        if (!isNaN(d.getTime())) {
          const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          return diff;
        }
      }
    } catch {}
    return null;
  })();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!patientId) {
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }

        const user = auth.currentUser;
        if (!user) {
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }
        const idToken = await user.getIdToken();
        const resp = await fetch(`${API_BASE_URL}/api/doctor/patient?patientId=${encodeURIComponent(patientId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!resp.ok) {
          let errJson = null;
          try { errJson = await resp.json(); } catch {}
          console.error('Failed to fetch patient', errJson);
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }
        const j = await resp.json();
        const p = j.patient || {};
        if (mounted) {
          setPatient({
            id: p.uid,
            name: p.name ?? null,
            gender: p.gender ?? null,
            dateOfBirth: p.dateOfBirth ?? null,
            surgeryType: p.surgeryType ?? null,
            surgeryDate: p.surgeryDate ?? null,
            currentWeight: p.currentWeight ?? null,
            startingWeight: p.startingWeight ?? null,
            goalWeight: p.goalWeight ?? null,
            proteinGoal: p.proteinGoal ?? null,
            fluidGoal: p.fluidGoal ?? null,
            calorieGoal: p.calorieGoal ?? null,
            notes: p.notes ?? null,
          });
          setNotes(p.notes ?? null);
          const today = j.today || {};
          setTodayProtein(today.protein ?? null);
          setTodayCalories(today.calories ?? null);
          setTodayFluids(today.fluids ?? null);
        }
      } catch (err) {
        console.error("Failed to load patient or logs:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#004734" />
          </Pressable>
          <Text style={styles.title}>{patient?.name ?? ""}</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009235" />
          </View>
        ) : (
          <>
            {/* Patient Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Patient Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>{patient?.dateOfBirth ? (() => {
                    const dob = new Date(patient.dateOfBirth as string);
                    if (!isNaN(dob.getTime())) {
                      const today = new Date();
                      let age = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                      return `${age} years`;
                    }
                    return "n/a";
                  })() : "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>{patient?.gender ?? "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery</Text>
                <Text style={styles.detailValue}>{patient?.surgeryType ?? "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery Date</Text>
                <Text style={styles.detailValue}>{patient?.surgeryDate ?? "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Days Post-Op</Text>
                <Text style={styles.detailValue}>{daysPostOp != null ? `${daysPostOp} days` : "n/a"}</Text>
              </View>
            </View>

            {/* Weight Progress Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Progress</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Activity size={20} color="#FF7A2F" />
                  <Text style={styles.statValue}>{patient?.currentWeight ?? "n/a"}</Text>
                  <Text style={styles.statLabel}>Current</Text>
                </View>
                <View style={styles.statCard}>
                  <Target size={20} color="#009235" />
                  <Text style={styles.statValue}>{patient?.goalWeight ?? "n/a"}</Text>
                  <Text style={styles.statLabel}>Goal</Text>
                </View>
                <View style={styles.statCard}>
                  <TrendingUp size={20} color="#3b82f6" />
                  <Text style={styles.statValue}>{weightLoss != null ? `-${weightLoss}` : "n/a"}</Text>
                  <Text style={styles.statLabel}>Lost ({weightLossPercentage ?? "n/a"}%)</Text>
                </View>
              </View>
            </View>

            {/* Today's Nutrition Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today's Nutrition</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{todayProtein != null ? `${todayProtein}g` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.proteinGoal ?? "n/a"}g</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Fluids</Text>
                  <Text style={styles.macroValue}>{todayFluids != null ? `${todayFluids}oz` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.fluidGoal ?? "n/a"}oz</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <Text style={styles.macroValue}>{todayCalories != null ? `${todayCalories}` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.calorieGoal ?? "n/a"}</Text>
                </View>
              </View>
            </View>

            {/* Notes Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Clinical Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes ?? ""}
                onChangeText={setNotes}
                placeholder="Add notes about this patient..."
                placeholderTextColor="#7A9C8A"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Pressable 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSaveNotes}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },

  /* Loading */
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  /* Cards */
  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 16,
  },

  /* Detail Rows */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E3D4",
  },
  detailLabel: {
    fontSize: 14,
    color: "#3F5E52",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#004734",
    fontWeight: "600",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004734",
  },
  statLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "500",
    textAlign: "center",
  },

  /* Macros */
  macrosGrid: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "600",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },
  macroGoal: {
    fontSize: 11,
    color: "#7A9C8A",
    fontWeight: "500",
  },

  /* Notes */
  notesInput: {
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#004734",
    minHeight: 120,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#009235",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});