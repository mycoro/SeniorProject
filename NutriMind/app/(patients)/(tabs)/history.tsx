import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { ChevronLeft, ChevronRight, Filter, Clock } from "lucide-react-native";
import { useUser, MealLog } from "@/context/UserContext";
import ProgressRing from "@/components/ProgressRing";
import EditLogModal from "@/components/EditLogModal";
import { getMealDisplayName } from "@/utils/mealDisplay";

const sameCalendarDay = (logTimestamp: Date, year: number, month: number, day: number) =>
  logTimestamp.getFullYear() === year &&
  logTimestamp.getMonth() === month &&
  logTimestamp.getDate() === day;

const getFluidOzFromLog = (log: MealLog): number => {
  const match = log.name.match(/\((\d+(?:\.\d+)?)\s*oz\)/i);
  if (match) return parseFloat(match[1]);
  return 0;
};

const getDayData = (logs: MealLog[], date: Date) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const dayLogs = logs.filter((log) => {
    const logTimestamp = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
    return !isNaN(logTimestamp.getTime()) && sameCalendarDay(logTimestamp, y, m, d);
  });

  const fluidsOz = dayLogs
    .filter((log) => isFluidLog(log.name))
    .reduce((sum, log) => sum + getFluidOzFromLog(log), 0);

  return {
    protein: dayLogs.reduce((sum, log) => sum + log.protein, 0),
    water: fluidsOz,
    calories: dayLogs.reduce((sum, log) => sum + log.calories, 0),
    fat: dayLogs.reduce((sum, log) => sum + (log.fat ?? 0), 0),
    sugar: dayLogs.reduce((sum, log) => sum + (log.sugar ?? 0), 0),
  };
};

const isFluidLog = (name: string) => {
  const n = name.toLowerCase();
  return (
    /\(\d+(\.\d+)?\s*oz\)/i.test(name) ||
    n.includes("water") ||
    n.includes("fluid") ||
    n.includes("shake") ||
    n.includes("broth") ||
    n.includes("milk") ||
    n.includes("tea") ||
    n.includes("coffee") ||
    n.includes("drink")
  );
};

const getMealLogsForDate = (logs: MealLog[], date: Date) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return logs
    .filter((log) => {
      const logTimestamp = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      return !isNaN(logTimestamp.getTime()) && sameCalendarDay(logTimestamp, y, m, d);
    })
    .map((log) => {
      const logTimestamp = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      const displayType = isFluidLog(log.name) ? "Fluid" : (log.mealType ?? "Meal");
      return {
        id: log.id,
        name: log.name,
        protein: log.protein,
        calories: log.calories,
        time: logTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: displayType,
      };
    })
    .sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`).getTime();
      const timeB = new Date(`2000-01-01 ${b.time}`).getTime();
      return timeB - timeA;
    });
};

export default function History() {
  const { userProfile, dailyLogs, loading } = useUser();
  const proteinGoal = userProfile?.proteinGoal ?? undefined;
  const fluidGoal = userProfile?.fluidGoal ?? undefined;
  const calorieGoal = userProfile?.calorieGoal ?? undefined;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [editLog, setEditLog] = useState<MealLog | null>(null);
  const [expandedListDate, setExpandedListDate] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    setSelectedDate((prev) => {
      if (prev.getTime() === today.getTime()) return prev;
      return today;
    });
    setCurrentDate((prev) => {
      const prevMonth = prev.getMonth();
      const prevYear = prev.getFullYear();
      const todayMonth = today.getMonth();
      const todayYear = today.getFullYear();
      if (prevMonth === todayMonth && prevYear === todayYear) return prev;
      return today;
    });
  }, []);


  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(newDate);
  };

  const selectedDayData = getDayData(dailyLogs, selectedDate);
  const selectedMeals = getMealLogsForDate(dailyLogs, selectedDate);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Pressable>
          <Filter size={20} color="#008080" />
        </Pressable>
      </View>

      <View style={styles.viewToggle}>
        <Pressable
          onPress={() => setViewMode("calendar")}
          style={[
            styles.toggleButton,
            viewMode === "calendar" && styles.toggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "calendar" && styles.toggleButtonTextActive,
            ]}
          >
            Calendar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("list")}
          style={[
            styles.toggleButton,
            viewMode === "list" && styles.toggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "list" && styles.toggleButtonTextActive,
            ]}
          >
            List
          </Text>
        </Pressable>
      </View>

      {viewMode === "calendar" ? (
        <>
          <View style={styles.calendarNav}>
            <Pressable onPress={() => navigateMonth("prev")}>
              <ChevronLeft size={20} color="#003366" />
            </Pressable>
            <Text style={styles.monthYear}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <Pressable onPress={() => navigateMonth("next")}>
              <ChevronRight size={20} color="#003366" />
            </Pressable>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.weekDaysRow}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekDay}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: startingDay }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dayDate = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const dayData = getDayData(dailyLogs, dayDate);
                const proteinPercent = proteinGoal && proteinGoal > 0 ? (dayData.protein / proteinGoal) * 100 : 0;
                const waterPercent = fluidGoal && fluidGoal > 0 ? (dayData.water / fluidGoal) * 100 : 0;
                const caloriesPercent = calorieGoal && calorieGoal > 0 ? (dayData.calories / calorieGoal) * 100 : 0;

                return (
                  <Pressable
                    key={day}
                    onPress={() => handleDayClick(day)}
                    style={[
                      styles.dayCell,
                      isSelected(day) && styles.dayCellSelected,
                      isToday(day) && !isSelected(day) && styles.dayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected(day) && styles.dayTextSelected,
                        isToday(day) && !isSelected(day) && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                    <View style={styles.dayIndicators}>
                      <View
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor:
                              proteinPercent >= 80
                                ? "#008080"
                                : proteinPercent >= 50
                                ? "#5eead4"
                                : "#e2e8f0",
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor:
                              waterPercent >= 80
                                ? "#3b82f6"
                                : waterPercent >= 50
                                ? "#93c5fd"
                                : "#e2e8f0",
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor:
                              caloriesPercent >= 80
                                ? "#f97316"
                                : caloriesPercent >= 50
                                ? "#fdba74"
                                : "#e2e8f0",
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.selectedDayCard}>
            <View style={styles.selectedDayHeader}>
              <Text style={styles.selectedDayTitle}>
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              {isToday(selectedDate.getDate()) &&
                currentDate.getMonth() === selectedDate.getMonth() && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                )}
            </View>

            <View style={styles.progressRow}>
              <ProgressRing
                label="Protein"
                current={selectedDayData.protein}
                target={proteinGoal ?? undefined}
                unit="g"
                color="#008080"
                size={60}
              />
              <ProgressRing
                label="Fluids"
                current={selectedDayData.water}
                target={fluidGoal ?? undefined}
                unit="oz"
                color="#3b82f6"
                size={60}
              />
              <ProgressRing
                label="Calories"
                current={selectedDayData.calories}
                target={calorieGoal ?? undefined}
                unit=""
                color="#f97316"
                size={60}
              />
            </View>

            <View style={styles.mealsSection}>
              <Text style={styles.mealsTitle}>Meals & fluids</Text>
              {loading ? (
                <View style={styles.emptyMeals}>
                  <Text style={styles.emptyMealsText}>Loading...</Text>
                </View>
              ) : (
                <View style={styles.mealsList}>
                  {selectedMeals.length === 0 ? (
                    <View style={styles.emptyMeals}>
                      <Text style={styles.emptyMealsText}>No meals or fluids logged for this day</Text>
                      {dailyLogs.length > 0 && (
                        <Text style={[styles.emptyMealsText, { fontSize: 12, marginTop: 4 }]}>
                          ({dailyLogs.length} total meals in database)
                        </Text>
                      )}
                    </View>
                  ) : (
                    selectedMeals.map((meal, index) => {
                      const fullLog = dailyLogs.find((l) => l.id === meal.id);
                      return (
                        <Pressable
                          key={meal.id ?? index}
                          style={styles.mealItem}
                          onPress={() => fullLog && setEditLog(fullLog)}
                        >
                          <View style={styles.mealLeft}>
                            <Clock size={16} color="#94a3b8" />
                            <View style={{ flex: 1}}>
                              <Text style={styles.mealName} numberOfLines={2} ellipsizeMode="tail">{getMealDisplayName(meal.name)}</Text>
                              <Text style={styles.mealDetails}>
                                {meal.type} at {meal.time}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.mealRight}>
                            <Text style={styles.mealProtein}>{meal.protein}g</Text>
                            <Text style={styles.mealCalories}>
                              {meal.calories} kcal
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.listView}>
          {Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - index);
            const dateKey = date.toISOString().slice(0, 10);
            const meals = getMealLogsForDate(dailyLogs, date);
            const dayData = getDayData(dailyLogs, date);
            const isExpanded = expandedListDate === dateKey;
            const visibleMeals = isExpanded ? meals : meals.slice(0, 3);
            const hasMore = meals.length > 3;

            return (
              <View key={index} style={styles.listCard}>
                <View style={styles.listCardHeader}>
                  <View>
                    <Text style={styles.listCardTitle}>
                      {index === 0
                        ? "Today"
                        : index === 1
                        ? "Yesterday"
                        : date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                    </Text>
                    <Text style={styles.listCardSubtitle}>
                      {dayData.protein}g protein | {dayData.calories} calories
                    </Text>
                  </View>
                  <ProgressRing
                    label=""
                    current={dayData.protein}
                    target={proteinGoal ?? undefined}
                    unit=""
                    color="#008080"
                    size={36}
                  />
                </View>
                <View style={styles.listMeals}>
                  {meals.length === 0 ? (
                    <Text style={styles.listEmptyMeals}>No meals or fluids logged</Text>
                  ) : (
                    <>
                      {visibleMeals.map((meal, mealIndex) => {
                        const fullLog = dailyLogs.find((l) => l.id === meal.id);
                        return (
                          <Pressable
                            key={meal.id ?? mealIndex}
                            style={styles.listMealItem}
                            onPress={() => fullLog && setEditLog(fullLog)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listMealName} numberOfLines={2} ellipsizeMode="tail">{getMealDisplayName(meal.name)}</Text>
                              <Text style={styles.listMealType}>{meal.type ?? "Meal"} · {meal.protein}g</Text>
                            </View>
                            <Text style={styles.listMealProtein}>{meal.calories} kcal</Text>
                          </Pressable>
                        );
                      })}
                      {hasMore && (
                        <Pressable
                          style={styles.listMoreMealsTouchable}
                          onPress={() => setExpandedListDate(isExpanded ? null : dateKey)}
                        >
                          <Text style={styles.listMoreMeals}>
                            {isExpanded
                              ? "Show less"
                              : `+${meals.length - 3} more meals`}
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

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
    backgroundColor: "#FFFDF4",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
    flexGrow: 1,
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },

  /* toggle */
  viewToggle: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    alignItems: "center",
    backgroundColor: "#FFFDF4",
  },
  toggleButtonActive: {
    backgroundColor: "#009235",
    borderColor: "#009235",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004734",
  },
  toggleButtonTextActive: {
    color: "white",
  },

  /* calendar */
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthYear: {
    fontWeight: "700",
    color: "#004734",
    fontSize: 16,
  },
  calendarCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 16,
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3F5E52",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: "#009235",
  },
  dayCellToday: {
    backgroundColor: "#FFB70333",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#004734",
  },
  dayTextSelected: {
    color: "white",
  },
  dayTextToday: {
    color: "#004734",
  },

  dayIndicators: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* selected day */
  selectedDayCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 16,
  },
  selectedDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  selectedDayTitle: {
    fontWeight: "700",
    color: "#004734",
    fontSize: 16,
  },
  todayBadge: {
    backgroundColor: "#FFB703",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  todayBadgeText: {
    fontSize: 12,
    color: "#004734",
    fontWeight: "700",
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },

  /* meals */
  mealsSection: {
    gap: 8,
  },
  mealsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004734",
  },
  mealsList: {
    gap: 8,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FFFDF4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004734",
    flexWrap: "wrap",
    flexShrink: 1
  },
  mealDetails: {
    fontSize: 12,
    color: "#3F5E52",
    marginTop: 2,
  },
  mealRight: {
    alignItems: "flex-end",
  },
  mealProtein: {
    fontSize: 14,
    fontWeight: "700",
    color: "#009235",
  },
  mealCalories: {
    fontSize: 12,
    color: "#3F5E52",
  },

  /* list View */
  listView: {
    gap: 12,
  },
  listCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 16,
  },
  listCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listCardTitle: {
    fontWeight: "700",
    color: "#004734",
    fontSize: 16,
  },
  listCardSubtitle: {
    fontSize: 12,
    color: "#3F5E52",
    marginTop: 2,
  },
  listMeals: {
    gap: 8,
  },
  listMealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listMealName: {
    fontSize: 14,
    color: "#004734",
    flexWrap: "wrap",
    flexShrink: 1,
  },
  listMealType: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  listMealProtein: {
    fontSize: 14,
    color: "#009235",
    fontWeight: "600",
  },
  listMoreMealsTouchable: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },
  listMoreMeals: {
    fontSize: 12,
    color: "#FF7A2F",
    fontWeight: "700",
  },

  /* empty */
  emptyMeals: {
    padding: 24,
    alignItems: "center",
  },
  emptyMealsText: {
    fontSize: 14,
    color: "#3F5E52",
  },
  listEmptyMeals: {
    fontSize: 14,
    color: "#3F5E52",
    fontStyle: "italic",
  },
});

