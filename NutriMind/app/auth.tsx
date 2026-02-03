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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ensureUserDoc, setUserProfile } from "@/config/users";
import { useUser } from "@/context/UserContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIsOnboarded } = useUser();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isLogin && !firstName.trim()) {
      Alert.alert("Error", "Please enter at least your first name");
      return;
    }
    if (!isLogin && !lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
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
        const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
          .filter(Boolean)
          .join(" ");
        await updateProfile(userCredential.user, { displayName: fullName });
        await setUserProfile(userCredential.user.uid, { name: fullName });
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
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconLeft}>
                        <User size={16} color="#94a3b8" />
                      </View>
                      <TextInput
                        placeholder="John"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={styles.input}
                        editable={!loading}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Middle Name (optional)</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconLeft}>
                        <User size={16} color="#94a3b8" />
                      </View>
                      <TextInput
                        placeholder="Michael"
                        value={middleName}
                        onChangeText={setMiddleName}
                        style={styles.input}
                        editable={!loading}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconLeft}>
                        <User size={16} color="#94a3b8" />
                      </View>
                      <TextInput
                        placeholder="Doe"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.input}
                        editable={!loading}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </>
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
                    placeholder="Enter your Password"
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
    backgroundColor: "#FFFDF4", // cream
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

  /* logo */
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: "#009235", // green
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#004734",
  },
  tagline: {
    color: "#3F5E52",
    fontSize: 14,
    marginTop: 4,
  },

  /* card */
  card: {
    width: "100%",
    maxWidth: 384,
    backgroundColor: "#FFF8E7", // soft cream
    borderRadius: 20,
    padding: 24,
    elevation: 3,
  },

  /* tabs */
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    alignItems: "center",
    backgroundColor: "#FFFDF4",
  },
  tabActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3F5E52",
  },
  tabTextActive: {
    color: "white",
  },

  /* form */
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: "#004734",
    fontSize: 14,
    fontWeight: "600",
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
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 14,
    fontSize: 14,
    backgroundColor: "#FFFDF4",
    color: "#004734",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#ff7739", // orange
    fontWeight: "600",
  },

  /* button */
  submitButton: {
    width: "100%",
    backgroundColor: "#009235",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },

  /* legal */
  legal: {
    textAlign: "center",
    fontSize: 12,
    color: "#3F5E52",
    marginTop: 18,
  },
});