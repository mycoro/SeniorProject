import { Redirect } from "expo-router";

// For now, always start on the login/signup screen.
// From there, the user can sign in or create an account,
// and the rest of the navigation is handled by the auth/onboarding flow.
export default function Index() {
  return <Redirect href="/auth" />;
}
