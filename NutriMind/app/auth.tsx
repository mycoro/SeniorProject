import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Leaf, Mail, Lock, User, Eye, EyeOff } from "lucide-react-native";
import { router } from "expo-router";
import { auth } from "@/config/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ensureUserDoc } from "@/config/users";
import { useUser } from "@/context/UserContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIsOnboarded } = useUser();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserDoc(auth.currentUser!.uid, email.trim());
        router.replace("/(tabs)/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        await ensureUserDoc(userCredential.user.uid, email.trim());
        setIsOnboarded(false);
        router.replace("/onboarding");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        Alert.alert(
          "Email Already Exists",
          "This email is already registered. Would you like to login instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login",
              onPress: () => {
                setIsLogin(true);
                setPassword("");
              },
            },
          ]
        );
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.code !== "auth/email-already-in-use") {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Leaf size={40} color="white" />
            </View>
            <Text style={styles.appName}>NutriMind</Text>
            <Text style={styles.tagline}>Bariatric Recovery Tracker</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <Pressable
                onPress={() => setIsLogin(true)}
                style={[styles.tab, isLogin && styles.tabActive]}
              >
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                  Login
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsLogin(false)}
                style={[styles.tab, !isLogin && styles.tabActive]}
              >
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconLeft}>
                      <User size={16} color="#94a3b8" />
                    </View>
                    <TextInput
                      placeholder="John Doe"
                      value={name}
                      onChangeText={setName}
                      style={styles.input}
                      editable={!loading}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconLeft}>
                    <Mail size={16} color="#94a3b8" />
                  </View>
                  <TextInput
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconLeft}>
                    <Lock size={16} color="#94a3b8" />
                  </View>
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.iconRight}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color="#94a3b8" />
                    ) : (
                      <Eye size={16} color="#94a3b8" />
                    )}
                  </Pressable>
                </View>
              </View>

              {isLogin && (
                <Pressable>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleSubmit}
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLogin ? "Login" : "Create Account"}
                  </Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.legal}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
    minHeight: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: "#003366",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
  },
  tagline: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    width: "100%",
    maxWidth: 384,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#003366",
    borderColor: "#003366",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  tabTextActive: {
    color: "white",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    marginBottom: 4,
  },
  inputWrapper: {
    position: "relative",
  },
  iconLeft: {
    position: "absolute",
    left: 12,
    top: "50%",
    zIndex: 10,
    marginTop: -8,
  },
  iconRight: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -8,
  },
  input: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    fontSize: 14,
  },
  forgotPassword: {
    fontSize: 14,
    color: "#008080",
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#003366",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  legal: {
    textAlign: "center",
    fontSize: 12,
    color: "#64748b",
    marginTop: 16,
  },
});
