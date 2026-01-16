import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

type MealDoc = {
  id: string;
  date?: string; // ISO string you saved
  mealType?: string;
  foodDescription?: string;
  macros?: {
    calories?: { value: number; unit: string } | null;
    protein?: { value: number; unit: string } | null;
    carbs?: { value: number; unit: string } | null;
    fiber?: { value: number; unit: string } | null;
  };
};

type LiquidDoc = {
  id: string;
  date?: string; // ISO string you saved
  liquidType?: string;
  amount?: { value: number; unit: string };
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Converts to liters for the summary (supports mL, L, oz, cups)
function toLiters(value: number, unit: string) {
  const u = unit.toLowerCase();
  if (u === "l") return value;
  if (u === "ml") return value / 1000;
  if (u === "oz") return (value * 29.5735) / 1000;
  if (u === "cups") return (value * 236.588) / 1000;
  return 0;
}

export default function PatientDashboard() {
  const [meals, setMeals] = useState<MealDoc[]>([]);
  const [liquids, setLiquids] = useState<LiquidDoc[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErr("Not signed in");
      return;
    }

    // Meals listener (latest 20)
    const mealsQ = query(
      collection(db, "patients", uid, "meals"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubMeals = onSnapshot(
      mealsQ,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MealDoc[];
        setMeals(rows);
      },
      (e) => setErr(e.message)
    );

    // Liquids listener (latest 20)
    const liquidsQ = query(
      collection(db, "patients", uid, "liquids"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubLiquids = onSnapshot(
      liquidsQ,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LiquidDoc[];
        setLiquids(rows);
      },
      (e) => setErr(e.message)
    );

    return () => {
      unsubMeals();
      unsubLiquids();
    };
  }, []);

  const today = new Date();

  const todayTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let liquidLiters = 0;

    for (const m of meals) {
      if (!m.date) continue;
      const d = new Date(m.date);
      if (!isSameDay(d, today)) continue;

      const cal = m.macros?.calories?.value;
      const pro = m.macros?.protein?.value;

      if (typeof cal === "number") calories += cal;
      if (typeof pro === "number") protein += pro;
    }

    for (const l of liquids) {
      if (!l.date) continue;
      const d = new Date(l.date);
      if (!isSameDay(d, today)) continue;

      const v = l.amount?.value;
      const u = l.amount?.unit;
      if (typeof v === "number" && typeof u === "string") {
        liquidLiters += toLiters(v, u);
      }
    }

    return {
      calories,
      protein,
      liquidLiters,
    };
  }, [meals, liquids]);

  const recentMeals = meals.slice(0, 5);
  const recentLiquids = liquids.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Patient Dashboard</Text>

      {err ? <Text style={{ color: "red", marginBottom: 12 }}>{err}</Text> : null}

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Text style={styles.label}>Calories (Today)</Text>
          <Text style={styles.value}>{todayTotals.calories || 0} kcal</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.label}>Protein (Today)</Text>
          <Text style={styles.value}>{todayTotals.protein || 0} g</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.label}>Liquid (Today)</Text>
          <Text style={styles.value}>{todayTotals.liquidLiters.toFixed(2)} L</Text>
        </View>
      </View>

      {/* Meal Log Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Logs (Recent)</Text>

        {recentMeals.length === 0 ? (
          <Text style={styles.emptyText}>No meals logged yet.</Text>
        ) : (
          recentMeals.map((m) => {
            const cal = m.macros?.calories?.value;
            const pro = m.macros?.protein?.value;
            return (
              <View key={m.id} style={styles.mealCard}>
                <Text style={styles.mealTitle}>{m.mealType ?? "Meal"}</Text>
                {m.foodDescription ? (
                  <Text style={styles.mealDetail}>{m.foodDescription}</Text>
                ) : null}
                <Text style={styles.mealDetail}>Calories: {typeof cal === "number" ? `${cal} kcal` : "--"}</Text>
                <Text style={styles.mealDetail}>Protein: {typeof pro === "number" ? `${pro} g` : "--"}</Text>
                <Text style={styles.mealDetail}>
                  {m.date ? new Date(m.date).toLocaleString() : ""}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Liquid Log Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liquid Logs (Recent)</Text>

        {recentLiquids.length === 0 ? (
          <Text style={styles.emptyText}>No liquids logged yet.</Text>
        ) : (
          recentLiquids.map((l) => (
            <View key={l.id} style={styles.mealCard}>
              <Text style={styles.mealTitle}>{l.liquidType ?? "Liquid"}</Text>
              <Text style={styles.mealDetail}>
                Amount: {l.amount?.value ?? "--"} {l.amount?.unit ?? ""}
              </Text>
              <Text style={styles.mealDetail}>
                {l.date ? new Date(l.date).toLocaleString() : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    color: "#6B7280",
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  mealDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
});
