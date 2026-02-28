import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Camera, Droplets, Pill } from "lucide-react-native";
import { useUser, MealLog } from "@/context/UserContext";
import { router } from "expo-router";
import ProgressRing from "@/components/ProgressRing";
import EditLogModal from "@/components/EditLogModal";
import { getMealDisplayName } from "@/utils/mealDisplay";
import { calculatePostOpTime } from "@/utils/formatters";

const isSameCalendarDay = (logTimestamp: Date, ref: Date) =>
  logTimestamp.getFullYear() === ref.getFullYear() &&
  logTimestamp.getMonth() === ref.getMonth() &&
  logTimestamp.getDate() === ref.getDate();

export default function Dashboard() {
  const { userProfile, dailyLogs } = useUser();
  const [editLog, setEditLog] = useState<MealLog | null>(null);

  const today = new Date();
  const todayLogs = dailyLogs.filter((log) => {
    const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
    return !isNaN(t.getTime()) && isSameCalendarDay(t, today);
  });

  const recentActivity = todayLogs.slice(0, 3).map((log) => ({
    ...log,
    time: log.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mealType: log.mealType ?? "Meal",
  }));

  const isPreOp = userProfile?.isPreOp === true;

  const getDaysPostOp = () => {
    if (!userProfile?.surgeryDate) return null;
    if (isPreOp) return null; // Pre-Op: don't calculate days post-op
    
    let surgeryDate: Date;
    
    if (userProfile.surgeryDate.includes("/")) {
      const parts = userProfile.surgeryDate.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        surgeryDate = new Date(year, month, day);
      } else {
        return null;
      }
    } else {
      surgeryDate = new Date(userProfile.surgeryDate);
    }
    
    if (isNaN(surgeryDate.getTime())) {
      return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    surgeryDate.setHours(0, 0, 0, 0);
    
    const diff = Math.floor(
      (today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diff);
  };

  const daysPostOp = getDaysPostOp();
  const userName = userProfile?.name || "there";
  const proteinGoal = userProfile?.proteinGoal || undefined;
  const fluidGoal = userProfile?.fluidGoal || undefined;
  const calorieGoal = userProfile?.calorieGoal || undefined;

  const getPhase = () => {
    if (isPreOp) {
      return { number: "-", name: "Pre-Op" };
    }
    if (daysPostOp === null) {
      return { number: "-", name: "Phase not set" };
    }
    if (daysPostOp <= 14) return { number: 1, name: "Full Liquids" };
    if (daysPostOp <= 28) return { number: 2, name: "Pureed Foods" };
    if (daysPostOp <= 42) return { number: 3, name: "Soft Foods" };
    return { number: 4, name: "Stabilization" };
  };

  const phase = getPhase();
  const postOpLabel = calculatePostOpTime(userProfile?.surgeryDate);
  const subtitleText = isPreOp
    ? "Pre-Op"
    : postOpLabel
    ? postOpLabel
    : "Pre-Op";

  const totalProtein = todayLogs.reduce((sum, log) => sum + log.protein, 0);
  const totalCalories = todayLogs.reduce((sum, log) => sum + log.calories, 0);
  const totalFat = todayLogs.reduce((sum, log) => sum + (log.fat ?? 0), 0);
  const totalSugar = todayLogs.reduce((sum, log) => sum + (log.sugar ?? 0), 0);

  const getFluidAmountFromLog = (log: any) => {
    const match = log.name.match(/\((\d+(?:\.\d+)?)oz\)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  };
  
  const totalFluids = todayLogs
    .filter((log) => {
      const name = log.name.toLowerCase();
      return (
        name.includes("water") ||
        name.includes("shake") ||
        name.includes("broth") ||
        name.includes("milk") ||
        name.includes("tea") ||
        name.includes("coffee") ||
        name.includes("jell-o") ||
        name.includes("fluid") ||
        name.includes("drink") ||
        name.match(/\(\d+oz\)/)
      );
    })
    .reduce((sum, log) => {
      const fluidAmount = getFluidAmountFromLog(log);
      return sum + (fluidAmount > 0 ? fluidAmount : 0);
    }, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi {userName}!</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>

      <View style={styles.phaseBanner}>
        <Text style={styles.phaseLabel}>Current Phase</Text>
        <Text style={styles.phaseText}>
          Stage {phase.number}: {phase.name}
        </Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <ProgressRing
            label="Protein"
            current={totalProtein}
            target={proteinGoal || undefined}
            unit="g"
            color="#FFBF48"
          />
          <ProgressRing
            label="Total Fluids"
            current={totalFluids}
            target={fluidGoal || undefined}
            unit="oz"
            color="#ff7739"
          />
          <ProgressRing
            label="Calories"
            current={totalCalories}
            target={calorieGoal || undefined}
            unit=" cal"
            color="#009235"
          />
        </View>
        {(totalFat > 0 || totalSugar > 0) && (
          <View style={styles.extraNutrients}>
            <Text style={styles.extraNutrientsText}>
              Also today: {totalFat > 0 && `${totalFat.toFixed(0)}g fat`}
              {totalFat > 0 && totalSugar > 0 && " · "}
              {totalSugar > 0 && `${totalSugar.toFixed(0)}g sugar`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Pressable 
            style={styles.actionButton}
            onPress={() => router.push("../(tabs)/log")}
          >
            <Camera size={20} color="#008080" />
            <Text style={styles.actionText}>Scan Meal</Text>
          </Pressable>
          <Pressable 
            style={styles.actionButton}
            onPress={() => router.push("../(tabs)/log-fluid")}
          >
            <Droplets size={20} color="#3b82f6" />
            <Text style={styles.actionText}>Log Fluid</Text>
          </Pressable>
          <Pressable 
            style={styles.actionButton}
            onPress={() => router.push("../(tabs)/log-vitamins")}
          >
            <Pill size={20} color="#322e2b" />
            <Text style={styles.actionText}>Log Vitamins</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Meals</Text>
        <View style={styles.mealsCard}>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No Meals Logged yet</Text>
              <Text style={styles.emptyStateSubtext}>Start by Scanning or Manually Logging Your First Meal</Text>
            </View>
          ) : (
            recentActivity.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.mealItem,
                index < recentActivity.length - 1 && styles.mealDivider,
              ]}
              onPress={() => setEditLog(item)}
            >
              <View style={styles.mealLeft}>
                <View style={styles.proteinBadge}>
                  <Text style={styles.proteinText}>{item.protein}g</Text>
                </View>
                <View>
                  <Text style={styles.mealName}>{getMealDisplayName(item.name)}</Text>
                  <Text style={styles.mealTime}>{item.mealType} · {item.time}</Text>
                </View>
              </View>
              <Text style={styles.mealCalories}>{item.calories} kcal</Text>
            </Pressable>
            ))
          )}
        </View>
      </View>

      <EditLogModal
        visible={!!editLog}
        log={editLog}
        onClose={() => setEditLog(null)}
        onSaved={() => {}}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF4", // cream
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },

  /* header */
  header: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004734", // dark green
  },
  subtitle: {
    color: "#3F5E52",
    fontSize: 14,
    marginTop: 4,
  },

  /* phase banner */
  phaseBanner: {
    backgroundColor: "#009235",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  phaseLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  phaseText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    marginTop: 4,
  },

  /* progress */
  progressCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  extraNutrients: {
    marginTop: 12,
    alignItems: "center",
  },
  extraNutrientsText: {
    fontSize: 13,
    color: "#3F5E52",
    fontWeight: "500",
  },

  /* sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#004734",
    marginBottom: 10,
    fontSize: 18,
  },

  /* quick actions */
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FFF8E7",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 6,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3F5E52",
  },

  /* meals */
  mealsCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 18,
    elevation: 2,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  mealDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8E3D4",
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  proteinBadge: {
    width: 36,
    height: 36,
    backgroundColor: "#FFBF48",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  proteinText: {
    color: "#004734",
    fontSize: 12,
    fontWeight: "700",
  },

  mealName: {
    fontWeight: "600",
    color: "#004734",
    fontSize: 14,
  },
  mealTime: {
    fontSize: 12,
    color: "#3F5E52",
    marginTop: 2,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff7739",
  },

  /* empty state */
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004734",
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#3F5E52",
    textAlign: "center",
  },
});