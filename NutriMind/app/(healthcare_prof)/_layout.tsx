import { Stack } from "expo-router";

export default function HealthcareProfLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The tab layout (Dashboard + Settings) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Hidden screen for when a patient is clicked */}
      <Stack.Screen
        name="PatientDetails"
        options={{
          title: "Patient Details",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
