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
  Image,
  Modal,
} from "react-native";
import { Send, AlertTriangle, Bot, Lightbulb, X } from "lucide-react-native";
import { useUser } from "@/context/UserContext";
import { auth } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export default function Chat() {
  const { userProfile, dailyLogs } = useUser();
  const user = auth.currentUser;
  const userName = userProfile?.name || "there";
  const hasDumpingSyndrome = userProfile?.hasDumpingSyndrome || false;
  const isPreOp = userProfile?.isPreOp === true;

  const getDaysPostOp = () => {
    if (!userProfile?.surgeryDate) return null;
    if (userProfile?.isPreOp === true) return null; // Pre-Op: don't calculate days post-op
    
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

  const getInitialMessage = () => {
    if (!userProfile?.surgeryDate) {
      return "Hi! I'm here to help you with your nutrition journey. Once you complete your profile setup, I can provide personalized guidance based on your recovery phase.";
    }
    const isPreOp = userProfile?.isPreOp === true;
    if (isPreOp) {
      return `Hi ${userName}! You're preparing for surgery—I have your surgery date and profile. Ask me anything about pre-op diet, what to expect, or nutrition. How can I help you today?`;
    }
    const daysPostOp = getDaysPostOp();
    if (daysPostOp === null || daysPostOp === 0) {
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
  const [showTips, setShowTips] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, number[]>>({});
  
  const daysPostOp = getDaysPostOp();
  const showPhase1Warning = !isPreOp && daysPostOp !== null && daysPostOp < 15;

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayLogs = dailyLogs.filter((log) => {
        const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        return t >= todayStart && t <= todayEnd;
      });
      const proteinToday = todayLogs.reduce((s, l) => s + (l.protein ?? 0), 0);
      const caloriesToday = todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
      const getFluidOz = (log: { name: string }) => {
        const m = log.name.match(/\((\d+(?:\.\d+)?)oz\)/i);
        return m ? parseFloat(m[1]) : 0;
      };
      const fluidsToday = Math.round(
        todayLogs
          .filter((l) => /water|shake|broth|milk|tea|coffee|jell-o|fluid|drink|\(\d+oz\)/i.test(l.name))
          .reduce((s, l) => s + getFluidOz(l), 0) * 10
      ) / 10;

      const controller = new AbortController();
      const timeoutMs = 90000; // 90s — backend + OpenAI can be slow
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const recentMessages = messages
        .filter((m) => m.id !== "1")
        .slice(-8)
        .map((m) => ({
          role: m.isUser ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          userMessage: userInput,
          conversationHistory: recentMessages,
          userProfile: {
            name: userProfile.name,
            dateOfBirth: userProfile.dateOfBirth,
            sex: userProfile.sex,
            surgeryDate: userProfile.surgeryDate,
            surgeryType: userProfile.surgeryType,
            isPreOp: userProfile.isPreOp ?? false,
            hasDumpingSyndrome: userProfile.hasDumpingSyndrome,
            hasDiabetes: userProfile.hasDiabetes,
            intolerances: userProfile.intolerances || [],
            proteinGoal: userProfile.proteinGoal,
            fluidGoal: userProfile.fluidGoal,
            calorieGoal: userProfile.calorieGoal,
            tastePreferences: userProfile.tastePreferences,
            dislikedFoods: userProfile.dislikedFoods,
            favoriteCuisines: userProfile.favoriteCuisines || [],
          },
          activitySummary: {
            proteinToday,
            caloriesToday,
            fluidsToday,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const urls = Array.isArray(result.image_urls) && result.image_urls.length > 0
        ? result.image_urls
        : result.image_url ? [result.image_url] : [];
      const responseText = (result.response && String(result.response).trim()) || "";
      const hasImages = Array.isArray(result.image_urls) && result.image_urls.length > 0 || !!result.image_url;
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText || (hasImages ? "Here are some ideas for you." : "I couldn't generate a response. Please try again."),
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        imageUrl: urls[0],
        imageUrls: urls.length > 0 ? urls : undefined,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error: any) {
      console.error("Chat API error:", error);
      let errorText = "Failed to get response. Please check your connection and try again.";
      const msg = error?.message ?? "";
      if (error?.name === "AbortError" || msg.includes("timed out") || msg.includes("Network request timed out")) {
        errorText = "Request timed out. Please check your connection and try again.";
      } else if (msg.includes("Network") || msg.includes("fetch")) {
        errorText = "Cannot connect to server. Please check your network connection.";
      } else if (msg) {
        errorText = msg;
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
        <Pressable style={styles.tipsButton} onPress={() => setShowTips(true)}>
          <Lightbulb size={18} color="#009235" />
        </Pressable>
      </View>

      <Modal
        visible={showTips}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTips(false)}
      >
        <Pressable style={styles.tipsOverlay} onPress={() => setShowTips(false)}>
          <Pressable style={styles.tipsModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.tipsModalHeader}>
              <View style={styles.tipsModalTitleRow}>
                <Lightbulb size={20} color="#009235" />
                <Text style={styles.tipsModalTitle}>What can I help with?</Text>
              </View>
              <Pressable onPress={() => setShowTips(false)} style={styles.tipsCloseButton}>
                <X size={18} color="#7A9C8A" />
              </Pressable>
            </View>
            <Text style={styles.tipsModalSubtitle}>Try asking NutriMind AI:</Text>

            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Text style={styles.tipEmoji}>🍽️</Text>
              </View>
              <View style={styles.tipCardContent}>
                <Text style={styles.tipCardTitle}>Log a Meal</Text>
                <Text style={styles.tipCardBody}>
                  Just describe what you ate and I'll log it for you — no tapping required.
                </Text>
                <View style={styles.tipExample}>
                  <Text style={styles.tipExampleText}>"I just had a scrambled egg and half a cup of Greek yogurt"</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Text style={styles.tipEmoji}>✨</Text>
              </View>
              <View style={styles.tipCardContent}>
                <Text style={styles.tipCardTitle}>Get Meal Ideas</Text>
                <Text style={styles.tipCardBody}>
                  Ask for personalized meal suggestions based on your recovery phase and preferences.
                </Text>
                <View style={styles.tipExample}>
                  <Text style={styles.tipExampleText}>"What's a good high-protein lunch I can have this week?"</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {(hasDumpingSyndrome || showPhase1Warning) && (
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
      )}

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
              <View style={styles.messageTextBlock}>
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.messageTextUser : styles.messageTextAI,
                  ]}
                >
                  {message.isUser
                    ? message.text
                    : (() => {
                        let raw = message.text
                          .replace(/https?:\/\/[^\s)]+/gi, "")
                          .replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "")
                          .replace(/\s{2,}/g, " ")
                          .trim();
                        if (raw) return raw;
                        if ((message.imageUrls?.length ?? 0) > 0) return "Here are some ideas for you.";
                        return "I couldn't generate a response. Please try again.";
                      })()}
                </Text>
              </View>
              {!message.isUser && (message.imageUrls?.length ?? 0) > 0 && (() => {
                const urls = message.imageUrls ?? [];
                const failed = failedImageKeys[message.id] ?? [];
                const visibleUrls = urls.map((uri, idx) => ({ uri, idx })).filter(({ idx }) => !failed.includes(idx));
                if (visibleUrls.length === 0) return (
                  <View style={styles.messageImageRowWrap}>
                    <Text style={styles.messageImageUnavailable}>Image unavailable</Text>
                  </View>
                );
                return (
                  <View style={styles.messageImageRowWrap}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.messageImageRow}
                      contentContainerStyle={styles.messageImageRowContent}
                    >
                      {visibleUrls.map(({ uri, idx }) => {
                        const proxyUri = `${API_BASE_URL}/api/image-proxy?url=${encodeURIComponent(uri)}`;
                        return (
                          <Image
                            key={idx}
                            source={{ uri: proxyUri }}
                            style={styles.messageImageThumb}
                            resizeMode="cover"
                            onError={() => {
                              setFailedImageKeys((prev) => ({
                                ...prev,
                                [message.id]: [...(prev[message.id] ?? []), idx],
                              }));
                            }}
                          />
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })()}
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

      <Text style={styles.aiDisclaimer}>
        NutriMind is AI and can make Mistakes.
      </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "column",
  },
  messageTextBlock: {
    flexDirection: "column",
  },
  messageImageRowWrap: {
    marginTop: 10,
    flexDirection: "row",
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
  messageImageRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  messageImageRowContent: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  messageImageThumb: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  messageImageUnavailable: {
    fontSize: 13,
    color: "#7A9C8A",
    fontStyle: "italic",
    marginTop: 8,
  },
  loadingWrapper: {
    alignItems: "center",
    padding: 8,
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
  aiDisclaimer: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: "#FFF8E7",
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

  /* Tips button */
  tipsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#B2DFDB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Tips modal */
  tipsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 80,
    paddingRight: 16,
  },
  tipsModal: {
    backgroundColor: "#FFFDF4",
    borderRadius: 20,
    padding: 20,
    width: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tipsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tipsModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipsModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#004734",
  },
  tipsCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2EDD7",
    alignItems: "center",
    justifyContent: "center",
  },
  tipsModalSubtitle: {
    fontSize: 12,
    color: "#7A9C8A",
    fontWeight: "500",
    marginBottom: 14,
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF8E7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E3D4",
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  tipEmoji: {
    fontSize: 18,
  },
  tipCardContent: {
    flex: 1,
    gap: 4,
  },
  tipCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004734",
  },
  tipCardBody: {
    fontSize: 12,
    color: "#3F5E52",
    lineHeight: 17,
  },
  tipExample: {
    marginTop: 6,
    backgroundColor: "#FFFDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#009235",
  },
  tipExampleText: {
    fontSize: 11,
    color: "#009235",
    fontStyle: "italic",
    lineHeight: 15,
  },
});