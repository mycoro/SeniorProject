import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  current: number;
  goal: number;
  unit: string;
  tintColor: string;
  backgroundColor: string;
  label: string;
}

export default function CircleProgress({
  current,
  goal,
  unit,
  tintColor,
  backgroundColor,
  label,
}: Props) {
  const radius = 45;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  const percent = Math.min((current / goal) * 100, 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <View style={styles.wrapper}>
      {/* Label above circle */}
      <Text style={styles.label}>{label}</Text>

      <View style={styles.container}>
        <Svg width={120} height={120}>
          {/* Background ring (progress track) */}
          <Circle
            stroke={backgroundColor}
            fill="none"
            cx="60"
            cy="60"
            r={radius}
            strokeWidth={strokeWidth}
          />

          {/* Foreground progress ring */}
          <Circle
            stroke={tintColor}
            fill="none"
            cx="60"
            cy="60"
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)" // start at 12 o'clock
          />
        </Svg>

        {/* Center text */}
        <View style={styles.centerText}>
          <Text style={styles.currentText}>{current}</Text>
          <Text style={styles.goalText}>/ {goal}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  container: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  currentText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },
  goalText: {
    fontSize: 14,
    color: "#475569",
    marginTop: -2,
  },
  unitText: {
    fontSize: 14,
    color: "#475569",
    marginTop: 2,
  },
});
