import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

export type UserRole = "patient" | "healthcare_prof";

export type UserProfile = {
  email: string | null;
  role: UserRole;
  name?: string;
  dateOfBirth?: string;
  isPreOp?: boolean;
  surgeryDate?: string;
  surgeryType?: string;
  hasDiabetes?: boolean;
  hasDumpingSyndrome?: boolean;
  intolerances?: string[];
  proteinGoal?: number;
  fluidGoal?: number;
  calorieGoal?: number;
  tastePreferences?: { sweet: number; spicy: number; savory: number; bitter: number; sour: number };
  dislikedFoods?: string;
  favoriteCuisines?: string[];

  // Doctor-specific fields
  isDoctor?: boolean;
  specialty?: string;
  licenseNumber?: string | null;
  yearsExperience?: string | null;
  practiceType?: string | null;

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

  const role = snap.data()?.role;
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
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserProfile(
  uid: string,
  profile: Partial<UserProfile>
) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
