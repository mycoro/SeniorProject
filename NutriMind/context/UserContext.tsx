import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/config/firebase";
import { db } from "@/config/firebase";
import { getUserProfile, updateUserProfile } from "@/config/users";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, doc, updateDoc, query, orderBy, Timestamp, serverTimestamp, onSnapshot } from "firebase/firestore";

export interface TastePreferences {
  sweet: number;
  spicy: number;
  savory: number;
  bitter: number;
  sour: number;
}

export interface UserProfile {
  role?: "patient" | "healthcare_prof";
  name?: string;
  dateOfBirth?: string;
  sex?: string; 
  weight?: string;
  // Weight fields (may be number in stored profile, but UI sometimes uses string during onboarding)
  currentWeight?: number | string;
  startingWeight?: number | string;
  goalWeight?: number | string;
  weightDate?: string;
  isPreOp?: boolean;
  surgeryDate?: string;
  surgeryType?: "Gastric Sleeve" | "Gastric Bypass" | "Duodenal Switch";
  hasDiabetes?: boolean;
  hasHighBloodPressure?: boolean;
  hasHighCholesterol?: boolean;
  hasDumpingSyndrome?: boolean;
  intolerances?: string[];
  proteinGoal?: number;
  fluidGoal?: number;
  calorieGoal?: number;
  tastePreferences?: TastePreferences;
  dislikedFoods?: string;
  favoriteCuisines?: string[];
  allergies?: string[];
  assignedDoctors?: string[];

  // Doctor-specific fields
  isDoctor?: boolean;
  specialty?: string;
  licenseNumber?: string | null;
  yearsExperience?: string | null;
  practiceType?: string | null;
}

export type MealLogUpdate = Partial<Omit<MealLog, "id">>;

interface UserContextType {
  userProfile: UserProfile | null;
  userRole: "patient" | "healthcare_prof" | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  dailyLogs: MealLog[];
  addMealLog: (meal: MealLog) => void;
  updateMealLog: (logId: string, updates: MealLogUpdate) => Promise<void>;
  loading: boolean;
}

export interface MealLog {
  id: string;
  name: string;
  protein: number;
  calories: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Fluid";
  timestamp: Date;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<"patient" | "healthcare_prof" | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyLogs, setDailyLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    let unsubscribeLogs: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeLogs) {
        unsubscribeLogs();
        unsubscribeLogs = null;
      }

      if (user) {
        try {
          const rawProfile = await getUserProfile(user.uid);
          if (rawProfile) {
            const nameToUse = (rawProfile as UserProfile).name?.trim() || user.displayName?.trim();
            if (nameToUse && !(rawProfile as UserProfile).name?.trim()) {
              try {
                await updateUserProfile(user.uid, { name: nameToUse });
              } catch (_) {}
            }
            const profile: UserProfile = {
              // include role and doctor-specific fields when available
              role: (rawProfile as any).role,
              name: (rawProfile as UserProfile).name?.trim() || nameToUse || undefined,
              dateOfBirth: (rawProfile as UserProfile).dateOfBirth,
              sex: (rawProfile as UserProfile).sex,
              isPreOp: rawProfile.isPreOp,
              surgeryDate: rawProfile.surgeryDate,
              surgeryType: rawProfile.surgeryType as UserProfile["surgeryType"],
              hasDiabetes: rawProfile.hasDiabetes,
              hasHighBloodPressure: rawProfile.hasHighBloodPressure,
              hasHighCholesterol: rawProfile.hasHighCholesterol,
              intolerances: rawProfile.intolerances,
              proteinGoal: rawProfile.proteinGoal,
              fluidGoal: rawProfile.fluidGoal,
              calorieGoal: rawProfile.calorieGoal,
              tastePreferences: (rawProfile as UserProfile).tastePreferences,
              dislikedFoods: (rawProfile as UserProfile).dislikedFoods,
              favoriteCuisines: (rawProfile as UserProfile).favoriteCuisines,
              allergies: (rawProfile as UserProfile).allergies,
              // weight fields
              currentWeight: (rawProfile as any).currentWeight ?? (rawProfile as any).weight ?? undefined,
              startingWeight: (rawProfile as any).startingWeight ?? undefined,
              goalWeight: (rawProfile as any).goalWeight ?? undefined,
                weightDate: (rawProfile as any).weightDate ?? undefined,
                hasDumpingSyndrome: (rawProfile as any).hasDumpingSyndrome ?? undefined,
              isDoctor: (rawProfile as any).isDoctor,
              specialty: (rawProfile as any).specialty,
              licenseNumber: (rawProfile as any).licenseNumber ?? null,
              yearsExperience: (rawProfile as any).yearsExperience ?? null,
              practiceType: (rawProfile as any).practiceType ?? null,
              assignedDoctors: (rawProfile as any).assignedDoctors ?? [],
            };

            const hasOnboardingData = Boolean(
              ((profile.role === "healthcare_prof" || profile.isDoctor) 
                ? (profile.name && profile.specialty && profile.practiceType)
                : (profile.surgeryDate && profile.surgeryType && profile.name))
            );

            setUserProfile(profile);
            setUserRole(((rawProfile as any).role === "healthcare_prof") ? "healthcare_prof" : "patient");
            setIsOnboarded(hasOnboardingData);
          } else {
            setUserProfile(null);
            setIsOnboarded(false);
            setUserRole(null);
          }

          const logsRef = collection(db, "users", user.uid, "mealLogs");
          const logsQuery = query(logsRef, orderBy("timestamp", "desc"));
          
          unsubscribeLogs = onSnapshot(
            logsQuery,
            (snapshot) => {
              const loadedLogs: MealLog[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const ts = data.timestamp;
                const timestamp =
                  ts && typeof ts.toDate === "function"
                    ? ts.toDate()
                    : ts instanceof Date
                    ? ts
                    : new Date(ts);
                const mealType = data.mealType;
                const validMealType =
                  mealType === "Breakfast" || mealType === "Lunch" || mealType === "Dinner" || mealType === "Snack" || mealType === "Fluid"
                    ? mealType
                    : "Snack";
                loadedLogs.push({
                  id: docSnap.id,
                  name: data.name ?? "",
                  protein: Number(data.protein) || 0,
                  calories: Number(data.calories) || 0,
                  carbs: data.carbs,
                  fat: data.fat,
                  sugar: data.sugar,
                  mealType: validMealType,
                  timestamp: timestamp instanceof Date && !isNaN(timestamp.getTime()) ? timestamp : new Date(),
                });
              });
              setDailyLogs(loadedLogs);
            },
            (error) => {
              console.error("Error listening to meal logs:", error);
              setDailyLogs([]);
            }
          );
        } catch (error) {
          console.error("Error loading user profile or logs:", error);
          setUserProfile(null);
          setIsOnboarded(false);
          setDailyLogs([]);
        }
      } else {
        setUserProfile(null);
        setIsOnboarded(false);
        setDailyLogs([]);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeLogs) {
        unsubscribeLogs();
      }
    };
  }, []);

  const addMealLog = async (meal: MealLog) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("Cannot add meal log: user not authenticated");
      return;
    }

    try {
      const logsRef = collection(db, "users", user.uid, "mealLogs");
      await addDoc(logsRef, {
        name: meal.name,
        protein: meal.protein,
        calories: meal.calories,
        carbs: meal.carbs ?? 0,
        fat: meal.fat ?? 0,
        sugar: meal.sugar ?? 0,
        mealType: meal.mealType,
        timestamp: Timestamp.fromDate(meal.timestamp),
        createdAt: serverTimestamp(),
      });

    } catch (error: any) {
      console.error("Error saving meal log to Firestore:", error);
      
      if (error?.code === "permission-denied" || error?.message?.includes("permissions")) {
        console.error("Firebase permission error. Please update Firestore security rules in Firebase Console.");
        console.error("Go to: Firebase Console > Firestore Database > Rules");
        console.error("Copy the rules from firestore.rules file in the project root.");
      }
      
      setDailyLogs((prev) => [meal, ...prev]);
    }
  };

  const updateMealLog = async (logId: string, updates: MealLogUpdate) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("Cannot update meal log: user not authenticated");
      return;
    }
    const docRef = doc(db, "users", user.uid, "mealLogs", logId);
    const payload: Record<string, unknown> = { ...updates };
    if (updates.timestamp !== undefined) {
      payload.timestamp = Timestamp.fromDate(
        updates.timestamp instanceof Date ? updates.timestamp : new Date(updates.timestamp)
      );
    }
    await updateDoc(docRef, payload);
  };

  return (
    <UserContext.Provider
      value={{
        userProfile,
        userRole,
        setUserProfile,
        isOnboarded,
        setIsOnboarded,
        dailyLogs,
        addMealLog,
        updateMealLog,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

