import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
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
import { api } from "../../src/api/client";
import { facultyStyles } from "../../assets/styles/faculty.styles";

type FacultyStudent = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type CompletionBySession = {
  patientSessionId: string;
  slug: string;
  title: string;
  unitTitle?: string | null;
  completedStudents: number;
  totalStudents: number;
  completionRate: number;
  averageBestScore?: number | null;
  totalAttempts: number;
};

type RecentAttempt = {
  sessionAttemptId: string;
  student: FacultyStudent;
  patientSessionTitle?: string | null;
  unitTitle?: string | null;
  score?: number | null;
  badgeTier?: string | null;
  attemptedAt?: string | null;
};

type StudentAtRisk = {
  student: FacultyStudent;
  attemptsCount: number;
  latestScore?: number | null;
  latestBadgeTier?: string | null;
  latestAttemptAt?: string | null;
  reasons: string[];
};

type StudentProgress = {
  student: FacultyStudent;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  attemptsCount: number;
  averageScore?: number | null;
  bestScore?: number | null;
  latestScore?: number | null;
  latestAttemptAt?: string | null;
};

type MissedObjective = {
  achievementId: string;
  title: string;
  competencyArea?: string | null;
  missedCount: number;
};

type SelectedPopulation = {
  id: string;
  name: string;
  type: string;
};

type PopulationPerformance = {
  totalStudents: number;
  activeStudents: number;
  totalAttempts: number;
  averageScore?: number | null;
  medianScore?: number | null;
  highestScore?: number | null;
  lowestScore?: number | null;
  completionRate: number;
  retryRate: number;
};

type ScoreDistributionBucket = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

type SessionDifficultySignal = {
  sessionId: string;
  sessionTitle: string;
  unitTitle?: string | null;
  attempts: number;
  averageScore?: number | null;
  completionRate: number;
  retryRate: number;
  commonMissedObjectives?: MissedObjective[];
  difficultySignal: "HIGH" | "MEDIUM" | "LOW";
};

type StudentGrowthSignal = {
  student: FacultyStudent;
  attemptsCount: number;
  firstScore?: number | null;
  latestScore?: number | null;
  bestScore?: number | null;
  scoreDelta?: number | null;
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
};

type TeachingInsight = {
  id: string;
  title: string;
  detail: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
};

type FacultyAnalytics = {
  populationPerformance?: PopulationPerformance;
  scoreDistribution?: ScoreDistributionBucket[];
  sessionDifficulty?: SessionDifficultySignal[];
  studentGrowth?: StudentGrowthSignal[];
  teachingInsights?: TeachingInsight[];
};

type FacultyDashboard = {
  generatedAt?: string | null;
  selectedPopulation?: SelectedPopulation;
  totalStudents: number;
  activeStudents: number;
  totalAttempts: number;
  averageScore?: number | null;
  completionBySession: CompletionBySession[];
  badgeDistribution: Record<string, number>;
  recentAttempts: RecentAttempt[];
  studentsAtRisk: StudentAtRisk[];
  studentProgress?: StudentProgress[];
  commonMissedObjectives?: MissedObjective[];
  analytics?: FacultyAnalytics;
  todos?: string[];
};

const LIST_PREVIEW_COUNT = 5;

function formatPercent(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${Math.round(number)}%`;
}

function formatScore(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${Math.round(number)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleDateString();
}

function studentName(student?: FacultyStudent | null) {
  return student?.name || student?.email || "Student";
}

function titleCase(value?: string | null) {
  if (!value) return "--";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signalStyle(signal?: string | null) {
  if (signal === "HIGH" || signal === "DECLINING") return facultyStyles.signalHigh;
  if (signal === "MEDIUM" || signal === "INSUFFICIENT_DATA") return facultyStyles.signalMedium;
  return facultyStyles.signalLow;
}

function ProgressBar({ value }: { value?: number | null }) {
  const width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  return (
    <View style={facultyStyles.barTrack}>
      <View style={[facultyStyles.barFill, { width }]} />
    </View>
  );
}

function sectionCountLabel(count: number, unit: "student" | "objective") {
  if (unit === "student") {
    return count === 1 ? "1 student" : `${count} students`;
  }
  return count === 1 ? "1 objective" : `${count} objectives`;
}

function SectionHeader({
  title,
  subtitle,
  summary,
}: {
  title: string;
  subtitle?: string;
  summary?: string;
}) {
  return (
    <View style={facultyStyles.sectionHeader}>
      <View style={facultyStyles.sectionHeaderRow}>
        <Text style={facultyStyles.sectionTitle}>{title}</Text>
        {summary ? <Text style={facultyStyles.listCountText}>{summary}</Text> : null}
      </View>
      {subtitle ? <Text style={facultyStyles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export default function FacultyDashboardScreen() {
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<FacultyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const loadDashboard = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded) {
        setLoading(true);
        return;
      }

      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await api.getFacultyDashboard(userHeaders);
        setDashboard(data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load faculty dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userHeaders, userLoaded]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={facultyStyles.container}>
        <View style={facultyStyles.centeredState}>
          <ActivityIndicator />
          <Text style={facultyStyles.stateText}>Loading faculty dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const badges = dashboard?.badgeDistribution || {};
  const completion = dashboard?.completionBySession || [];
  const atRisk = dashboard?.studentsAtRisk || [];
  const recentAttempts = dashboard?.recentAttempts || [];
  const studentProgress = dashboard?.studentProgress || [];
  const missedObjectives = dashboard?.commonMissedObjectives || [];
  const analytics = dashboard?.analytics || {};
  const populationPerformance = analytics.populationPerformance;
  const scoreDistribution = analytics.scoreDistribution || [];
  const sessionDifficulty = analytics.sessionDifficulty || [];
  const studentGrowth = analytics.studentGrowth || [];
  const teachingInsights = analytics.teachingInsights || [];
  const sectionExpanded = (section: string) => Boolean(expandedSections[section]);
  const toggleSection = (section: string) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };
  const listItems = <T,>(section: string, items: T[]) =>
    sectionExpanded(section) ? items : items.slice(0, LIST_PREVIEW_COUNT);
  const renderListToggle = (section: string, total: number) => {
    if (total <= LIST_PREVIEW_COUNT) return null;
    const expanded = sectionExpanded(section);
    const visibleCount = expanded ? total : LIST_PREVIEW_COUNT;

    return (
      <View style={facultyStyles.listFooter}>
        <Text style={facultyStyles.listCountText}>
          Showing {visibleCount} of {total}
        </Text>
        <Pressable onPress={() => toggleSection(section)} style={facultyStyles.listToggleButton}>
          <Text style={facultyStyles.listToggleText}>{expanded ? "Show less" : "Show all"}</Text>
        </Pressable>
      </View>
    );
  };
  const openStudent = (studentId?: string | null) => {
    if (!studentId) return;
    router.push({
      pathname: "/faculty/student/[studentId]",
      params: { studentId },
    });
  };
  const exportDashboardCsv = async () => {
    const url = api.getFacultyDashboardCsvUrl();
    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = url;
      link.download = "faculty-dashboard.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={facultyStyles.container}>
      <ScrollView
        contentContainerStyle={facultyStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard({ asRefresh: true })} />
        }
      >
        <View style={facultyStyles.headerRow}>
          <View style={facultyStyles.headerText}>
            <Text style={facultyStyles.title}>Faculty Dashboard</Text>
            <Text style={facultyStyles.subtitle}>
              Class progress, completion, student support signals, and recent activity.
            </Text>
          </View>
          <View style={facultyStyles.headerActions}>
            <Pressable onPress={exportDashboardCsv} style={facultyStyles.refreshButton}>
              <Text style={facultyStyles.refreshButtonText}>Export CSV</Text>
            </Pressable>
            <Pressable onPress={() => loadDashboard({ asRefresh: true })} style={facultyStyles.refreshButton}>
              <Text style={facultyStyles.refreshButtonText}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={facultyStyles.errorBox}>
            <Text style={facultyStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={facultyStyles.metricGrid}>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{dashboard?.totalStudents ?? 0}</Text>
            <Text style={facultyStyles.metricLabel}>Total students</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{dashboard?.activeStudents ?? 0}</Text>
            <Text style={facultyStyles.metricLabel}>Active recently</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{dashboard?.totalAttempts ?? 0}</Text>
            <Text style={facultyStyles.metricLabel}>Total attempts</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{formatScore(dashboard?.averageScore)}</Text>
            <Text style={facultyStyles.metricLabel}>Average score</Text>
          </View>
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Population Performance"
            subtitle={`${dashboard?.selectedPopulation?.name || "All Students"} · class-level research summary.`}
          />
          <View style={facultyStyles.metricGrid}>
            <View style={facultyStyles.metricCard}>
              <Text style={facultyStyles.metricValue}>{formatScore(populationPerformance?.medianScore)}</Text>
              <Text style={facultyStyles.metricLabel}>Median score</Text>
            </View>
            <View style={facultyStyles.metricCard}>
              <Text style={facultyStyles.metricValue}>{formatScore(populationPerformance?.highestScore)}</Text>
              <Text style={facultyStyles.metricLabel}>Highest score</Text>
            </View>
            <View style={facultyStyles.metricCard}>
              <Text style={facultyStyles.metricValue}>{formatScore(populationPerformance?.lowestScore)}</Text>
              <Text style={facultyStyles.metricLabel}>Lowest score</Text>
            </View>
            <View style={facultyStyles.metricCard}>
              <Text style={facultyStyles.metricValue}>{formatPercent(populationPerformance?.completionRate)}</Text>
              <Text style={facultyStyles.metricLabel}>Completion rate</Text>
            </View>
            <View style={facultyStyles.metricCard}>
              <Text style={facultyStyles.metricValue}>{formatPercent(populationPerformance?.retryRate)}</Text>
              <Text style={facultyStyles.metricLabel}>Retry rate</Text>
            </View>
          </View>
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Research & Teaching Analytics"
            subtitle="Deterministic signals from existing score, attempt, session, and objective data."
          />
          <View style={facultyStyles.rowCard}>
            <View style={facultyStyles.rowHeader}>
              <Text style={facultyStyles.rowTitle}>{dashboard?.selectedPopulation?.name || "All Students"}</Text>
              <Text style={facultyStyles.pill}>{dashboard?.selectedPopulation?.type || "ALL_USERS"}</Text>
            </View>
            <Text style={facultyStyles.rowMeta}>
              {populationPerformance?.totalStudents ?? dashboard?.totalStudents ?? 0} students ·{" "}
              {populationPerformance?.activeStudents ?? dashboard?.activeStudents ?? 0} active recently ·{" "}
              {populationPerformance?.totalAttempts ?? dashboard?.totalAttempts ?? 0} attempts
            </Text>
          </View>
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Score Distribution" subtitle="Scored attempts grouped by performance band." />
          {scoreDistribution.length > 0 ? (
            scoreDistribution.map((bucket) => (
              <View key={bucket.key} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{bucket.label}%</Text>
                  <Text style={facultyStyles.pill}>{bucket.count}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>{formatPercent(bucket.percent)} of scored attempts</Text>
                <ProgressBar value={bucket.percent} />
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No score distribution available yet.</Text>
          )}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Session Difficulty" subtitle="Completion, retry, score, and missed-objective signals." />
          {sessionDifficulty.length > 0 ? (
            listItems("sessionDifficulty", sessionDifficulty).map((session) => (
              <View key={session.sessionId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{session.sessionTitle}</Text>
                  <Text style={[facultyStyles.pill, signalStyle(session.difficultySignal)]}>
                    {session.difficultySignal}
                  </Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {session.attempts} attempts · avg {formatScore(session.averageScore)} · completion{" "}
                  {formatPercent(session.completionRate)} · retry {formatPercent(session.retryRate)}
                </Text>
                {(session.commonMissedObjectives || []).length > 0 ? (
                  <Text style={facultyStyles.rowMeta}>
                    Missed often: {(session.commonMissedObjectives || []).map((item) => item.title).join(", ")}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No session difficulty signals available yet.</Text>
          )}
          {renderListToggle("sessionDifficulty", sessionDifficulty.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Student Learning Growth"
            subtitle="First-to-latest scored attempt movement per student."
            summary={sectionCountLabel(studentGrowth.length, "student")}
          />
          {studentGrowth.length > 0 ? (
            listItems("studentGrowth", studentGrowth).map((item) => (
              <Pressable
                key={item.student.id}
                onPress={() => openStudent(item.student.id)}
                style={({ pressed }) => [
                  facultyStyles.rowCard,
                  { opacity: pressed ? 0.76 : 1 },
                ]}
              >
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{studentName(item.student)}</Text>
                  <Text style={[facultyStyles.pill, signalStyle(item.trend)]}>{titleCase(item.trend)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  first {formatScore(item.firstScore)} · latest {formatScore(item.latestScore)} · best{" "}
                  {formatScore(item.bestScore)} · delta{" "}
                  {item.scoreDelta == null ? "--" : `${item.scoreDelta > 0 ? "+" : ""}${item.scoreDelta}`}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No student growth signals available yet.</Text>
          )}
          {renderListToggle("studentGrowth", studentGrowth.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Teaching Insights" subtitle="Plain-language signals for planning support and review." />
          {teachingInsights.length > 0 ? (
            listItems("teachingInsights", teachingInsights).map((insight) => (
              <View key={insight.id} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{insight.title}</Text>
                  <Text style={[facultyStyles.pill, signalStyle(insight.severity)]}>{insight.severity}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>{insight.detail}</Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No teaching insights available yet.</Text>
          )}
          {renderListToggle("teachingInsights", teachingInsights.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Badge Distribution" subtitle="Scored attempts by awarded badge tier." />
          <View style={facultyStyles.badgeRow}>
            {["GOLD", "SILVER", "BRONZE", "NONE"].map((tier) => (
              <View key={tier} style={facultyStyles.badgeChip}>
                <Text style={facultyStyles.badgeValue}>{badges[tier] || 0}</Text>
                <Text style={facultyStyles.badgeLabel}>{tier}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Completion By Session" subtitle="Students with at least one scored attempt." />
          {completion.length > 0 ? (
            completion.map((session) => (
              <View key={session.patientSessionId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{session.title}</Text>
                  <Text style={facultyStyles.pill}>{formatPercent(session.completionRate)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {session.completedStudents}/{session.totalStudents} students · {session.totalAttempts} attempts · avg best{" "}
                  {formatScore(session.averageBestScore)}
                </Text>
                <ProgressBar value={session.completionRate} />
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No active sessions found.</Text>
          )}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Students Who May Need Help"
            subtitle="No attempts, latest score below 50%, or stale activity."
            summary={sectionCountLabel(atRisk.length, "student")}
          />
          {atRisk.length > 0 ? (
            listItems("atRisk", atRisk).map((item) => (
              <Pressable
                key={item.student.id}
                onPress={() => openStudent(item.student.id)}
                style={({ pressed }) => [
                  facultyStyles.rowCard,
                  facultyStyles.riskCard,
                  { opacity: pressed ? 0.76 : 1 },
                ]}
              >
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{studentName(item.student)}</Text>
                  <Text style={facultyStyles.pill}>{formatScore(item.latestScore)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {item.attemptsCount} attempts · latest {formatDate(item.latestAttemptAt)}
                </Text>
                <Text style={facultyStyles.riskReason}>{item.reasons.join(" · ")}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No students currently flagged.</Text>
          )}
          {renderListToggle("atRisk", atRisk.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Recent Attempts" subtitle="Most recent scored or in-progress session attempts." />
          {recentAttempts.length > 0 ? (
            listItems("recentAttempts", recentAttempts).map((attempt) => (
              <View key={attempt.sessionAttemptId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{studentName(attempt.student)}</Text>
                  <Text style={facultyStyles.pill}>{formatScore(attempt.score)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {attempt.patientSessionTitle || "Patient Session"} · {attempt.badgeTier || "NONE"} ·{" "}
                  {formatDate(attempt.attemptedAt)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No recent attempts yet.</Text>
          )}
          {renderListToggle("recentAttempts", recentAttempts.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Student Progress"
            subtitle="Simple completion and score summary per student."
            summary={sectionCountLabel(studentProgress.length, "student")}
          />
          {studentProgress.length > 0 ? (
            listItems("studentProgress", studentProgress).map((item) => (
              <Pressable
                key={item.student.id}
                onPress={() => openStudent(item.student.id)}
                style={({ pressed }) => [
                  facultyStyles.rowCard,
                  { opacity: pressed ? 0.76 : 1 },
                ]}
              >
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{studentName(item.student)}</Text>
                  <Text style={facultyStyles.pill}>{formatPercent(item.completionRate)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {item.completedSessions}/{item.totalSessions} sessions · {item.attemptsCount} attempts · avg{" "}
                  {formatScore(item.averageScore)} · best {formatScore(item.bestScore)}
                </Text>
                <ProgressBar value={item.completionRate} />
              </Pressable>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No student records yet.</Text>
          )}
          {renderListToggle("studentProgress", studentProgress.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader
            title="Common Missed Objectives"
            subtitle="Achievements most often missed on scored attempts."
            summary={sectionCountLabel(missedObjectives.length, "objective")}
          />
          {missedObjectives.length > 0 ? (
            listItems("missedObjectives", missedObjectives).map((item) => (
              <View key={item.achievementId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{item.title}</Text>
                  <Text style={facultyStyles.pill}>{item.missedCount}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>{item.competencyArea || "Clinical objective"}</Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No missed objectives available.</Text>
          )}
          {renderListToggle("missedObjectives", missedObjectives.length)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
