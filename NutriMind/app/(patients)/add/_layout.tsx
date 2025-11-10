import { Stack } from "expo-router";

export default function AddStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="meal-entry" options={{ title: "Meal Entry" }} />
      <Stack.Screen name="liquid-entry" options={{ title: "Liquid Entry" }} />
    </Stack>
  );
}