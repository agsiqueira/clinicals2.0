import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../src/api/client";
import { portfolioStyles } from "../assets/styles/portfolio.styles";

type PortfolioMilestone = {
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  icon?: string | null;
  status: "LOCKED" | "IN_PROGRESS" | "EARNED" | string;
  currentValue?: number | null;
  targetValue?: number | null;
  earnedAt?: string | null;
};

type PortfolioCompetency = {
  slug: string;
  title: string;
  attempts: number;
  achievedCount: number;
  bestPercentScore?: number | null;
  latestPercentScore?: number | null;
};

type RecentPatient = {
  sessionAttemptId: string;
  patientSessionTitle?: string | null;
  caseTitle?: string | null;
  caseId?: string | null;
  sessionScore?: number | null;
  badgeTier?: string | null;
  passed?: boolean | null;
  scoredAt?: string | null;
};

type ClinicalPortfolio = {
  identity?: {
    professionalLevel?: number | null;
    levelTitle?: string | null;
    xp?: number | null;
    nextLevelXp?: number | null;
  };
  streak?: {
    currentCount?: number | null;
  };
  learningPathProgress?: {
    pathTitle?: string | null;
    completedSessions?: number | null;
    totalSessions?: number | null;
    percentComplete?: number | null;
    currentUnit?: {
      title?: string | null;
    } | null;
    currentSession?: {
      title?: string | null;
      bestSessionScore?: number | null;
    } | null;
  };
  milestones?: PortfolioMilestone[];
  competencies?: PortfolioCompetency[];
  professionalQualities?: unknown[];
  mentorCommendations?: unknown[];
  recentPatients?: RecentPatient[];
};

const CATEGORY_ORDER = [
  "milestone",
  "progression",
  "competency",
  "mastery",
  "improvement",
  "streak",
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, toNumber(value, 0)));
}

function progressRatio(current?: number | null, target?: number | null) {
  const denominator = toNumber(target, 0);
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(100, (toNumber(current, 0) / denominator) * 100));
}

function formatScore(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `${Math.round(Number(value))}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status?: string | null) {
  if (status === "EARNED") return "Earned";
  if (status === "IN_PROGRESS") return "In progress";
  return "Locked";
}

function badgeLabel(tier?: string | null) {
  if (tier === "GOLD") return "🥇 Gold";
  if (tier === "SILVER") return "🥈 Silver";
  if (tier === "BRONZE") return "🥉 Bronze";
  if (tier === "NONE") return "No badge";
  return tier || "Completed";
}

function categoryTitle(category: string) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupMilestones(milestones: PortfolioMilestone[] = []) {
  return [...milestones].reduce<Record<string, PortfolioMilestone[]>>((groups, milestone) => {
    const category = milestone.category || "milestone";
    groups[category] = groups[category] || [];
    groups[category].push(milestone);
    return groups;
  }, {});
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={portfolioStyles.progressTrack}>
      <View style={[portfolioStyles.progressFill, { width: `${clampPercent(value)}%` }]} />
    </View>
  );
}

export default function ClinicalPortfolioScreen() {
  const router = useRouter();
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [portfolio, setPortfolio] = useState<ClinicalPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadPortfolio = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded) {
        setLoading(true);
        return;
      }

      if (!userHeaders["x-clerk-user-id"]) {
        setPortfolio(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await api.getClinicalPortfolio(userHeaders);
        setPortfolio(data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load your clinical portfolio.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userHeaders, userLoaded]
  );

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [loadPortfolio])
  );

  const groupedMilestones = groupMilestones(portfolio?.milestones || []);
  const sortedCategories = Object.keys(groupedMilestones).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
  const identity = portfolio?.identity || {};
  const streak = portfolio?.streak || {};
  const pathProgress = portfolio?.learningPathProgress || {};

  if (loading && !portfolio) {
    return (
      <SafeAreaView style={portfolioStyles.container}>
        <View style={portfolioStyles.centeredState}>
          <ActivityIndicator />
          <Text style={portfolioStyles.stateText}>Loading Clinical Portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={portfolioStyles.container}>
      <ScrollView
        contentContainerStyle={portfolioStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPortfolio({ asRefresh: true })} />
        }
      >
        <View style={portfolioStyles.screenHeaderRow}>
          <View style={portfolioStyles.screenHeaderText}>
            <Pressable onPress={() => router.back()} style={portfolioStyles.backLink}>
              <Text style={portfolioStyles.backLinkText}>Back</Text>
            </Pressable>
            <Text style={portfolioStyles.screenTitle}>Clinical Portfolio</Text>
            <Text style={portfolioStyles.screenSubtitle}>Evidence of professional growth</Text>
          </View>
        </View>

        {error ? (
          <View style={portfolioStyles.errorBox}>
            <Text style={portfolioStyles.errorText}>{error}</Text>
            <Pressable onPress={() => loadPortfolio()} style={portfolioStyles.retryButton}>
              <Text style={portfolioStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={portfolioStyles.identityCard}>
          <Text style={portfolioStyles.identityLabel}>Professional Identity</Text>
          <Text style={portfolioStyles.identityTitle}>{identity.levelTitle || "Student Clinician"}</Text>
          <View style={portfolioStyles.identityStats}>
            <View style={portfolioStyles.identityStat}>
              <Text style={portfolioStyles.statValue}>Level {toNumber(identity.professionalLevel, 1)}</Text>
              <Text style={portfolioStyles.statLabel}>Professional level</Text>
            </View>
            <View style={portfolioStyles.identityStat}>
              <Text style={portfolioStyles.statValue}>{toNumber(identity.xp, 0)} XP</Text>
              <Text style={portfolioStyles.statLabel}>
                {identity.nextLevelXp != null ? `Next level at ${identity.nextLevelXp} XP` : "Experience"}
              </Text>
            </View>
          </View>
          <Text style={portfolioStyles.streakText}>
            🔥 {toNumber(streak.currentCount, 0)}-Day Streak
            {toNumber(streak.currentCount, 0) > 0 ? "" : " / Start your streak"}
          </Text>
        </View>

        <View style={portfolioStyles.section}>
          <View style={portfolioStyles.sectionHeadingRow}>
            <Text style={portfolioStyles.sectionTitle}>Learning Path Progress</Text>
            <Text style={portfolioStyles.sectionMeta}>{toNumber(pathProgress.percentComplete, 0)}%</Text>
          </View>
          <View style={portfolioStyles.card}>
            <Text style={portfolioStyles.cardTitle}>{pathProgress.pathTitle || "Clinical Encounter Foundations"}</Text>
            <ProgressBar value={toNumber(pathProgress.percentComplete, 0)} />
            <Text style={portfolioStyles.cardSubText}>
              {toNumber(pathProgress.completedSessions, 0)} of {toNumber(pathProgress.totalSessions, 0)} sessions complete
            </Text>
            <View style={portfolioStyles.currentWorkBox}>
              <Text style={portfolioStyles.smallLabel}>Current Unit</Text>
              <Text style={portfolioStyles.currentWorkText}>{pathProgress.currentUnit?.title || "All units complete"}</Text>
              <Text style={portfolioStyles.smallLabel}>Current Session</Text>
              <Text style={portfolioStyles.currentWorkText}>
                {pathProgress.currentSession?.title || "Portfolio up to date"}
              </Text>
            </View>
          </View>
        </View>

        <View style={portfolioStyles.section}>
          <Text style={portfolioStyles.sectionTitle}>Professional Milestones</Text>
          {sortedCategories.length === 0 ? (
            <Text style={portfolioStyles.emptyText}>Milestones will appear as your clinical work is evaluated.</Text>
          ) : (
            sortedCategories.map((category) => (
              <View key={category} style={portfolioStyles.milestoneGroup}>
                <Text style={portfolioStyles.categoryTitle}>{categoryTitle(category)}</Text>
                {groupedMilestones[category].map((milestone) => {
                  const earned = milestone.status === "EARNED";
                  const target = milestone.targetValue;
                  const current = milestone.currentValue;
                  return (
                    <View
                      key={milestone.slug}
                      style={[portfolioStyles.milestoneCard, earned && portfolioStyles.milestoneCardEarned]}
                    >
                      <Text style={portfolioStyles.milestoneIcon}>{milestone.icon || "•"}</Text>
                      <View style={portfolioStyles.milestoneBody}>
                        <View style={portfolioStyles.milestoneHeader}>
                          <Text style={portfolioStyles.milestoneTitle}>{milestone.title}</Text>
                          <Text style={[portfolioStyles.statusPill, earned && portfolioStyles.statusPillEarned]}>
                            {statusLabel(milestone.status)}
                          </Text>
                        </View>
                        {target != null ? (
                          <>
                            <Text style={portfolioStyles.milestoneProgressText}>
                              {toNumber(current, 0)} / {target}
                            </Text>
                            <ProgressBar value={progressRatio(current, target)} />
                          </>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        <View style={portfolioStyles.section}>
          <Text style={portfolioStyles.sectionTitle}>Clinical Competencies</Text>
          {(portfolio?.competencies || []).map((competency) => (
            <View key={competency.slug} style={portfolioStyles.card}>
              <View style={portfolioStyles.sectionHeadingRow}>
                <Text style={portfolioStyles.cardTitle}>{competency.title}</Text>
                <Text style={portfolioStyles.scoreText}>{formatScore(competency.bestPercentScore)}</Text>
              </View>
              <ProgressBar value={toNumber(competency.bestPercentScore, 0)} />
              <Text style={portfolioStyles.cardSubText}>
                Latest {formatScore(competency.latestPercentScore)} · {competency.achievedCount} achieved across {competency.attempts} attempts
              </Text>
            </View>
          ))}
        </View>

        <View style={portfolioStyles.section}>
          <Text style={portfolioStyles.sectionTitle}>Recent Patients</Text>
          {(portfolio?.recentPatients || []).length === 0 ? (
            <Text style={portfolioStyles.emptyText}>Completed patient encounters will appear here.</Text>
          ) : (
            (portfolio?.recentPatients || []).map((patient) => (
              <View key={patient.sessionAttemptId} style={portfolioStyles.patientCard}>
                <View style={portfolioStyles.patientMain}>
                  <Text style={portfolioStyles.cardTitle}>{patient.patientSessionTitle || "Patient Encounter"}</Text>
                  <Text style={portfolioStyles.cardSubText}>{patient.caseTitle || patient.caseId || "Clinical case"}</Text>
                  {!!patient.scoredAt && (
                    <Text style={portfolioStyles.dateText}>{formatDate(patient.scoredAt)}</Text>
                  )}
                </View>
                <View style={portfolioStyles.patientMeta}>
                  <Text style={portfolioStyles.scoreText}>{formatScore(patient.sessionScore)}</Text>
                  <Text style={portfolioStyles.badgeText}>{badgeLabel(patient.badgeTier)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={portfolioStyles.section}>
          <Text style={portfolioStyles.sectionTitle}>Professional Qualities</Text>
          <View style={portfolioStyles.placeholderCard}>
            <Text style={portfolioStyles.placeholderText}>
              Dr. Martinez will begin recognizing professional qualities as you complete more encounters.
            </Text>
          </View>
        </View>

        <View style={portfolioStyles.section}>
          <Text style={portfolioStyles.sectionTitle}>Mentor Commendations</Text>
          <View style={portfolioStyles.placeholderCard}>
            <Text style={portfolioStyles.placeholderText}>
              Commendations from Dr. Martinez will appear here as your clinical portfolio grows.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
