import { Tabs } from "expo-router";
import { Home, Plus, MessageCircle, Clock, Settings, HeartPulse } from "lucide-react-native";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#009235",
        tabBarInactiveTintColor: "#7A9C8A",
        tabBarStyle: {
          backgroundColor: "#FFF8E7",
          borderTopWidth: 1,
          borderTopColor: "#E6DDC8",
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
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
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

      {/* Doctor Dashboard Tab */}
      <Tabs.Screen
        name="doctorDashboard"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, size }) => <HeartPulse size={size} color={color} />,
        }}
      />

      {/* Hidden Screens */}
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
    </Tabs>
  );
}