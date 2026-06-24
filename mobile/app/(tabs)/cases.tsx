import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";

type AchievementSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  weightPercent?: number | null;
};

type RoadmapSession = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  status: "locked" | "available" | "completed";
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | null;
  bestSessionScore?: number | null;
  latestSessionScore?: number | null;
  badgeThresholds?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  achievements?: AchievementSummary[];
  requiresHpi?: boolean;
  workflow?: {
    requiresHpi?: boolean;
  };
};

type RoadmapUnit = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  sessions: RoadmapSession[];
};

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  preceptorPersona?: {
    name?: string | null;
    specialty?: string | null;
  } | null;
  units: RoadmapUnit[];
};

type SessionOverview = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  achievements: AchievementSummary[];
  badgeThresholds: {
    gold: number;
    silver: number;
    bronze: number;
  };
  estimatedTime: {
    min?: number | null;
    max?: number | null;
  };
  preceptorBriefing?: string | null;
  requiresHpi?: boolean;
  workflow?: {
    requiresHpi?: boolean;
  };
  linkedCase?: {
    caseId: string;
    title?: string | null;
    level?: number | null;
    setting?: string | null;
  } | null;
  preceptorPersona?: {
    name?: string | null;
    specialty?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type PreceptorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_PRECEPTOR_BRIEFING =
  "Welcome. I'm Dr. Martinez. In this session, you'll meet your first patient and begin the clinical encounter. Focus on two goals: introduce yourself professionally and identify the patient's chief complaint. Ask me any questions before you meet the patient.";

const PRECEPTOR_QUICK_ACTIONS = [
  "How should I introduce myself?",
  "What is a chief complaint?",
  "What should I focus on?",
];

function normalizeLearningPathsResponse(data: any): LearningPath[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.learningPaths)) return data.learningPaths;
  if (data && typeof data === "object" && Array.isArray(data.units)) return [data];
  return [];
}

function badgeLabel(session: RoadmapSession) {
  if (session.status !== "completed") return null;
  if (!session.badgeTier || session.badgeTier === "NONE") return "Completed";
  return session.badgeTier.charAt(0) + session.badgeTier.slice(1).toLowerCase();
}

function nodeStyleFor(session: RoadmapSession) {
  if (session.status === "locked") return casesStyles.roadmapNodeLocked;
  if (session.status === "completed") {
    if (session.badgeTier === "GOLD") return casesStyles.roadmapNodeGold;
    if (session.badgeTier === "SILVER") return casesStyles.roadmapNodeSilver;
    if (session.badgeTier === "BRONZE") return casesStyles.roadmapNodeBronze;
    return casesStyles.roadmapNodeCompleted;
  }
  return casesStyles.roadmapNodeAvailable;
}

function nodeTextStyleFor(session: RoadmapSession) {
  if (session.status === "locked") return casesStyles.roadmapNodeTextLocked;
  if (session.status === "completed") return casesStyles.roadmapNodeTextCompleted;
  return casesStyles.roadmapNodeTextAvailable;
}

export default function HomeScreen() {
  const { signOut } = useClerk();
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [selectedOverview, setSelectedOverview] = useState<SessionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVisible, setOverviewVisible] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [preceptorMessages, setPreceptorMessages] = useState<PreceptorChatMessage[]>([]);
  const [preceptorInput, setPreceptorInput] = useState("");
  const [preceptorSending, setPreceptorSending] = useState(false);
  const [preceptorError, setPreceptorError] = useState<string | null>(null);

  const userHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    const email = user?.primaryEmailAddress?.emailAddress;
    const fallbackEmail = email || user?.emailAddresses?.[0]?.emailAddress;
    const resolvedUserId = user?.id || authUserId || (__DEV__ ? fallbackEmail || "dev-user" : undefined);

    if (resolvedUserId) headers["x-clerk-user-id"] = resolvedUserId;
    if (user?.fullName) headers["x-user-name"] = user.fullName;
    if (email) headers["x-user-email"] = email;
    if (user?.imageUrl) headers["x-user-image"] = user.imageUrl;
    return headers;
  }, [authUserId, user]);

  const displayName = useMemo(() => {
    const info =
      user?.username ||
      user?.firstName ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "there";

    return info.charAt(0).toUpperCase() + info.slice(1);
  }, [user]);

  const loadRoadmap = useCallback(async () => {
    if (!userLoaded) {
      setLoadingRoadmap(true);
      return;
    }

    if (!userHeaders["x-clerk-user-id"]) {
      setLearningPaths([]);
      setLoadingRoadmap(false);
      return;
    }

    try {
      setRoadmapError(null);
      setLoadingRoadmap(true);
      const data = await api.getLearningPaths(userHeaders);
      const parsed = normalizeLearningPathsResponse(data);
      setLearningPaths(parsed);
    } catch (err: any) {
      setRoadmapError(err?.message || "Failed to load learning roadmap.");
      setLearningPaths([]);
    } finally {
      setLoadingRoadmap(false);
    }
  }, [userHeaders, userLoaded]);

  const loadProgress = useCallback(async () => {
    if (!userHeaders["x-clerk-user-id"]) {
      setPoints(0);
      setLevel(1);
      setLoadingProgress(false);
      return;
    }

    try {
      setLoadingProgress(true);
      const data = await api.getProgress(userHeaders);
      setPoints(Number(data?.points ?? 0) || 0);
      setLevel(Math.max(1, Number(data?.level ?? 1) || 1));
    } catch (err) {
      console.warn("Failed to load user progress:", err);
      setPoints(0);
      setLevel(1);
    } finally {
      setLoadingProgress(false);
    }
  }, [userHeaders]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/(auth)/signin");
    } finally {
      setSigningOut(false);
    }
  };

  const openSessionOverview = async (session: RoadmapSession) => {
    if (session.status === "locked") return;

    setOverviewVisible(true);
    setOverviewLoading(true);
    setOverviewError(null);
    setSelectedOverview(null);

    try {
      const data = await api.getPatientSessionOverview(session.slug, userHeaders);
      setSelectedOverview(data);
    } catch (err: any) {
      setOverviewError(err?.message || "Failed to load session overview.");
    } finally {
      setOverviewLoading(false);
    }
  };

  const startSelectedSession = () => {
    setOverviewVisible(false);
    setPreceptorMessages([{ role: "assistant", content: INITIAL_PRECEPTOR_BRIEFING }]);
    setPreceptorInput("");
    setPreceptorError(null);
    setBriefingVisible(true);
  };

  const sendPreceptorMessage = async (messageOverride?: string) => {
    const text = (typeof messageOverride === "string" ? messageOverride : preceptorInput).trim();
    if (!text || !selectedOverview || preceptorSending) return;

    const nextMessages: PreceptorChatMessage[] = [
      ...preceptorMessages,
      { role: "user", content: text },
    ];

    setPreceptorMessages(nextMessages);
    setPreceptorInput("");
    setPreceptorError(null);
    setPreceptorSending(true);

    try {
      const data = await api.sendPreceptorChatMessage(
        selectedOverview.slug,
        {
          message: text,
          messages: preceptorMessages,
        },
        userHeaders
      );
      const reply = String(data?.reply || "").trim();
      setPreceptorMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            reply ||
            "Focus on greeting the patient professionally and inviting them to share their main concern.",
        },
      ]);
    } catch (err: any) {
      setPreceptorError(err?.message || "Dr. Martinez could not respond right now.");
    } finally {
      setPreceptorSending(false);
    }
  };

  const meetPatient = () => {
    const caseId = selectedOverview?.linkedCase?.caseId || "uti_level1";
    setBriefingVisible(false);
    router.push({
      pathname: "/(tabs)/level1",
      params: {
        caseId,
        patientSessionSlug: selectedOverview?.slug || "first-patient",
        requiresHpi: String(Boolean(selectedOverview?.workflow?.requiresHpi ?? selectedOverview?.requiresHpi)),
      },
    });
  };

  return (
    <SafeAreaView style={casesStyles.container}>
      <View style={casesStyles.headerBar}>
        <View style={casesStyles.headerLeft}>
          <Text style={casesStyles.headerName}>Hi, {displayName}</Text>
          <Text numberOfLines={1} style={casesStyles.headerEmail}>
            {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ""}
          </Text>
        </View>
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          style={[casesStyles.signOutButton, { opacity: signingOut ? 0.6 : 1 }]}
        >
          <Text style={casesStyles.signOutButtonText}>{signingOut ? "Signing out..." : "Sign Out"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={casesStyles.scrollContent}>
        <View style={casesStyles.pointsCard}>
          <Text style={casesStyles.pointsLabel}>TOTAL POINTS</Text>
          {loadingProgress ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <>
              <Text style={casesStyles.pointsValue}>{points}</Text>
              <Text style={casesStyles.pointsSubText}>Current level: {level}</Text>
              <Text style={casesStyles.pointsRetryNote}>Highest case score is kept when you retry.</Text>
            </>
          )}
        </View>

        <View style={casesStyles.sectionHeader}>
          <Text style={casesStyles.casesTitle}>Learning Roadmap</Text>
          <Text style={casesStyles.casesSubText}>Progress through patient sessions one encounter at a time.</Text>
        </View>

        {loadingRoadmap ? (
          <View style={casesStyles.loadingBlock}>
            <ActivityIndicator />
          </View>
        ) : roadmapError ? (
          <View style={casesStyles.inlineErrorBox}>
            <Text style={casesStyles.errorText}>{roadmapError}</Text>
            <Pressable onPress={loadRoadmap} style={casesStyles.retryButton}>
              <Text style={casesStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : learningPaths.length === 0 ? (
          <Text style={casesStyles.emptyText}>No learning paths found.</Text>
        ) : (
          learningPaths.map((path) => (
            <View key={path.id} style={casesStyles.roadmapPath}>
              <View style={casesStyles.pathHeader}>
                <Text style={casesStyles.pathTitle}>{path.title}</Text>
                {!!path.preceptorPersona?.name && (
                  <Text style={casesStyles.pathPreceptor}>{path.preceptorPersona.name}</Text>
                )}
              </View>
              {!!path.description && <Text style={casesStyles.pathDescription}>{path.description}</Text>}

              {path.units.map((unit) => (
                <View key={unit.id} style={casesStyles.unitBlock}>
                  <Text style={casesStyles.unitLabel}>Current Unit</Text>
                  <Text style={casesStyles.unitTitle}>{unit.title}</Text>
                  {!!unit.objective && <Text style={casesStyles.unitObjective}>{unit.objective}</Text>}

                  <View style={casesStyles.sessionNodeList}>
                    {unit.sessions.map((session) => {
                      const label = badgeLabel(session);
                      return (
                        <Pressable
                          key={session.id}
                          disabled={session.status === "locked"}
                          onPress={() => openSessionOverview(session)}
                          style={({ pressed }) => [
                            casesStyles.roadmapNode,
                            nodeStyleFor(session),
                            pressed && session.status !== "locked" && casesStyles.roadmapNodePressed,
                          ]}
                        >
                          <View style={casesStyles.nodeMain}>
                            <Text style={[casesStyles.roadmapNodeTitle, nodeTextStyleFor(session)]}>
                              {session.title}
                            </Text>
                            {!!session.objective && (
                              <Text style={casesStyles.roadmapNodeObjective} numberOfLines={2}>
                                {session.objective}
                              </Text>
                            )}
                          </View>
                          <View style={casesStyles.nodeMeta}>
                            <Text style={[casesStyles.nodeStatusText, nodeTextStyleFor(session)]}>
                              {label || (session.status === "locked" ? "Locked" : "Available")}
                            </Text>
                            {session.bestSessionScore != null && (
                              <Text style={casesStyles.nodeScoreText}>{session.bestSessionScore}%</Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

      </ScrollView>

      <Modal
        visible={overviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOverviewVisible(false)}
      >
        <View style={casesStyles.modalBackdrop}>
          <View style={casesStyles.sessionModal}>
            {overviewLoading ? (
              <View style={casesStyles.modalLoading}>
                <ActivityIndicator />
              </View>
            ) : overviewError ? (
              <View style={casesStyles.modalContent}>
                <Text style={casesStyles.errorText}>{overviewError}</Text>
                <View style={casesStyles.modalActions}>
                  <Pressable onPress={() => setOverviewVisible(false)} style={casesStyles.modalSecondaryButton}>
                    <Text style={casesStyles.modalSecondaryButtonText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            ) : selectedOverview ? (
              <ScrollView contentContainerStyle={casesStyles.modalContent}>
                <Text style={casesStyles.modalTitle}>{selectedOverview.title}</Text>
                {!!selectedOverview.objective && (
                  <Text style={casesStyles.modalObjective}>{selectedOverview.objective}</Text>
                )}
                {!!selectedOverview.description && (
                  <Text style={casesStyles.modalDescription}>{selectedOverview.description}</Text>
                )}

                <View style={casesStyles.modalSection}>
                  <Text style={casesStyles.modalSectionTitle}>Main Achievements</Text>
                  {selectedOverview.achievements.map((achievement) => (
                    <View key={achievement.id} style={casesStyles.achievementRow}>
                      <Text style={casesStyles.achievementTitle}>{achievement.title}</Text>
                      {achievement.weightPercent != null && (
                        <Text style={casesStyles.achievementWeight}>{achievement.weightPercent}%</Text>
                      )}
                    </View>
                  ))}
                </View>

                <View style={casesStyles.thresholdGrid}>
                  <View style={casesStyles.thresholdCellGold}>
                    <Text style={casesStyles.thresholdLabel}>Gold</Text>
                    <Text style={casesStyles.thresholdValue}>&gt;= {selectedOverview.badgeThresholds.gold}%</Text>
                  </View>
                  <View style={casesStyles.thresholdCellSilver}>
                    <Text style={casesStyles.thresholdLabel}>Silver</Text>
                    <Text style={casesStyles.thresholdValue}>&gt;= {selectedOverview.badgeThresholds.silver}%</Text>
                  </View>
                  <View style={casesStyles.thresholdCellBronze}>
                    <Text style={casesStyles.thresholdLabel}>Bronze</Text>
                    <Text style={casesStyles.thresholdValue}>&gt; 0%</Text>
                  </View>
                </View>

                <Text style={casesStyles.estimatedTimeText}>
                  Estimated time: {selectedOverview.estimatedTime.min || 3}-{selectedOverview.estimatedTime.max || 5} minutes
                </Text>

                <View style={casesStyles.modalActions}>
                  <Pressable onPress={() => setOverviewVisible(false)} style={casesStyles.modalSecondaryButton}>
                    <Text style={casesStyles.modalSecondaryButtonText}>Close</Text>
                  </Pressable>
                  <Pressable onPress={startSelectedSession} style={casesStyles.modalPrimaryButton}>
                    <Text style={casesStyles.modalPrimaryButtonText}>Meet Preceptor</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={briefingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBriefingVisible(false)}
      >
        <View style={casesStyles.modalBackdrop}>
          <View style={casesStyles.sessionModal}>
            {selectedOverview ? (
              <ScrollView contentContainerStyle={casesStyles.modalContent}>
                <View style={casesStyles.preceptorHeader}>
                  <View style={casesStyles.preceptorAvatarCircle}>
                    <Text style={casesStyles.preceptorAvatarText}>
                      {(selectedOverview.preceptorPersona?.name || "Dr. Martinez")
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .join("")
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View style={casesStyles.preceptorHeaderText}>
                    <Text style={casesStyles.preceptorName}>
                      {selectedOverview.preceptorPersona?.name || "Dr. Martinez"}
                    </Text>
                    <Text style={casesStyles.preceptorSpecialty}>
                      {selectedOverview.preceptorPersona?.specialty || "Clinical Preceptor"}
                    </Text>
                  </View>
                </View>

                <View style={casesStyles.preceptorChatBox}>
                  <Text style={casesStyles.modalSectionTitle}>Dr. Martinez says:</Text>
                  <View style={casesStyles.preceptorChatMessages}>
                    {preceptorMessages.length === 0 ? (
                      <Text style={casesStyles.preceptorChatEmpty}>
                        Ask about the session goals, introductions, or eliciting the chief complaint.
                      </Text>
                    ) : (
                      preceptorMessages.map((message, index) => (
                        <View key={`${message.role}-${index}`} style={casesStyles.preceptorChatMessageGroup}>
                          <View
                            style={[
                              casesStyles.preceptorChatBubble,
                              message.role === "user"
                                ? casesStyles.preceptorChatBubbleUser
                                : casesStyles.preceptorChatBubbleAssistant,
                            ]}
                          >
                            <Text style={casesStyles.preceptorChatRole}>
                              {message.role === "user" ? "You" : "Dr. Martinez"}
                            </Text>
                            <Text style={casesStyles.preceptorChatText}>{message.content}</Text>
                          </View>
                          {index === 0 && message.role === "assistant" ? (
                            <View style={casesStyles.preceptorQuickActions}>
                              {PRECEPTOR_QUICK_ACTIONS.map((action) => (
                                <Pressable
                                  key={action}
                                  onPress={() => sendPreceptorMessage(action)}
                                  disabled={preceptorSending}
                                  style={({ pressed }) => [
                                    casesStyles.preceptorQuickActionButton,
                                    { opacity: preceptorSending ? 0.45 : pressed ? 0.75 : 1 },
                                  ]}
                                >
                                  <Text style={casesStyles.preceptorQuickActionText}>{action}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                    {preceptorSending ? (
                      <Text style={casesStyles.preceptorChatEmpty}>Dr. Martinez is responding...</Text>
                    ) : null}
                  </View>
                  {preceptorError ? (
                    <Text style={casesStyles.errorText}>{preceptorError}</Text>
                  ) : null}
                  <View style={casesStyles.preceptorChatInputRow}>
                    <TextInput
                      value={preceptorInput}
                      onChangeText={setPreceptorInput}
                      editable={!preceptorSending}
                      placeholder="Ask a question before meeting the patient..."
                      style={casesStyles.preceptorChatInput}
                      returnKeyType="send"
                      onSubmitEditing={() => sendPreceptorMessage()}
                    />
                    <Pressable
                      onPress={sendPreceptorMessage}
                      disabled={preceptorSending || !preceptorInput.trim()}
                      style={({ pressed }) => [
                        casesStyles.preceptorChatSendButton,
                        {
                          opacity:
                            preceptorSending || !preceptorInput.trim() ? 0.45 : pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={casesStyles.preceptorChatSendText}>
                        {preceptorSending ? "..." : "Ask"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={casesStyles.modalActions}>
                  <Pressable onPress={() => setBriefingVisible(false)} style={casesStyles.modalSecondaryButton}>
                    <Text style={casesStyles.modalSecondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable onPress={meetPatient} style={casesStyles.modalPrimaryButton}>
                    <Text style={casesStyles.modalPrimaryButtonText}>Meet Patient</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
