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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../../../src/api/client";
import { facultyStyles } from "../../../../assets/styles/faculty.styles";

type StudentDetail = {
  student?: {
    id: string;
    name?: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null;
  summary?: {
    totalAttempts?: number | null;
    averageScore?: number | null;
    latestScore?: number | null;
    latestActivityAt?: string | null;
    bestBadgeTier?: string | null;
    completedSessionsCount?: number | null;
    totalSessions?: number | null;
  } | null;
  riskFlags?: string[];
  attempts?: StudentAttempt[];
  sessions?: StudentSession[];
  objectiveSummary?: ObjectiveSummary[];
};

type StudentAttempt = {
  id: string;
  patientSessionTitle?: string | null;
  unitTitle?: string | null;
  status?: string | null;
  score?: number | null;
  badgeTier?: string | null;
  passed?: boolean | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  activityAt?: string | null;
  completedObjectives?: ObjectiveResult[];
  missedObjectives?: ObjectiveResult[];
};

type StudentSession = {
  patientSessionId: string;
  title: string;
  unitTitle?: string | null;
  attemptsCount: number;
  bestScore?: number | null;
  latestScore?: number | null;
  bestBadgeTier?: string | null;
  completed: boolean;
};

type ObjectiveResult = {
  achievementId: string;
  title: string;
  competencyArea?: string | null;
  percentScore?: number | null;
};

type ObjectiveSummary = {
  achievementId: string;
  title: string;
  competencyArea?: string | null;
  completedCount: number;
  missedCount: number;
  latestStatus?: string | null;
};

const LIST_PREVIEW_COUNT = 5;

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

function completionRate(completed?: number | null, total?: number | null) {
  const done = Number(completed || 0);
  const all = Number(total || 0);
  if (!Number.isFinite(done) || !Number.isFinite(all) || all <= 0) return 0;
  return Math.round((done / all) * 100);
}

function ProgressBar({ value }: { value?: number | null }) {
  const width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  return (
    <View style={facultyStyles.barTrack}>
      <View style={[facultyStyles.barFill, { width }]} />
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={facultyStyles.sectionHeader}>
      <Text style={facultyStyles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={facultyStyles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export default function FacultyStudentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const { userId: authUserId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
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

  const loadStudent = useCallback(
    async ({ asRefresh = false } = {}) => {
      if (!userLoaded || !studentId) {
        setLoading(true);
        return;
      }

      try {
        setError(null);
        if (asRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await api.getFacultyStudentDetail(studentId, userHeaders);
        setDetail(data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load student detail.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId, userHeaders, userLoaded]
  );
  const exportStudentCsv = async () => {
    if (!studentId) return;
    const url = api.getFacultyStudentCsvUrl(studentId);
    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = url;
      link.download = `faculty-student-${studentId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    await Linking.openURL(url);
  };
  const returnToFacultyDashboard = () => {
    router.replace("/faculty");
  };

  useFocusEffect(
    useCallback(() => {
      loadStudent();
    }, [loadStudent])
  );

  if (loading && !detail) {
    return (
      <SafeAreaView style={facultyStyles.container}>
        <View style={facultyStyles.centeredState}>
          <ActivityIndicator />
          <Text style={facultyStyles.stateText}>Loading student detail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = detail?.summary || {};
  const student = detail?.student || {};
  const riskFlags = detail?.riskFlags || [];
  const attempts = detail?.attempts || [];
  const sessions = detail?.sessions || [];
  const objectives = detail?.objectiveSummary || [];
  const progress = completionRate(summary.completedSessionsCount, summary.totalSessions);
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

  return (
    <SafeAreaView style={facultyStyles.container}>
      <ScrollView
        contentContainerStyle={facultyStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadStudent({ asRefresh: true })} />
        }
      >
        <View style={facultyStyles.headerRow}>
          <View style={facultyStyles.headerText}>
            <Pressable onPress={returnToFacultyDashboard} style={facultyStyles.refreshButton}>
              <Text style={facultyStyles.refreshButtonText}>← Faculty Dashboard</Text>
            </Pressable>
            <Text style={facultyStyles.title}>{student.displayName || student.name || "Student"}</Text>
            {student.email ? <Text style={facultyStyles.subtitle}>{student.email}</Text> : null}
          </View>
          <View style={facultyStyles.headerActions}>
            <Pressable onPress={exportStudentCsv} style={facultyStyles.refreshButton}>
              <Text style={facultyStyles.refreshButtonText}>Export CSV</Text>
            </Pressable>
            <Pressable onPress={() => loadStudent({ asRefresh: true })} style={facultyStyles.refreshButton}>
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
            <Text style={facultyStyles.metricValue}>{summary.totalAttempts ?? 0}</Text>
            <Text style={facultyStyles.metricLabel}>Attempts</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{formatScore(summary.averageScore)}</Text>
            <Text style={facultyStyles.metricLabel}>Average score</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{formatScore(summary.latestScore)}</Text>
            <Text style={facultyStyles.metricLabel}>Latest score</Text>
          </View>
          <View style={facultyStyles.metricCard}>
            <Text style={facultyStyles.metricValue}>{summary.bestBadgeTier || "NONE"}</Text>
            <Text style={facultyStyles.metricLabel}>Best badge</Text>
          </View>
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Risk Flags" subtitle={`Latest activity: ${formatDate(summary.latestActivityAt)}`} />
          {riskFlags.length > 0 ? (
            riskFlags.map((flag) => (
              <View key={flag} style={[facultyStyles.rowCard, facultyStyles.riskCard]}>
                <Text style={facultyStyles.riskReason}>{flag}</Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No current risk flags.</Text>
          )}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Session Progress" subtitle={`${summary.completedSessionsCount || 0}/${summary.totalSessions || 0} sessions completed.`} />
          <ProgressBar value={progress} />
          {sessions.length > 0 ? (
            listItems("sessions", sessions).map((session) => (
              <View key={session.patientSessionId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{session.title}</Text>
                  <Text style={facultyStyles.pill}>{session.completed ? "Completed" : "Open"}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {session.attemptsCount} attempts · best {formatScore(session.bestScore)} · latest{" "}
                  {formatScore(session.latestScore)} · {session.bestBadgeTier || "NONE"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No active sessions available.</Text>
          )}
          {renderListToggle("sessions", sessions.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Recent Attempts" subtitle="Session attempts with completed and missed objectives." />
          {attempts.length > 0 ? (
            listItems("attempts", attempts).map((attempt) => (
              <View key={attempt.id} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{attempt.patientSessionTitle || "Patient Session"}</Text>
                  <Text style={facultyStyles.pill}>{formatScore(attempt.score)}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  {attempt.badgeTier || "NONE"} · {formatDate(attempt.activityAt || attempt.submittedAt || attempt.startedAt)}
                </Text>
                <Text style={facultyStyles.rowMeta}>
                  Completed objectives: {attempt.completedObjectives?.length || 0} · Missed objectives:{" "}
                  {attempt.missedObjectives?.length || 0}
                </Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No attempts yet.</Text>
          )}
          {renderListToggle("attempts", attempts.length)}
        </View>

        <View style={facultyStyles.sectionCard}>
          <SectionHeader title="Objective Summary" subtitle="Completed and missed objective counts across scored attempts." />
          {objectives.length > 0 ? (
            listItems("objectives", objectives).map((objective) => (
              <View key={objective.achievementId} style={facultyStyles.rowCard}>
                <View style={facultyStyles.rowHeader}>
                  <Text style={facultyStyles.rowTitle}>{objective.title}</Text>
                  <Text style={facultyStyles.pill}>{objective.latestStatus || "n/a"}</Text>
                </View>
                <Text style={facultyStyles.rowMeta}>
                  Completed {objective.completedCount} · Missed {objective.missedCount}
                  {objective.competencyArea ? ` · ${objective.competencyArea}` : ""}
                </Text>
              </View>
            ))
          ) : (
            <Text style={facultyStyles.emptyText}>No objective data available yet.</Text>
          )}
          {renderListToggle("objectives", objectives.length)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
