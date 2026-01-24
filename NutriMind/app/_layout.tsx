import { Stack } from "expo-router";
import { UserProvider } from "@/context/UserContext";
import "../global.css";

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UserProvider>
  );
}
