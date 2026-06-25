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
import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";
import { SessionCard } from "../../src/components/SessionCard";

type TodayIdentity = {
  professionalLevel?: number | null;
  levelTitle?: string | null;
  xp?: number | null;
  nextLevelXp?: number | null;
  streak?: {
    currentCount?: number | null;
    longestCount?: number | null;
    status?: string | null;
  } | null;
};

type TodayEncounter = {
  patientSessionId?: string | null;
  patientSessionSlug?: string | null;
  caseId?: string | null;
  title?: string | null;
  displayTitle?: string | null;
  description?: string | null;
  unitTitle?: string | null;
  status?: "locked" | "available" | "completed" | string;
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  bestSessionScore?: number | null;
  estimatedTime?: {
    min?: number | null;
    max?: number | null;
    label?: string | null;
  } | null;
  launchParams?: {
    caseId?: string | null;
    patientSessionSlug?: string | null;
    requiresHpi?: boolean | null;
  } | null;
};

type TodayResponse = {
  identity?: TodayIdentity | null;
  recommendedEncounter?: TodayEncounter | null;
  dailyBriefing?: {
    motivation?: string | null;
    focus?: string | null;
    nextGoal?: {
      type?: string | null;
      slug?: string | null;
      title?: string | null;
      icon?: string | null;
      currentValue?: number | null;
      targetValue?: number | null;
      description?: string | null;
    } | null;
  } | null;
  roadmapCta?: {
    title?: string | null;
    body?: string | null;
  } | null;
};

type TodayNextGoal = NonNullable<NonNullable<TodayResponse["dailyBriefing"]>["nextGoal"]>;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function actionLabel(encounter?: TodayEncounter | null) {
  if (!encounter) return "Open Roadmap";
  if (encounter.status === "completed") return "Retry Encounter";
  return "Start Encounter";
}

function goalProgressText(goal?: TodayNextGoal | null) {
  const current = Number(goal?.currentValue);
  const target = Number(goal?.targetValue);
  if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
    return `${current} of ${target}`;
  }
  return null;
}

export default function TodayScreen() {
  const { signOut } = useClerk();
  const router = useRouter();
  const { userId: authUserId, sessionId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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

  const loadToday = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded) {
        setLoading(true);
        return;
      }

      if (!userHeaders["x-clerk-user-id"]) {
        setToday(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await api.getToday(userHeaders);
        setToday(data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load Today.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userHeaders, userLoaded]
  );

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

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

  const identity = today?.identity || {};
  const streak = identity.streak || {};
  const recommendedEncounter = today?.recommendedEncounter || null;
  const dailyBriefing = today?.dailyBriefing || {};
  const nextGoal = dailyBriefing.nextGoal || null;
  const nextGoalProgress = goalProgressText(nextGoal);
  const roadmapCta = today?.roadmapCta || {
    title: "Explore your full learning path",
    body: "See all units, upcoming encounters, and what unlocks next.",
  };

  const recommendedSession = recommendedEncounter
    ? {
        id: recommendedEncounter.patientSessionId || recommendedEncounter.patientSessionSlug || "today-session",
        slug: recommendedEncounter.patientSessionSlug || undefined,
        title: recommendedEncounter.displayTitle || recommendedEncounter.title || "Next Encounter",
        objective: recommendedEncounter.description || undefined,
        status: recommendedEncounter.status || "available",
        badgeTier: recommendedEncounter.badgeTier || null,
        bestSessionScore: recommendedEncounter.bestSessionScore ?? null,
      }
    : null;

  const openRecommendedSession = () => {
    if (!recommendedEncounter?.patientSessionSlug) {
      router.push("/(tabs)/cases");
      return;
    }

    router.push({
      pathname: "/(tabs)/cases",
      params: {
        focusSessionSlug: recommendedEncounter.patientSessionSlug,
        focusSessionToken: String(Date.now()),
      },
    });
  };

  if (loading && !today) {
    return (
      <SafeAreaView style={portfolioStyles.container}>
        <View style={portfolioStyles.centeredState}>
          <ActivityIndicator />
          <Text style={portfolioStyles.stateText}>Loading Today...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={portfolioStyles.container}>
      <ScrollView
        contentContainerStyle={portfolioStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadToday({ asRefresh: true })} />
        }
      >
        <View style={portfolioStyles.screenHeaderRow}>
          <View style={portfolioStyles.screenHeaderText}>
            <Text style={portfolioStyles.screenTitle}>Today</Text>
            <Text style={portfolioStyles.screenSubtitle}>Your next step in clinical practice</Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={[portfolioStyles.signOutButton, { opacity: signingOut ? 0.6 : 1 }]}
          >
            <Text style={portfolioStyles.signOutButtonText}>
              {signingOut ? "Signing out..." : "Sign Out"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View style={portfolioStyles.errorBox}>
            <Text style={portfolioStyles.errorText}>{error}</Text>
            <Pressable onPress={() => loadToday()} style={portfolioStyles.retryButton}>
              <Text style={portfolioStyles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={portfolioStyles.todayHeroCard}>
          <Text style={portfolioStyles.identityLabel}>Your Journey</Text>
          <Text style={portfolioStyles.identityTitle}>{identity.levelTitle || "Student Clinician"}</Text>
          <View style={portfolioStyles.compactStatsRow}>
            <Text style={portfolioStyles.compactStatText}>
              Level {toNumber(identity.professionalLevel, 1)}
            </Text>
            <Text style={portfolioStyles.compactStatText}>{toNumber(identity.xp, 0)} XP</Text>
            <Text style={portfolioStyles.compactStatText}>
              🔥 {toNumber(streak.currentCount, 0)} days
            </Text>
          </View>
          <Pressable onPress={() => router.push("/clinical-portfolio")} style={portfolioStyles.journeyPortfolioLink}>
            <Text style={portfolioStyles.portfolioTextLinkText}>View Full Clinical Portfolio →</Text>
          </Pressable>
        </View>

        <View style={portfolioStyles.nextSessionCard}>
          <Text style={portfolioStyles.smallLabel}>Your Next Encounter</Text>
          {recommendedSession ? (
            <SessionCard
              session={recommendedSession}
              metaValue={recommendedEncounter?.estimatedTime?.label || null}
              onPress={openRecommendedSession}
            />
          ) : (
            <Text style={portfolioStyles.nextSessionTitle}>
              You&apos;ve completed all currently available encounters.
            </Text>
          )}

          <View style={portfolioStyles.mentorCallout}>
            <Text style={portfolioStyles.mentorCalloutLabel}>💬 Dr. Martinez</Text>
            {!!dailyBriefing.motivation && (
              <Text style={portfolioStyles.mentorCalloutText}>{dailyBriefing.motivation}</Text>
            )}
            {!!dailyBriefing.focus && (
              <>
                <Text style={portfolioStyles.mentorCalloutSectionLabel}>Today&apos;s Focus</Text>
                <Text style={portfolioStyles.mentorCalloutText}>{dailyBriefing.focus}</Text>
              </>
            )}
            {!!nextGoal && (
              <>
                <Text style={portfolioStyles.mentorCalloutSectionLabel}>Next Goal</Text>
                <Text style={portfolioStyles.mentorCalloutText}>
                  {nextGoal.icon ? `${nextGoal.icon} ` : ""}
                  {nextGoal.title || "Clinical milestone"}
                  {nextGoalProgress ? ` · ${nextGoalProgress}` : ""}
                </Text>
              </>
            )}
          </View>

          <Pressable onPress={openRecommendedSession} style={portfolioStyles.primaryCta}>
            <Text style={portfolioStyles.primaryCtaText}>{actionLabel(recommendedEncounter)}</Text>
          </Pressable>
        </View>

        <View style={portfolioStyles.roadmapHelperCard}>
          <View style={portfolioStyles.roadmapSecondaryText}>
            <Text style={portfolioStyles.roadmapSecondaryTitle}>
              {roadmapCta.title || "Explore your full learning path"}
            </Text>
            <Text style={portfolioStyles.roadmapSecondaryBody}>
              {roadmapCta.body || "See all units, upcoming encounters, and what unlocks next."}
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/cases")} style={portfolioStyles.roadmapSecondaryButton}>
            <Text style={portfolioStyles.roadmapSecondaryButtonText}>Roadmap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
