import { useState } from "react";
import {
  TextInput,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "@/config/firebase";
import { ensureUserDoc } from "@/config/users";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignup() {
    setErr(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErr("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await ensureUserDoc(cred.user.uid, cred.user.email);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>Create account</Text>

          <Text style={{ marginBottom: 6 }}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          />

          <Text style={{ marginBottom: 6 }}>Password</Text>
          <TextInput
            placeholder="Min 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          />

          {err ? <Text style={{ color: "red", marginBottom: 12 }}>{err}</Text> : null}

          <Pressable
            onPress={onSignup}
            disabled={loading}
            style={{
              backgroundColor: "#004734",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {loading ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={{ color: "#004734", fontWeight: "600" }}>Back to login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
