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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";
import { SessionCard } from "../../src/components/SessionCard";
import {
  overviewEncounterTitle,
  overviewPatientName,
  overviewReasonForVisit,
  patientFacingText,
  unitDisplayTitle,
} from "../../src/utils/clinicalDisplay";

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
  sortOrder?: number | null;
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

type JourneySummary = {
  professionalLevel?: number | null;
  levelTitle?: string | null;
  xp?: number | null;
  streak?: {
    currentCount?: number | null;
  } | null;
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

function achievementWeightLabels(achievements: AchievementSummary[]) {
  const numericWeights = achievements.map((achievement) => Number(achievement.weightPercent));
  const allWeightsValid = numericWeights.every(Number.isFinite);
  if (!allWeightsValid) return achievements.map(() => null);

  const roundedWeights = numericWeights.map((weight) => Math.round(weight));
  const rawTotal = numericWeights.reduce((sum, weight) => sum + weight, 0);
  if (roundedWeights.length > 1 && Math.round(rawTotal) === 100) {
    const priorTotal = roundedWeights.slice(0, -1).reduce((sum, weight) => sum + weight, 0);
    roundedWeights[roundedWeights.length - 1] = 100 - priorTotal;
  }

  return roundedWeights.map((weight) => `${weight}%`);
}

function badgeThresholdLabels(thresholds: SessionOverview["badgeThresholds"]) {
  const gold = Math.round(thresholds.gold);
  const silver = Math.round(thresholds.silver);
  const bronze = Math.round(thresholds.bronze);

  return {
    gold: `${gold}%+`,
    silver: `${silver}–${gold - 1}%`,
    bronze: `${bronze}–${silver - 1}%`,
  };
}

export default function HomeScreen() {
  const { signOut } = useClerk();
  const { userId: authUserId, sessionId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    focusSessionSlug?: string | string[];
    focusSessionToken?: string | string[];
  }>();
  const rawFocusSessionSlug = searchParams.focusSessionSlug;
  const rawFocusSessionToken = searchParams.focusSessionToken;
  const focusSessionSlug = Array.isArray(rawFocusSessionSlug)
    ? rawFocusSessionSlug[0]
    : rawFocusSessionSlug;
  const focusSessionToken = Array.isArray(rawFocusSessionToken)
    ? rawFocusSessionToken[0]
    : rawFocusSessionToken;
  const [signingOut, setSigningOut] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [journeySummary, setJourneySummary] = useState<JourneySummary | null>(null);
  const [selectedOverview, setSelectedOverview] = useState<SessionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVisible, setOverviewVisible] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [preceptorMessages, setPreceptorMessages] = useState<PreceptorChatMessage[]>([]);
  const [preceptorInput, setPreceptorInput] = useState("");
  const [preceptorSending, setPreceptorSending] = useState(false);
  const [preceptorError, setPreceptorError] = useState<string | null>(null);
  const [autoOpenedSessionKey, setAutoOpenedSessionKey] = useState<string | null>(null);

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
      user?.firstName ||
      user?.fullName?.split(/\s+/)[0] ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      null;

    return info ? info.charAt(0).toUpperCase() + info.slice(1) : null;
  }, [user]);

  const loadRoadmap = useCallback(async () => {
    if (!userLoaded) {
      setLoadingRoadmap(true);
      return;
    }

    if (!userHeaders["x-clerk-user-id"]) {
      setLearningPaths([]);
      setJourneySummary(null);
      setLoadingRoadmap(false);
      return;
    }

    try {
      setRoadmapError(null);
      setLoadingRoadmap(true);
      const data = await api.getLearningPaths(userHeaders);
      const parsed = normalizeLearningPathsResponse(data);
      setLearningPaths(parsed);
      try {
        const todayData = await api.getToday(userHeaders);
        setJourneySummary(todayData?.identity || null);
      } catch {
        setJourneySummary(null);
      }
    } catch (err: any) {
      setRoadmapError(err?.message || "Failed to load learning roadmap.");
      setLearningPaths([]);
      setJourneySummary(null);
    } finally {
      setLoadingRoadmap(false);
    }
  }, [userHeaders, userLoaded]);

  useFocusEffect(
    useCallback(() => {
      loadRoadmap();
    }, [loadRoadmap])
  );

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ sessionId: sessionId || undefined, redirectUrl: "/signin" });
      router.replace("/signin");
    } catch (err) {
      setSigningOut(false);
      throw err;
    }
  };

  const openSessionOverview = useCallback(async (session: RoadmapSession) => {
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
  }, [userHeaders]);

  useEffect(() => {
    if (!focusSessionSlug || loadingRoadmap || overviewVisible || briefingVisible) return;

    const focusKey = `${focusSessionSlug}:${focusSessionToken || ""}`;
    if (autoOpenedSessionKey === focusKey) return;

    const session = learningPaths
      .flatMap((path) => path.units)
      .flatMap((unit) => unit.sessions)
      .find((candidate) => candidate.slug === focusSessionSlug);

    if (!session || session.status === "locked") return;

    setAutoOpenedSessionKey(focusKey);
    openSessionOverview(session);
  }, [
    autoOpenedSessionKey,
    briefingVisible,
    focusSessionSlug,
    focusSessionToken,
    learningPaths,
    loadingRoadmap,
    openSessionOverview,
    overviewVisible,
  ]);

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

  const journeySummaryText = journeySummary
    ? `${journeySummary.levelTitle || "Student Clinician"} · Level ${Number(
        journeySummary.professionalLevel || 1
      )} · ${Number(journeySummary.xp || 0)} XP · 🔥 ${Number(
        journeySummary.streak?.currentCount || 0
      )}-day streak`
    : null;

  return (
    <SafeAreaView style={casesStyles.container}>
      <View style={casesStyles.headerBar}>
        <View style={casesStyles.headerLeft}>
          <Text style={casesStyles.headerName}>
            {displayName ? `Hi, ${displayName}` : "Welcome"}
          </Text>
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
        {!!journeySummaryText && (
          <View style={casesStyles.journeySummaryCard}>
            <Text style={casesStyles.journeySummaryText}>{journeySummaryText}</Text>
          </View>
        )}

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
              </View>
              {!!path.description && <Text style={casesStyles.pathDescription}>{path.description}</Text>}

              {path.units.map((unit) => (
                <View key={unit.id} style={casesStyles.unitBlock}>
                  <Text style={casesStyles.unitTitle}>{unitDisplayTitle(unit)}</Text>
                  {!!unit.objective && <Text style={casesStyles.unitObjective}>{unit.objective}</Text>}

                  <View style={casesStyles.sessionNodeList}>
                    {unit.sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        metaValue={session.bestSessionScore != null ? `${session.bestSessionScore}%` : null}
                        onPress={() => openSessionOverview(session)}
                      />
                    ))}
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
                {(() => {
                  const weightLabels = achievementWeightLabels(selectedOverview.achievements);
                  const thresholdLabels = badgeThresholdLabels(selectedOverview.badgeThresholds);
                  const reasonForVisit = overviewReasonForVisit(selectedOverview);

                  return (
                    <>
                      <Text style={casesStyles.modalTitle}>{overviewPatientName(selectedOverview)}</Text>
                      <Text style={casesStyles.modalEncounterTitle}>
                        {overviewEncounterTitle(selectedOverview)}
                      </Text>
                      {!!reasonForVisit && (
                        <Text style={casesStyles.modalReason}>
                          Reason for Visit: {reasonForVisit}
                        </Text>
                      )}
                      {!!selectedOverview.description && (
                        <Text style={casesStyles.modalDescription}>
                          {patientFacingText(selectedOverview.description)}
                        </Text>
                      )}

                      <View style={casesStyles.modalSection}>
                        <Text style={casesStyles.modalSectionTitle}>{"How You'll Be Evaluated"}</Text>
                        {selectedOverview.achievements.map((achievement, index) => (
                          <View key={achievement.id} style={casesStyles.achievementRow}>
                            <Text style={casesStyles.achievementTitle}>✓ {achievement.title}</Text>
                            {!!weightLabels[index] && (
                              <Text style={casesStyles.achievementWeight}>
                                Worth {weightLabels[index]} of your session score
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>

                      <View style={casesStyles.modalSection}>
                        <Text style={casesStyles.modalSectionTitle}>Performance Levels</Text>
                        <View style={casesStyles.thresholdGrid}>
                          <View style={casesStyles.thresholdCellGold}>
                            <Text style={casesStyles.thresholdLabel}>🥇 Gold</Text>
                            <Text style={casesStyles.thresholdValue}>{thresholdLabels.gold}</Text>
                          </View>
                          <View style={casesStyles.thresholdCellSilver}>
                            <Text style={casesStyles.thresholdLabel}>🥈 Silver</Text>
                            <Text style={casesStyles.thresholdValue}>{thresholdLabels.silver}</Text>
                          </View>
                          <View style={casesStyles.thresholdCellBronze}>
                            <Text style={casesStyles.thresholdLabel}>🥉 Bronze</Text>
                            <Text style={casesStyles.thresholdValue}>{thresholdLabels.bronze}</Text>
                          </View>
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
                    </>
                  );
                })()}
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
