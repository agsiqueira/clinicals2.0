import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";

type CaseItem = {
  caseId: string;
  title: string;
  level?: number;
};

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
  linkedCase?: {
    caseId: string;
    title?: string | null;
    level?: number | null;
    setting?: string | null;
  } | null;
};

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
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [selectedOverview, setSelectedOverview] = useState<SessionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewVisible, setOverviewVisible] = useState(false);

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

  const loadCases = useCallback(async () => {
    try {
      setError(null);
      setLoadingCases(true);
      const data = await api.getCases();
      setCases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load cases.");
    } finally {
      setLoadingCases(false);
    }
  }, []);

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
      loadCases();
      loadProgress();
    }, [loadCases, loadProgress])
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
    const caseId = selectedOverview?.linkedCase?.caseId || "uti_level1";
    setOverviewVisible(false);
    router.push({ pathname: "/(tabs)/level1", params: { caseId } });
  };

  const renderLegacyCase = (item: CaseItem) => {
    const levelLabel = Math.max(1, Number(item.level ?? 1) || 1);
    return (
      <View key={item.caseId} style={casesStyles.caseCard}>
        <Pressable
          onPress={() => router.push({ pathname: "/(tabs)/level1", params: { caseId: item.caseId } })}
          style={({ pressed }) => [
            casesStyles.caseCardPressable,
            pressed && casesStyles.caseCardPressablePressed,
          ]}
        >
          <View style={casesStyles.caseCardHeaderRow}>
            <View style={casesStyles.caseCardHeaderText}>
              <Text style={casesStyles.caseCardLevelLabel}>Level {levelLabel}</Text>
              <Text style={casesStyles.caseCardTitle}>{item.title || `Level ${levelLabel}.1`}</Text>
              <Text style={casesStyles.caseCardHintText}>Tap here to start the patient interview.</Text>
            </View>
            <View style={casesStyles.caseCardLaunchPill}>
              <Text style={casesStyles.caseCardLaunchPillText}>Start</Text>
            </View>
          </View>
        </Pressable>
        <View style={casesStyles.attemptsRow}>
          <Pressable
            onPress={() => router.push({ pathname: "/attempts", params: { caseId: item.caseId } })}
            style={({ pressed }) => [
              casesStyles.attemptsButton,
              { backgroundColor: pressed ? "#f3f4f6" : "#f9fafb" },
            ]}
          >
            <Text style={casesStyles.attemptsButtonText}>Previous Attempts</Text>
          </Pressable>
        </View>
      </View>
    );
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

        <View style={casesStyles.sectionHeader}>
          <Text style={casesStyles.legacyTitle}>Legacy Case Flow</Text>
          <Text style={casesStyles.casesSubText}>The original case list remains available.</Text>
        </View>

        {loadingCases ? (
          <View style={casesStyles.loadingBlock}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={casesStyles.inlineErrorBox}>
            <Text style={casesStyles.errorText}>{error}</Text>
            <Pressable onPress={loadCases} style={casesStyles.retryButton}>
              <Text style={casesStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : cases.length === 0 ? (
          <Text style={casesStyles.emptyText}>No cases found.</Text>
        ) : (
          <View style={casesStyles.legacyList}>{cases.map(renderLegacyCase)}</View>
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

                {!!selectedOverview.preceptorBriefing && (
                  <View style={casesStyles.briefingBox}>
                    <Text style={casesStyles.briefingLabel}>Preceptor Briefing</Text>
                    <Text style={casesStyles.briefingText}>{selectedOverview.preceptorBriefing}</Text>
                  </View>
                )}

                <View style={casesStyles.modalActions}>
                  <Pressable onPress={() => setOverviewVisible(false)} style={casesStyles.modalSecondaryButton}>
                    <Text style={casesStyles.modalSecondaryButtonText}>Close</Text>
                  </Pressable>
                  <Pressable onPress={startSelectedSession} style={casesStyles.modalPrimaryButton}>
                    <Text style={casesStyles.modalPrimaryButtonText}>Start Session</Text>
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
