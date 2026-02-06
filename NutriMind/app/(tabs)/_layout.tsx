import { Tabs } from "expo-router";
import { Home, Plus, MessageCircle, Clock, Settings, Stethoscope } from "lucide-react-native";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { auth } from "@/config/firebase";
import { getUserRole } from "@/config/users";

export default function TabsLayout() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const u = auth.currentUser;
    if (!u) return;

    getUserRole(u.uid)
      .then((r) => {
        if (mounted) setRole(r);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const isDoctor = role === "healthcare_prof";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#008080",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarShowLabel: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
          marginBottom: Platform.OS === "android" ? 5 : 0,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {/* Leave these alone */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />

      {/* Add these ONLY for doctors */}
      <Tabs.Screen
        name="doctorDashboard"
        options={{
          href: isDoctor ? undefined : null, // hide from tab bar unless doctor
          title: "Doctor",
          tabBarIcon: ({ color, size }) => <Stethoscope size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctorInvites"
        options={{
          href: isDoctor ? undefined : null, // hide from tab bar unless doctor
          title: "Invites",
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
        }}
      />



      {/* hidden/detail routes (leave these alone) */}
      <Tabs.Screen
        name="log-fluid"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="log-vitamins"
        options={{
          href: null,
          headerShown: false,
        }}
      />
            {/* You have this route file; hide it unless you want it as a tab */}
      <Tabs.Screen
        name="doctorPatients"
        options={{
          href: null, // keeps it accessible via navigation but not visible as a tab
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
