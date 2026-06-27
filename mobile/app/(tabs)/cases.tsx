import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";
import { CompactJourneyCard } from "../../src/components/CompactJourneyCard";
import { ClinicalsChatComposer } from "../../src/components/ClinicalsChatComposer";
import { EncounterNodeCard } from "../../src/components/EncounterNodeCard";
import { MentorAvatar } from "../../src/components/MentorAvatar";
import { PatientAvatar } from "../../src/components/PatientAvatar";
import { useEnglishSpeechTranscription } from "../../src/hooks/useEnglishSpeechTranscription";
import { useSpeechPlayback } from "../../src/hooks/useSpeechPlayback";
import { useVoicePreference } from "../../src/hooks/useVoicePreference";
import {
  overviewEncounterTitle,
  overviewPatientName,
  overviewReasonForVisit,
  patientFacingText,
  sessionDisplayParts,
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
    slug?: string | null;
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

const MENTOR_TTS_VOICE =
  process.env.EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE || "am_adam";

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

function rotationTitle(unit: RoadmapUnit) {
  return unitDisplayTitle(unit).replace(/^Unit\s+\d+\s*:\s*/i, "");
}

function rotationTheme(unit: RoadmapUnit) {
  const order = Number(unit.sortOrder || 1);
  const title = unitDisplayTitle(unit);

  if (order === 2 || /seasonal|allerg/i.test(title)) {
    return {
      icon: "🌸",
      description: "Practice focused history-taking for common outpatient symptoms.",
      style: casesStyles.rotationCardSpring,
      iconStyle: casesStyles.rotationIconSpring,
    };
  }

  return {
    icon: "🏥",
    description:
      "Practice professional introductions, rapport, and identifying the patient's main concern.",
    style: casesStyles.rotationCardClinic,
    iconStyle: casesStyles.rotationIconClinic,
  };
}

function encounterStatusLabel(session: RoadmapSession) {
  if (session.status === "locked") return "Locked";
  if (session.status !== "completed") return "Available";
  return null;
}

function rotationComplete(unit: RoadmapUnit) {
  return unit.sessions.every(
    (session) => session.status === "completed" && Number(session.bestSessionScore ?? -1) >= 84
  );
}

function completedMasteryLabel(session: RoadmapSession) {
  const score = session.bestSessionScore != null ? `${Math.round(Number(session.bestSessionScore))}%` : null;
  if (session.badgeTier === "GOLD") return score ? `Gold · ${score}` : "Gold";
  if (session.badgeTier === "SILVER") return score ? `Silver · ${score}` : "Silver";
  if (session.badgeTier === "BRONZE") return score ? `Bronze · ${score}` : "Bronze";
  return score ? `Complete · ${score}` : "Complete";
}

export default function HomeScreen() {
  const { signOut } = useClerk();
  const { userId: authUserId, sessionId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrowScreen = width < 420;
  const mentorAvatarSize = isNarrowScreen ? 196 : 226;
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
  const [evaluationDetailsVisible, setEvaluationDetailsVisible] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [preceptorMessages, setPreceptorMessages] = useState<PreceptorChatMessage[]>([]);
  const [preceptorInput, setPreceptorInput] = useState("");
  const [preceptorSending, setPreceptorSending] = useState(false);
  const [preceptorError, setPreceptorError] = useState<string | null>(null);
  const { voiceEnabled: mentorVoiceEnabled, setVoiceEnabled: setMentorVoiceEnabled } =
    useVoicePreference();
  const preceptorDialogueRef = useRef<ScrollView | null>(null);
  const preceptorTranscription = useEnglishSpeechTranscription({
    onText: setPreceptorInput,
    onError: () => setPreceptorError("Could not transcribe audio. Please try again or type your question."),
  });
  const mentorSpeech = useSpeechPlayback({
    voice: MENTOR_TTS_VOICE,
    onError: () => {
      // Keep mentor chat usable when TTS is unavailable.
    },
  });
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
    setEvaluationDetailsVisible(false);

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

  const briefMissionText = (overview: SessionOverview) => {
    const requiresHpi = Boolean(overview.workflow?.requiresHpi ?? overview.requiresHpi);
    if (requiresHpi) {
      return "Complete a focused clinical encounter and submit a concise history summary.";
    }
    if (overview.requiresHpi === false || overview.workflow?.requiresHpi === false) {
      return "Begin the encounter professionally, build rapport, and identify the patient’s main concern.";
    }
    return patientFacingText(overview.description) || "Prepare for a focused patient encounter.";
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
    if (mentorSpeech.isSpeaking) {
      void mentorSpeech.stop();
    }

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
      const assistantReply =
        reply ||
        "Focus on greeting the patient professionally and inviting them to share their main concern.";
      setPreceptorMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);
      if (mentorVoiceEnabled) {
        void mentorSpeech.speak(assistantReply);
      }
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

  const preceptorName = selectedOverview?.preceptorPersona?.name || "Dr. Martinez";
  const preceptorSpecialty =
    selectedOverview?.preceptorPersona?.specialty || "Clinical Preceptor";
  const preceptorSlug = selectedOverview?.preceptorPersona?.slug || "dr-martinez";
  const welcomeMessage =
    preceptorMessages.find((message) => message.role === "assistant")?.content ||
    INITIAL_PRECEPTOR_BRIEFING;
  const conversationMessages =
    preceptorMessages[0]?.role === "assistant" ? preceptorMessages.slice(1) : preceptorMessages;
  const scrollPreceptorDialogueToEnd = useCallback(() => {
    setTimeout(() => {
      preceptorDialogueRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  useEffect(() => {
    if (!briefingVisible) return;
    scrollPreceptorDialogueToEnd();
  }, [
    briefingVisible,
    conversationMessages.length,
    preceptorSending,
    scrollPreceptorDialogueToEnd,
  ]);

  return (
    <SafeAreaView style={casesStyles.container}>
      {/* Header matching Today and Portfolio */}
      <View style={portfolioStyles.screenHeaderRow}>
        <View style={portfolioStyles.screenHeaderText}>
          <Text style={portfolioStyles.screenTitle}>Roadmap</Text>
          <Text style={portfolioStyles.screenSubtitle}>Follow your clinical journey.</Text>
        </View>
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          style={[portfolioStyles.signOutButton, { opacity: signingOut ? 0.6 : 1 }]}
        >
          <Text style={portfolioStyles.signOutButtonText}>{signingOut ? "Signing out..." : "Sign Out"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={casesStyles.scrollContent}>
        {!!journeySummary && (
          <CompactJourneyCard
            levelTitle={journeySummary.levelTitle}
            professionalLevel={journeySummary.professionalLevel}
            xp={journeySummary.xp}
            streakCount={journeySummary.streak?.currentCount}
          />
        )}

        {/* Duplicate page header removed – title now provided by the top header */}

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

              {path.units.map((unit, unitIndex) => {
                const theme = rotationTheme(unit);
                const isRotationComplete = rotationComplete(unit);
                const isLastRotation = unitIndex === path.units.length - 1;

                return (
                  <View key={unit.id}>
                    <View style={[casesStyles.rotationCard, theme.style]}>
                      <View style={casesStyles.rotationHeader}>
                        <View style={[casesStyles.rotationIcon, theme.iconStyle]}>
                          <Text style={casesStyles.rotationIconText}>{theme.icon}</Text>
                        </View>
                        <View style={casesStyles.rotationHeaderText}>
                          <Text style={casesStyles.rotationEyebrow}>
                            Rotation {Number(unit.sortOrder || 1)}
                          </Text>
                          <Text style={casesStyles.rotationTitle}>{rotationTitle(unit)}</Text>
                          <Text style={casesStyles.rotationDescription}>
                            {theme.description}
                          </Text>
                        </View>
                      </View>

                      <View style={casesStyles.pathRail}>
                        {unit.sessions.map((session, index) => {
                          const display = sessionDisplayParts(session);
                          const isLocked = session.status === "locked";
                          const isCompleted = session.status === "completed";
                          const isLast = index === unit.sessions.length - 1;
                          const nextSessionLocked = unit.sessions[index + 1]?.status === "locked";
                          const shouldRetry =
                            isCompleted &&
                            nextSessionLocked &&
                            (Number(session.bestSessionScore ?? 0) < 84 ||
                              session.badgeTier === "BRONZE" ||
                              session.badgeTier === "SILVER");
                          const chipLabel = shouldRetry
                            ? "Retry"
                            : isCompleted
                              ? completedMasteryLabel(session)
                              : encounterStatusLabel(session);

                          return (
                            <View key={session.id} style={casesStyles.encounterCardStack}>
                              <EncounterNodeCard
                                patientName={display.patientName}
                                encounterTitle={display.taskTitle}
                                patientSessionSlug={session.slug}
                                status={session.status}
                                tier={session.badgeTier}
                                bestScore={session.bestSessionScore}
                                statusLabel={chipLabel}
                                disabled={isLocked}
                                onPress={() => openSessionOverview(session)}
                              />
                              {!isLast && <View style={casesStyles.connectorLine} />}
                            </View>
                          );
                        })}
                      </View>

                      <View
                        style={[
                          casesStyles.rotationMilestone,
                          isRotationComplete
                            ? casesStyles.rotationMilestoneComplete
                            : casesStyles.rotationMilestoneUpcoming,
                        ]}
                      >
                        <Text style={casesStyles.rotationMilestoneIcon}>
                          {isRotationComplete ? "🏁" : "📜"}
                        </Text>
                        <View style={casesStyles.rotationMilestoneText}>
                          <Text style={casesStyles.rotationMilestoneTitle}>
                            {isRotationComplete ? "Rotation Complete" : "Clinical Milestone"}
                          </Text>
                          <Text style={casesStyles.rotationMilestoneBody}>
                            {isRotationComplete
                              ? "You've reached this clinical checkpoint."
                              : "Complete each encounter with 84% or higher to reach this checkpoint."}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {!isLastRotation && <View style={casesStyles.rotationContinuationCue} />}
                  </View>
                );
              })}
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
          <View style={[casesStyles.sessionModal, casesStyles.preceptorModal]}>
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
              <ScrollView contentContainerStyle={casesStyles.preceptorModalContent}>
                {(() => {
                  const weightLabels = achievementWeightLabels(selectedOverview.achievements);
                  const thresholdLabels = badgeThresholdLabels(selectedOverview.badgeThresholds);
                  const reasonForVisit = overviewReasonForVisit(selectedOverview);

                  return (
                    <>
                      <Text style={casesStyles.patientBriefLabel}>Patient Brief</Text>
                      <View style={casesStyles.patientBriefHeader}>
                        <PatientAvatar
                          patientName={overviewPatientName(selectedOverview)}
                          patientSessionSlug={selectedOverview.slug}
                          caseId={selectedOverview.linkedCase?.caseId}
                          size={58}
                          status="available"
                        />
                        <View style={casesStyles.patientBriefHeaderText}>
                          <Text style={casesStyles.modalTitle}>{overviewPatientName(selectedOverview)}</Text>
                        </View>
                      </View>
                      <Text style={casesStyles.modalEncounterTitle}>
                        {overviewEncounterTitle(selectedOverview)}
                      </Text>
                      {!!reasonForVisit && (
                        <View style={casesStyles.briefInfoBlock}>
                          <Text style={casesStyles.briefSectionLabel}>Reason for Visit</Text>
                          <Text style={casesStyles.briefSectionText}>{reasonForVisit}</Text>
                        </View>
                      )}

                      <View style={casesStyles.briefInfoBlock}>
                        <Text style={casesStyles.briefSectionLabel}>Your Mission</Text>
                        <Text style={casesStyles.briefMissionText}>
                          {briefMissionText(selectedOverview)}
                        </Text>
                      </View>

                      <View style={casesStyles.modalSection}>
                        <Text style={casesStyles.modalSectionTitle}>Today’s Focus</Text>
                        {selectedOverview.achievements.map((achievement) => (
                          <View key={achievement.id} style={casesStyles.focusRow}>
                            <Text style={casesStyles.focusCheck}>✓</Text>
                            <Text style={casesStyles.focusText}>{achievement.title}</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={casesStyles.estimatedTimeText}>
                        Estimated time: {selectedOverview.estimatedTime.min || 3}-{selectedOverview.estimatedTime.max || 5} minutes
                      </Text>

                      <Text style={casesStyles.preceptorCueText}>
                        Next: Meet with Dr. Martinez before entering the encounter.
                      </Text>

                      <Pressable
                        onPress={() => setEvaluationDetailsVisible((visible) => !visible)}
                        style={casesStyles.evaluationToggle}
                      >
                        <Text style={casesStyles.evaluationToggleText}>
                          {evaluationDetailsVisible ? "Hide evaluation details" : "Show evaluation details"}
                        </Text>
                      </Pressable>

                      {evaluationDetailsVisible ? (
                        <>
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
                        </>
                      ) : null}

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
          <View style={casesStyles.preceptorOverlay}>
            {selectedOverview ? (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    casesStyles.preceptorHeroLayer,
                    isNarrowScreen && casesStyles.preceptorHeroLayerCompact,
                  ]}
                >
                  <MentorAvatar
                    mentorName={preceptorName}
                    mentorSlug={preceptorSlug}
                    isSpeaking={mentorSpeech.isSpeaking}
                    size={mentorAvatarSize}
                    variant="breakout-circle"
                  />
                </View>

                <View
                  style={[
                    casesStyles.sessionModal,
                    casesStyles.preceptorCard,
                    isNarrowScreen && casesStyles.preceptorCardCompact,
                  ]}
                >
                  <View style={casesStyles.preceptorFixedHeader}>
                    <View style={casesStyles.preceptorIdentityRow}>
                      <View style={casesStyles.preceptorHeaderText}>
                        <Text style={casesStyles.preceptorName}>{preceptorName}</Text>
                        <Text style={casesStyles.preceptorSpecialty}>{preceptorSpecialty}</Text>
                      </View>
                      <View style={casesStyles.preceptorVoiceControls}>
                        <Pressable
                          onPress={() => {
                            if (mentorVoiceEnabled) {
                              void mentorSpeech.stop();
                            }
                            setMentorVoiceEnabled((current) => !current);
                          }}
                          style={({ pressed }) => [
                            casesStyles.preceptorVoiceToggle,
                            { opacity: pressed ? 0.75 : 1 },
                          ]}
                        >
                          <Text style={casesStyles.preceptorVoiceToggleText}>
                            {mentorVoiceEnabled ? "Voice: On" : "Voice: Off"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      casesStyles.preceptorDialoguePanel,
                      isNarrowScreen && casesStyles.preceptorDialoguePanelCompact,
                    ]}
                  >
                    <ScrollView
                      ref={preceptorDialogueRef}
                      contentContainerStyle={casesStyles.preceptorDialogueContent}
                      onContentSizeChange={scrollPreceptorDialogueToEnd}
                    >
                      <View style={casesStyles.preceptorChatMessageGroup}>
                        <View
                          style={[
                            casesStyles.preceptorChatBubble,
                            casesStyles.preceptorChatBubbleAssistant,
                          ]}
                        >
                          <Text style={casesStyles.preceptorChatRole}>Dr. Martinez</Text>
                          <Text style={casesStyles.preceptorChatText}>{welcomeMessage}</Text>
                        </View>
                      </View>

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

                      <View style={casesStyles.preceptorChatMessages}>
                        {conversationMessages.length > 0
                          ? conversationMessages.map((message, index) => (
                              <View
                                key={`${message.role}-${index}`}
                                style={casesStyles.preceptorChatMessageGroup}
                              >
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
                              </View>
                            ))
                          : null}
                        {preceptorSending ? (
                          <Text style={casesStyles.preceptorChatEmpty}>Dr. Martinez is responding...</Text>
                        ) : null}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={casesStyles.preceptorFixedFooter}>
                    {preceptorError ? (
                      <Text style={casesStyles.errorText}>{preceptorError}</Text>
                    ) : null}
                    <ClinicalsChatComposer
                      value={preceptorInput}
                      onChangeText={setPreceptorInput}
                      editable={!preceptorSending}
                      placeholder="Ask a question before meeting the patient..."
                      submitLabel="Ask"
                      onSubmit={() => sendPreceptorMessage()}
                      sendDisabled={preceptorSending || !preceptorInput.trim()}
                      sending={preceptorSending}
                      onMicPress={preceptorTranscription.toggleRecording}
                      micDisabled={
                        preceptorSending ||
                        preceptorTranscription.transcribing ||
                        preceptorTranscription.recordingBusy
                      }
                      transcribing={preceptorTranscription.transcribing}
                      isRecording={preceptorTranscription.isRecording}
                    />

                    <View style={casesStyles.modalActions}>
                      <Pressable onPress={() => setBriefingVisible(false)} style={casesStyles.modalSecondaryButton}>
                        <Text style={casesStyles.modalSecondaryButtonText}>Back</Text>
                      </Pressable>
                      <Pressable onPress={meetPatient} style={casesStyles.modalPrimaryButton}>
                        <Text style={casesStyles.modalPrimaryButtonText}>Meet Patient</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
