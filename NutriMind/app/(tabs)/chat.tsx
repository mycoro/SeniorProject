import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Send, AlertTriangle, Bot } from "lucide-react-native";
import { useUser } from "@/context/UserContext";
import { auth, db } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}
type PendingMealLog = {
  mealName: string;
  ingredients?: string[];
  totals: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
    sodium_mg?: number | null;
  };
  confidence?: "low" | "medium" | "high";
  notes?: string;
};


export default function Chat() {
  const { userProfile } = useUser();
  const user = auth.currentUser;
  const userName = userProfile?.name || "there";
  const hasDumpingSyndrome = userProfile?.hasDumpingSyndrome || false;

  const getDaysPostOp = () => {
    if (!userProfile?.surgeryDate) return 0;
    
    let surgeryDate: Date;
    
    if (userProfile.surgeryDate.includes("/")) {
      const parts = userProfile.surgeryDate.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        surgeryDate = new Date(year, month, day);
      } else {
        return 0;
      }
    } else {
      surgeryDate = new Date(userProfile.surgeryDate);
    }
    
    if (isNaN(surgeryDate.getTime())) {
      return 0;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    surgeryDate.setHours(0, 0, 0, 0);
    
    const diff = Math.floor(
      (today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diff);
  };

  const getInitialMessage = () => {
    if (!userProfile?.surgeryDate) {
      return "Hi! I'm here to help you with your nutrition journey. Once you complete your profile setup, I can provide personalized guidance based on your recovery phase.";
    }
    const daysPostOp = getDaysPostOp();
    if (daysPostOp === 0) {
      return `Hi ${userName}! Welcome to your nutrition journey. How can I help you today?`;
    }
    if (daysPostOp < 15) {
      return `Hi ${userName}! You're ${daysPostOp} days post-op, so you're in the full liquids phase. Focus on protein shakes, broth, and sugar-free gelatin. How can I help you today?`;
    } else if (daysPostOp < 29) {
      return `Hi ${userName}! You're ${daysPostOp} days post-op, which means you're in the purees phase. Everything should be smooth like baby food. What would you like to know?`;
    } else if (daysPostOp < 43) {
      return `Hi ${userName}! You're ${daysPostOp} days post-op and in the soft foods phase. Foods should be fork-tender. How can I assist you?`;
    } else {
      return `Hi ${userName}! You're ${daysPostOp} days post-op. You're doing great! What questions do you have about your nutrition?`;
    }
  };

  const initialMessages: Message[] = [
    {
      id: "1",
      text: getInitialMessage(),
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  //pending meal (only saved when user confirms)
  const [pendingMeal, setPendingMeal] = useState<PendingMealLog | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);



  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, loading, pendingMeal]);

  const handleSaveMeal = async () => {
    try {
      if (!user?.uid) throw new Error("You must be logged in to save a meal.");
      if (!pendingMeal) throw new Error("No meal to save.");

      setSavingMeal(true);

      await addDoc(collection(db, "users", user.uid, "mealLogs"), {
        name: pendingMeal.mealName || "Meal",
        calories: Number(pendingMeal.totals?.calories ?? 0),
        protein: Number(pendingMeal.totals?.protein_g ?? 0),
        carbs: Number(pendingMeal.totals?.carbs_g ?? 0),
        mealType: "Snack", // default; you can improve later
        timestamp: serverTimestamp(), // matches UserContext orderBy("timestamp")
        createdAtClient: Date.now(),
        source: "chat",
        // optional: keep the structured fields too (nice for later)
        ingredients: pendingMeal.ingredients ?? [],
        totals: pendingMeal.totals ?? {},
        confidence: pendingMeal.confidence ?? "low",
        notes: pendingMeal.notes ?? "",
      }); 

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: "Saved to your meal log.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      setPendingMeal(null);
    } catch (error: any) {
      console.error("Save meal error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 3).toString(),
          text: error?.message ?? "Could not save meal.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setSavingMeal(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.toLowerCase();
    setInput("");
    setLoading(true);

    try {
      if (!userProfile?.surgeryDate) {
        throw new Error("Surgery date not set. Please complete onboarding.");
      }

      if (!user) {
        throw new Error("You must be logged in to use the chat.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          userMessage: userInput,
          userProfile: {
            name: userProfile.name,
            surgeryDate: userProfile.surgeryDate,
            surgeryType: userProfile.surgeryType,
            hasDumpingSyndrome: userProfile.hasDumpingSyndrome,
            intolerances: userProfile.intolerances || [],
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: result.reply ||  "I apologize, but I couldn't generate a response.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
      // Handle pending meal (only if AI detected a meal)
      if (result.mealLog) {
        setPendingMeal(result.mealLog);
      } else {
        setPendingMeal(null);
      }

    } catch (error: any) {
      console.error("Chat API error:", error);
      let errorText = "Failed to get response. Please check your connection and try again.";
      
      if (error.name === "AbortError") {
        errorText = "Request timed out. Please check your connection and try again.";
      } else if (error.message && error.message.includes("Network")) {
        errorText = `Cannot connect to server. Please check your network connection.`;
      } else if (error.message) {
        errorText = error.message;
      }
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
       // If chat fails, don't keep a stale pending meal
      setPendingMeal(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botIcon}>
            <Bot size={20} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>NutriMind AI</Text>
            <Text style={styles.headerSubtitle}>
              Your bariatric nutrition guide
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.alertBanner}>
        <AlertTriangle size={20} color="#d97706" />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Safety Alert</Text>
          <Text style={styles.alertText}>
            {hasDumpingSyndrome
              ? "Avoid high-sugar foods to prevent Dumping Syndrome symptoms"
              : "No Straws in Phase 1 - sip directly from cups"}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.isUser ? styles.messageWrapperUser : null,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.messageBubbleUser : styles.messageBubbleAI,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.messageTextUser : styles.messageTextAI,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.isUser ? styles.messageTimeUser : styles.messageTimeAI,
                ]}
              >
                {message.timestamp}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color="#008080" />
          </View>
        )}
      </ScrollView>
      {/*Save meal confirmation UI */}
        {pendingMeal && (
          <View style={styles.saveContainer}>
            <View style={styles.saveCard}>
              <Text style={styles.saveTitle}>Ready to log this meal?</Text>
              <Text style={styles.saveSubtitle}>
                {pendingMeal.mealName || "Meal"}
                {pendingMeal.confidence ? ` • Confidence: ${pendingMeal.confidence}` : ""}
              </Text>

              <View style={styles.saveButtonsRow}>
                <Pressable
                  onPress={handleSaveMeal}
                  disabled={savingMeal}
                  style={[
                    styles.saveButtonPrimary,
                    savingMeal ? styles.saveButtonDisabled : null,
                  ]}
                >
                  {savingMeal ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonPrimaryText}>Save this meal</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setPendingMeal(null)}
                  disabled={savingMeal}
                  style={styles.saveButtonSecondary}
                >
                  <Text style={styles.saveButtonSecondaryText}>Not now</Text>
                </Pressable>
              </View>

              {!!pendingMeal.notes && (
                <Text style={styles.saveNotes}>{pendingMeal.notes}</Text>
              )}
            </View>
          </View>
        )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask NutriMind AI..."
          multiline
          onSubmitEditing={handleSend}
        />
        <Pressable onPress={handleSend} style={styles.sendButton}>
          <Send size={16} color="white" />
        </Pressable>
      </View>
      </KeyboardAvoidingView>
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
  },

  /* Header */
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E8C9",
    backgroundColor: "#FFF8E7",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  botIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#009235",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
    color: "#004734",
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B8F7A",
  },

  /* Alert */
  alertBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: "#FFF3C4",
    borderWidth: 1,
    borderColor: "#FFB703",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9A6700",
    marginBottom: 2,
  },
  alertText: {
    fontSize: 12,
    color: "#9A6700",
  },

  /* Messages */
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
    flexGrow: 1,
  },
  messageWrapper: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageWrapperUser: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubbleUser: {
    backgroundColor: "#FF7A2F",
    borderBottomRightRadius: 6,
  },
  messageBubbleAI: {
    backgroundColor: "#FFF8E7",
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: "white",
  },
  messageTextAI: {
    color: "#004734",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeUser: {
    color: "rgba(255,255,255,0.7)",
  },
  messageTimeAI: {
    color: "#7A9C8A",
  },

  loadingWrapper: {
    alignItems: "center",
    padding: 8,
  },
  /* Save Meal */
  saveContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  saveCard: {
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#F2E8C9",
    borderRadius: 14,
    padding: 12,
  },
  saveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004734",
  },
  saveSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F7A",
  },
  saveButtonsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  saveButtonPrimary: {
    flex: 1,
    backgroundColor: "#009235",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonPrimaryText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
  saveButtonSecondary: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonSecondaryText: {
    color: "#004734",
    fontWeight: "700",
    fontSize: 13,
  },
  saveNotes: {
    marginTop: 10,
    fontSize: 11,
    color: "#7A9C8A",
  },
  /* Input */
  inputContainer: {
    padding: 16,
    backgroundColor: "#FFF8E7",
    borderTopWidth: 1,
    borderTopColor: "#F2E8C9",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: "#FFFDF4",
    color: "#004734",
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: "#009235",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

