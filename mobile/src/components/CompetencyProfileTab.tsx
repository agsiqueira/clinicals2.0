import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";

type CompetencyTrend = "IMPROVING" | "STABLE" | "NEEDS_PRACTICE" | "INSUFFICIENT_DATA" | string;

type CompetencyItem = {
  id: string;
  name: string;
  description?: string | null;
  currentScore?: number | null;
  trend?: CompetencyTrend | null;
};

type CompetencyProfile = {
  student?: {
    displayName?: string | null;
  };
  summary?: {
    completedSessions?: number | null;
    totalAttempts?: number | null;
    averageScore?: number | null;
  };
  competencies?: CompetencyItem[];
  growthSummary?: {
    strongestCompetency?: CompetencyItem | null;
    needsMostPractice?: CompetencyItem | null;
    overallCompetencyScore?: number | null;
    completedSessions?: number | null;
  };
};

function clampPercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function formatScore(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `${Math.round(Number(value))}%`;
}

function trendLabel(trend?: CompetencyTrend | null) {
  if (trend === "IMPROVING") return "Improving";
  if (trend === "NEEDS_PRACTICE") return "Needs Practice";
  if (trend === "STABLE") return "Stable";
  return "Insufficient Data";
}

function trendStyle(trend?: CompetencyTrend | null) {
  if (trend === "IMPROVING") return portfolioStyles.trendPillImproving;
  if (trend === "NEEDS_PRACTICE") return portfolioStyles.trendPillNeedsPractice;
  if (trend === "STABLE") return portfolioStyles.trendPillStable;
  return portfolioStyles.trendPillInsufficient;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={portfolioStyles.progressTrack}>
      <View style={[portfolioStyles.progressFill, { width: `${clampPercent(value)}%` }]} />
    </View>
  );
}

function CompetencyCard({ competency }: { competency: CompetencyItem }) {
  const score = competency.currentScore;

  return (
    <View style={portfolioStyles.competencyProfileCard}>
      <View style={portfolioStyles.competencyProfileHeader}>
        <Text style={portfolioStyles.cardTitle}>{competency.name}</Text>
        <Text style={[portfolioStyles.trendPill, trendStyle(competency.trend)]}>
          {trendLabel(competency.trend)}
        </Text>
      </View>
      <View style={portfolioStyles.competencyProfileScoreRow}>
        <View style={portfolioStyles.competencyProfileScoreMain}>
          <ProgressBar value={score ?? 0} />
        </View>
        <Text style={portfolioStyles.competencyProfilePercent}>{formatScore(score)}</Text>
      </View>
      {!!competency.description && (
        <Text style={portfolioStyles.cardSubText}>{competency.description}</Text>
      )}
    </View>
  );
}

export function CompetencyProfileTab({
  userHeaders,
}: {
  userHeaders: Record<string, string>;
}) {
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userHeaders["x-clerk-user-id"]) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await api.getCompetencyProfile(userHeaders);
      setProfile(data || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load competency profile.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userHeaders]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (loading && !profile) {
    return (
      <View style={portfolioStyles.dashboardCard}>
        <ActivityIndicator />
        <Text style={portfolioStyles.cardSubText}>Loading competency profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={portfolioStyles.errorBox}>
        <Text style={portfolioStyles.errorText}>{error}</Text>
        <Pressable onPress={loadProfile} style={portfolioStyles.retryButton}>
          <Text style={portfolioStyles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const growthSummary = profile?.growthSummary || {};
  const competencies = profile?.competencies || [];
  const scoredCompetencies = competencies.filter((item) => item.currentScore != null);

  return (
    <>
      <View style={portfolioStyles.dashboardCardAccent}>
        <Text style={portfolioStyles.sectionTitle}>Growth Summary</Text>
        <View style={portfolioStyles.growthSummaryGrid}>
          <View style={portfolioStyles.growthSummaryItem}>
            <Text style={portfolioStyles.smallLabel}>Strongest Competency</Text>
            <Text style={portfolioStyles.cardTitle}>
              {growthSummary.strongestCompetency?.name || "Not enough data yet"}
            </Text>
            <Text style={portfolioStyles.cardSubText}>
              {formatScore(growthSummary.strongestCompetency?.currentScore)}
            </Text>
          </View>
          <View style={portfolioStyles.growthSummaryItem}>
            <Text style={portfolioStyles.smallLabel}>Needs Most Practice</Text>
            <Text style={portfolioStyles.cardTitle}>
              {growthSummary.needsMostPractice?.name || "Not enough data yet"}
            </Text>
            <Text style={portfolioStyles.cardSubText}>
              {formatScore(growthSummary.needsMostPractice?.currentScore)}
            </Text>
          </View>
          <View style={portfolioStyles.growthSummaryItem}>
            <Text style={portfolioStyles.smallLabel}>Overall Competency Score</Text>
            <Text style={portfolioStyles.metricValueCompact}>
              {formatScore(growthSummary.overallCompetencyScore)}
            </Text>
          </View>
          <View style={portfolioStyles.growthSummaryItem}>
            <Text style={portfolioStyles.smallLabel}>Completed Sessions</Text>
            <Text style={portfolioStyles.metricValueCompact}>
              {growthSummary.completedSessions ?? profile?.summary?.completedSessions ?? 0}
            </Text>
          </View>
        </View>
      </View>

      <View style={portfolioStyles.dashboardCard}>
        <View style={portfolioStyles.sectionHeadingRow}>
          <Text style={portfolioStyles.sectionTitle}>Competencies</Text>
          <Text style={portfolioStyles.sectionMeta}>
            {scoredCompetencies.length} tracked
          </Text>
        </View>
        {competencies.length === 0 ? (
          <Text style={portfolioStyles.emptyText}>
            Complete scored sessions to begin building your competency profile.
          </Text>
        ) : (
          competencies.map((competency) => (
            <CompetencyCard key={competency.id} competency={competency} />
          ))
        )}
      </View>
    </>
  );
}
