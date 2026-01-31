import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/config/firebase";
import { db } from "@/config/firebase";
import { getUserProfile } from "@/config/users";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, onSnapshot } from "firebase/firestore";


export interface TastePreferences {
  sweet: number;
  spicy: number;
  savory: number;
  bitter: number;
  sour: number;
}

export interface UserProfile {
  name?: string;
  isPreOp?: boolean;
  surgeryDate?: string;
  surgeryType?: "Gastric Sleeve" | "Gastric Bypass" | "Duodenal Switch";
  hasDiabetes?: boolean;
  hasDumpingSyndrome?: boolean;
  intolerances?: string[];
  proteinGoal?: number;
  fluidGoal?: number;
  calorieGoal?: number;

  tastePreferences?: TastePreferences;
  dislikedFoods?: string;
  favoriteCuisines?: string[];
}

interface UserContextType {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  dailyLogs: MealLog[];
  addMealLog: (meal: MealLog) => void;
  loading: boolean;
}

export interface MealLog {
  id: string;
  name: string;
  protein: number;
  calories: number;
  carbs?: number;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  timestamp: Date;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
          const profile = await getUserProfile(user.uid);
          if (profile) {
            const hasOnboardingData = Boolean(
              profile.surgeryDate &&
              profile.surgeryType &&
              profile.name
            );
            setUserProfile(profile as UserProfile);
            setIsOnboarded(hasOnboardingData);
          } else {
            setUserProfile(null);
            setIsOnboarded(false);
          }

          const logsRef = collection(db, "users", user.uid, "mealLogs");
          const logsQuery = query(logsRef, orderBy("timestamp", "desc"));
          
          unsubscribeLogs = onSnapshot(
            logsQuery,
            (snapshot) => {
              const loadedLogs: MealLog[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                loadedLogs.push({
                  id: doc.id,
                  name: data.name,
                  protein: data.protein,
                  calories: data.calories,
                  carbs: data.carbs,
                  mealType: data.mealType,
                  timestamp: data.timestamp?.toDate() || new Date(),
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
        carbs: meal.carbs || 0,
        mealType: meal.mealType,
        timestamp: Timestamp.fromDate(meal.timestamp),
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

  return (
    <UserContext.Provider
      value={{
        userProfile,
        setUserProfile,
        isOnboarded,
        setIsOnboarded,
        dailyLogs,
        addMealLog,
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
