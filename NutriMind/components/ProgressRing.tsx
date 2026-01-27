import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  label: string;
  current: number;
  target?: number;
  unit: string;
  color: string;
  size?: number;
}

export default function ProgressRing({
  label,
  current,
  target,
  unit,
  color,
  size = 80,
}: ProgressRingProps) {
  const hasTarget = target && target > 0;
  const percentage = hasTarget ? Math.min((current / target) * 100, 100) : 0;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: "-90deg" }] }}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {hasTarget && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          )}
        </Svg>
        <View style={styles.percentageContainer}>
          <Text style={styles.percentageText}>
            {target && target > 0 ? `${Math.round(percentage)}%` : "-"}
          </Text>
        </View>
      </View>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {target && target > 0 ? `${current}/${target}${unit}` : `${current}${unit} (goal not set)`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  ringContainer: {
    position: "relative",
  },
  percentageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  labelContainer: {
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#003366",
  },
  value: {
    fontSize: 12,
    color: "#64748b",
  },
});


