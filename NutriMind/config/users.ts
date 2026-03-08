import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

export type UserRole = "patient" | "healthcare_prof";

export type UserProfile = {
  email: string | null;
  role: UserRole;
  name?: string;
  dateOfBirth?: string;
  sex?: string; 
  height?: number;
  weight?: string;
  isPreOp?: boolean;
  surgeryDate?: string;
  surgeryType?: string;
  hasDiabetes?: boolean;
  hasHighBloodPressure?: boolean;
  hasHighCholesterol?: boolean;
  hasDumpingSyndrome?: boolean;
  intolerances?: string[];
  proteinGoal?: number;
  fluidGoal?: number;
  calorieGoal?: number;
  tastePreferences?: { sweet: number; spicy: number; savory: number; bitter: number; sour: number };
  dislikedFoods?: string;
  favoriteCuisines?: string[];
  allergies?: string[];
  // Weight-related fields
  currentWeight?: number | null;
  startingWeight?: number | null;
  goalWeight?: number | null;
  weightDate?: string | null;
  createdAt: any;
  updatedAt: any;
};

export async function ensureUserDoc(uid: string, email?: string | null) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: email ?? null,
      role: "patient" as UserRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserRole(uid: string): Promise<UserRole> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("User doc does NOT exist for:", uid);
    return "patient";
  }

  const data = snap.data();
  console.log("Firestore user data:", data);

  const role = data?.role;
  console.log("Firestore role value:", role);

  return role === "healthcare_prof" ? "healthcare_prof" : "patient";
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "email" | "role" | "createdAt" | "updatedAt">>
) {
  const ref = doc(db, "users", uid);
  const cleaned: Record<string, any> = {};
  Object.entries(updates).forEach(([k, v]) => {
    if (v !== undefined) cleaned[k] = v;
  });
  if (Object.keys(cleaned).length === 0) return;
  await updateDoc(ref, {
    ...cleaned,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserProfile(
  uid: string,
  profile: Partial<UserProfile>
) {
  const ref = doc(db, "users", uid);
  // Clean the profile object to remove any `undefined` values. Firestore
  // rejects writes that contain undefined fields. Only set keys that are explicitly provided.
  const cleaned: Record<string, any> = {};
  Object.entries(profile).forEach(([k, v]) => {
    if (v !== undefined) cleaned[k] = v;
  });
  if (Object.keys(cleaned).length === 0) {
    await updateDoc(ref, { updatedAt: serverTimestamp() });
    return;
  }
  await setDoc(ref, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
}
