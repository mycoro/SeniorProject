import { Redirect } from "expo-router";
import { useUser } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function Index() {
  const { isOnboarded, userProfile, loading } = useUser();
  const user = auth.currentUser;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!isOnboarded || !userProfile?.surgeryDate) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
});
