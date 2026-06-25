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
import { CompactJourneyCard } from "../../src/components/CompactJourneyCard";
import { EncounterNodeCard } from "../../src/components/EncounterNodeCard";

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

function actionLabel(encounter?: TodayEncounter | null) {
  if (!encounter) return "Open Roadmap";
  if (encounter.status === "in_progress") return "Continue Encounter";
  if (encounter.status === "completed") return "Retry Encounter";
  return "Start Encounter";
}

function encounterDisplayParts(encounter?: TodayEncounter | null) {
  const displayTitle = encounter?.displayTitle || encounter?.title || "Patient Encounter";
  const [patientName, ...taskParts] = displayTitle.split(":");
  const taskTitle = taskParts.join(":").trim();

  return {
    patientName: taskTitle ? patientName.trim() : "Patient",
    taskTitle: taskTitle || displayTitle,
  };
}

function goalProgressText(goal?: TodayNextGoal | null) {
  const current = Number(goal?.currentValue);
  const target = Number(goal?.targetValue);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;

  const title = String(goal?.title || "");
  const description = String(goal?.description || "");
  const type = String(goal?.type || "");
  const isUnlockScoreGoal =
    target === 84 || /unlock|score|best/i.test(`${title} ${description} ${type}`);

  if (isUnlockScoreGoal) {
    return {
      primary: `Current best: ${Math.round(current)}%`,
      secondary: `Goal: ${Math.round(target)}% to unlock the next encounter`,
    };
  }

  const unit = /streak|day/i.test(`${title} ${description} ${type}`) ? " days" : " encounters";
  return {
    primary: `${Math.round(current)} / ${Math.round(target)}${unit}`,
    secondary: null,
  };
}

function mentorCoachingMessage({
  motivation,
  focus,
  goalProgress,
}: {
  motivation?: string | null;
  focus?: string | null;
  goalProgress?: ReturnType<typeof goalProgressText>;
}) {
  const pieces = [motivation, focus, goalProgress?.secondary]
    .filter(Boolean)
    .map((piece) => String(piece).trim().replace(/\s+/g, " "));

  if (pieces.length === 0) {
    return "Start with a professional introduction, then focus on the clinical task for this encounter.";
  }

  return Array.from(new Set(pieces)).join(" ");
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
  const mentorMessage = mentorCoachingMessage({
    motivation: dailyBriefing.motivation,
    focus: dailyBriefing.focus,
    goalProgress: nextGoalProgress,
  });
  const recommendedDisplay = encounterDisplayParts(recommendedEncounter);

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
            <Text style={portfolioStyles.screenSubtitle}>
              {user?.firstName ? `Welcome, ${user.firstName}.` : "Welcome."} What should you do next?
            </Text>
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

        <CompactJourneyCard
          levelTitle={identity.levelTitle}
          professionalLevel={identity.professionalLevel}
          xp={identity.xp}
          streakCount={streak.currentCount}
        />

        <View style={portfolioStyles.nextSessionCard}>
          <Text style={portfolioStyles.smallLabel}>Continue Your Journey</Text>
          {recommendedEncounter ? (
            <EncounterNodeCard
              patientName={recommendedDisplay.patientName}
              encounterTitle={recommendedDisplay.taskTitle}
              patientSessionSlug={recommendedEncounter.patientSessionSlug}
              caseId={recommendedEncounter.caseId}
              status={recommendedEncounter.status || "available"}
              tier={recommendedEncounter.badgeTier}
              bestScore={recommendedEncounter.bestSessionScore}
              estimatedTimeLabel={recommendedEncounter.estimatedTime?.label || null}
              onPress={openRecommendedSession}
              variant="today"
            />
          ) : (
            <Text style={portfolioStyles.nextSessionTitle}>
              You&apos;ve completed all currently available encounters.
            </Text>
          )}

          {!!nextGoal && (
            <View style={portfolioStyles.todayGoalTeaser}>
              <Text style={portfolioStyles.todayGoalTeaserLabel}>Next achievement</Text>
              <Text style={portfolioStyles.todayGoalTeaserText}>
                {nextGoal.icon ? `${nextGoal.icon} ` : ""}
                {nextGoal.title || "Clinical milestone"}
              </Text>
              {!!nextGoal.description && (
                <Text style={portfolioStyles.todayGoalTeaserMeta}>{nextGoal.description}</Text>
              )}
            </View>
          )}

          <View style={portfolioStyles.mentorCallout}>
            <Text style={portfolioStyles.mentorCalloutLabel}>🩺 Dr. Martinez · Mentor Guidance</Text>
            <Text style={portfolioStyles.mentorCalloutText}>{mentorMessage}</Text>
          </View>

          <Pressable onPress={openRecommendedSession} style={portfolioStyles.primaryCta}>
            <Text style={portfolioStyles.primaryCtaText}>{actionLabel(recommendedEncounter)}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
