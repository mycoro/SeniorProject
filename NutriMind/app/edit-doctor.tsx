import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { useUser, UserProfile } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { updateProfile } from "firebase/auth";
import { setUserProfile as saveUserProfile } from "@/config/users";

export default function EditDoctor() {
  const { userProfile: existingProfile, setUserProfile, setIsOnboarded } = useUser();
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    licenseNumber: "",
    yearsExperience: "",
    practiceType: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existingProfile) return;
    setForm({
      name: existingProfile.name || "",
      specialty: existingProfile.specialty || "",
      licenseNumber: existingProfile.licenseNumber || "",
      yearsExperience: existingProfile.yearsExperience || "",
      practiceType: existingProfile.practiceType || "",
    });
  }, [existingProfile]);

  const handleSave = async () => {
    const name = form.name.trim();
    const specialty = form.specialty.trim();
    const practiceType = form.practiceType.trim();

    if (!name) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    if (!specialty) {
      Alert.alert("Required", "Please enter your specialty.");
      return;
    }
    if (!practiceType) {
      Alert.alert("Required", "Please enter your practice type.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save.");
      return;
    }

    setSaving(true);
    try {
      try {
        await updateProfile(user, { displayName: name });
      } catch (_) {}

      await saveUserProfile(user.uid, {
        role: "healthcare_prof",
        isDoctor: true,
        name,
        specialty,
        licenseNumber: form.licenseNumber || null,
        yearsExperience: form.yearsExperience || null,
        practiceType: practiceType || null,
      } as Partial<UserProfile>);

      setUserProfile({
        ...(existingProfile || {}),
        role: "healthcare_prof",
        isDoctor: true,
        name,
        specialty,
        licenseNumber: form.licenseNumber || null,
        yearsExperience: form.yearsExperience || null,
        practiceType: practiceType || null,
      } as UserProfile);

      setIsOnboarded(Boolean(name && specialty && practiceType));
      Alert.alert("Saved", "Doctor profile saved.");
      router.back();
    } catch (error) {
      console.error("Error saving doctor profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backTouch}>
          <ChevronLeft size={22} color="#004734" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Edit Doctor Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Full name</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm((s) => ({ ...s, name: t }))} placeholder="Dr. Jane Doe" />

          <Text style={styles.sectionLabel}>Specialty</Text>
          <TextInput style={styles.input} value={form.specialty} onChangeText={(t) => setForm((s) => ({ ...s, specialty: t }))} placeholder="Bariatric Surgery" />

          <Text style={styles.sectionLabel}>Practice Type</Text>
          <TextInput style={styles.input} value={form.practiceType} onChangeText={(t) => setForm((s) => ({ ...s, practiceType: t }))} placeholder="Private Clinic" />

          <Text style={styles.sectionLabel}>Years of Experience</Text>
          <TextInput style={styles.input} value={form.yearsExperience} onChangeText={(t) => setForm((s) => ({ ...s, yearsExperience: t }))} placeholder="5" keyboardType="numeric" />

          <Text style={styles.sectionLabel}>License Number (optional)</Text>
          <TextInput style={styles.input} value={form.licenseNumber} onChangeText={(t) => setForm((s) => ({ ...s, licenseNumber: t }))} placeholder="12345678" />
        </View>

        <View style={styles.footer}>
          <Pressable onPress={handleSave} style={[styles.saveButton, saving && styles.saveButtonDisabled]} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFDF4" },
  header: { height: 64, alignItems: "center", justifyContent: "space-between", flexDirection: "row", paddingHorizontal: 12, backgroundColor: "#FFFDF4" },
  backTouch: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { color: "#004734", fontSize: 16, marginLeft: 4 },
  title: { fontSize: 18, fontWeight: "700", color: "#004734" },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFF8E7", borderRadius: 12, padding: 16, gap: 12, marginBottom: 16 },
  sectionLabel: { color: "#004734", fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "#FFFDF4", borderWidth: 1, borderColor: "#D6C89A", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, color: "#004734", marginBottom: 8 },
  footer: { paddingHorizontal: 16 },
  saveButton: { backgroundColor: "#009235", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: "white", fontWeight: "700" },
});
