import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { ensureUserDoc, getUserRole, UserRole } from "@/config/users";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUserRole(null);
          return;
        }

        await ensureUserDoc(user.uid, user.email);
        const role = await getUserRole(user.uid);
        setUserRole(role);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) return null;

  if (!userRole) return <Redirect href="/(auth)/login" />;

  if (userRole === "healthcare_prof") {
    return <Redirect href="/(healthcare_prof)/(tabs)/HealthcareDashboard" />;
  }

  return <Redirect href="/(patients)/PatientDashboard" />;
}
