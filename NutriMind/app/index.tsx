console.log("INDEX PAGE RENDERED");

import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { auth } from "@/config/firebase";
import { getUserRole } from "@/config/users";
import { onAuthStateChanged } from "firebase/auth";
import { View, ActivityIndicator } from "react-native";

import { signOut } from "firebase/auth";

export default function Index() {
  const [user, setUser] = useState<any>(undefined);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔥 AUTH LISTENER FIRED");
      if (!firebaseUser) {
        console.log("❌ No user");
        setUser(null);
        return;
      }

console.log("Logged in UID:", firebaseUser.uid);  

      setUser(firebaseUser);

      try {
        const r = await getUserRole(firebaseUser.uid);
        console.log("Role from getUserRole:", r); 
        setRole(r);
      } catch (err) {
        console.log("Role error:", err);
      }
    });

    return unsubscribe;
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!role) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (role === "healthcare_prof") {
    return <Redirect href="/doctorDashboard" />;
  }

  return <Redirect href="/dashboard" />;
}