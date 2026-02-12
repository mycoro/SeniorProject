import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

type Props = {
  step: number;
  onBack: () => void;
  onNext: () => void;
};

export default function OnboardingFooter({ step, onBack, onNext }: Props) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        {step > 1 && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={16} color="#475569" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable onPress={onNext} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>
            {step === 3 ? "Complete Setup" : "Continue"}
          </Text>
          {step < 3 && <ChevronRight size={16} color="white" />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: 18,
    backgroundColor: "#FFFDF4",
    borderTopWidth: 1,
    borderTopColor: "#E6DDC8",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 14,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E6DDC8",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E7",
  },
  backButtonText: {
    color: "#3F5E52",
    fontWeight: "700",
    marginLeft: 6,
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#FF7A2F",
    paddingVertical: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontWeight: "800",
    marginRight: 6,
  },
});
