import { useCallback, useMemo, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { caseStyles } from "../assets/styles/case.styles";
import { attemptResultStyles } from "../assets/styles/attempt-result.styles";
import { getItemAsync } from "../src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_PREFIX = "/api";

async function request(path: string, headers: Record<string, string> = {}) {
  if (!BASE_URL) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL in .env");
  const token = await getItemAsync("token");
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err: any = new Error(data?.error || data?.message || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

type SectionScore = {
  section: string;
  label?: string;
  earned_points: number;
  available_points: number;
};

type CriterionResult = {
  id: string;
  section: string;
  label: string;
  status: string;
  points: number;
  earned_points: number;
  evidence?: string[];
  rationale?: string | null;
  omit_reason?: string | null;
};

type SubmissionResult = {
  score: number;
  passing_score: number;
  passed: boolean;
  feedback: string;
  section_scores: SectionScore[];
  criteria_results: CriterionResult[];
  earned_points: number | null;
  available_points: number | null;
  case_points_awarded?: number | null;
  user_total_points?: number | null;
  user_level?: number | null;
  missed_required_questions: string[];
  missed_red_flags: string[];
  critical_fails_triggered: string[];
};

function normalizeSubmissionPayload(payload: any): SubmissionResult {
  const details = payload?.details && typeof payload.details === "object" ? payload.details : {};
  const score = Number(payload?.score ?? details?.score ?? 0) || 0;
  const passingScore = Number(payload?.passing_score ?? details?.passing_score ?? 84) || 84;
  const passedRaw = payload?.passed ?? details?.passed;
  const passed = typeof passedRaw === "boolean" ? passedRaw : score >= passingScore;

  return {
    score,
    passing_score: passingScore,
    passed,
    feedback: String(payload?.feedback ?? details?.feedback ?? ""),
    section_scores: Array.isArray(payload?.section_scores) ? payload.section_scores : Array.isArray(details?.section_scores) ? details.section_scores : [],
    criteria_results: Array.isArray(payload?.criteria_results) ? payload.criteria_results : Array.isArray(details?.criteria_results) ? details.criteria_results : [],
    earned_points: payload?.earned_points ?? details?.earned_points ?? null,
    available_points: payload?.available_points ?? details?.available_points ?? null,
    case_points_awarded: payload?.case_points_awarded ?? details?.case_points_awarded ?? null,
    user_total_points: payload?.user_total_points ?? details?.user_total_points ?? null,
    user_level: payload?.user_level ?? details?.user_level ?? null,
    missed_required_questions: Array.isArray(payload?.missed_required_questions) ? payload.missed_required_questions : Array.isArray(details?.missed_required_questions) ? details.missed_required_questions : [],
    missed_red_flags: Array.isArray(payload?.missed_red_flags) ? payload.missed_red_flags : Array.isArray(details?.missed_red_flags) ? details.missed_red_flags : [],
    critical_fails_triggered: Array.isArray(payload?.critical_fails_triggered) ? payload.critical_fails_triggered : Array.isArray(details?.critical_fails_triggered) ? details.critical_fails_triggered : [],
  };
}

function statusColor(status: string) {
  if (status === "met") return "#166534";
  if (status === "partially_met") return "#92400e";
  if (status === "omitted") return "#6b7280";
  return "#b91c1c";
}

function statusLabel(status: string) {
  if (status === "met") return "Met";
  if (status === "partially_met") return "Partially met";
  if (status === "omitted") return "Omitted";
  return "Missed";
}

export default function AttemptResultScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const userHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (user?.id) headers["x-clerk-user-id"] = user.id;
    if (user?.fullName) headers["x-user-name"] = user.fullName;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) headers["x-user-email"] = email;
    if (user?.imageUrl) headers["x-user-image"] = user.imageUrl;
    return headers;
  }, [user]);

  const loadResult = useCallback(async () => {
    if (!conversationId) return;
    try {
      setError(null);
      setLoading(true);
      const data = await request(`/conversations/${conversationId}`, userHeaders);
      if (!data?.submission) {
        setError("No submission found for this attempt.");
        return;
      }
      const normalized = normalizeSubmissionPayload({
        ...data.submission.details,
        score: data.submission.score,
        feedback: data.submission.feedback,
      });
      setResult(normalized);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load result.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, userHeaders]);

  // load on mount
  useEffect(() => { loadResult(); }, [loadResult]);

  return (
    <SafeAreaView style={attemptResultStyles.container}>
      {/* Header */}
      <View style={attemptResultStyles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={attemptResultStyles.backButton}
        >
          <Text style={attemptResultStyles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={attemptResultStyles.headerTitle}>Attempt Result</Text>
      </View>

      {loading ? (
        <View style={attemptResultStyles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={attemptResultStyles.errorContainer}>
          <Text style={attemptResultStyles.errorText}>{error}</Text>
          <Pressable
            onPress={loadResult}
            style={attemptResultStyles.retryButton}
          >
            <Text style={attemptResultStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : result ? (
        <FlatList
            data={result.criteria_results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={caseStyles.resultsFlatListContent}
            ListHeaderComponent={
                <View style={caseStyles.resultsHeaderContainer}>
                <View style={caseStyles.resultsCard}>

                    {/* Score */}
                    <View style={caseStyles.resultsScoreRow}>
                    <Text style={caseStyles.resultsScoreText}>{result.score}%</Text>
                    <Text style={[caseStyles.resultsPassText, { color: result.passed ? "#166534" : "#b91c1c" }]}>
                        {result.passed ? "Passed ✓" : "Not passed"} · threshold {result.passing_score}%
                    </Text>
                    </View>

                    {/* Points */}
                    {result.earned_points != null && (
                    <Text style={caseStyles.resultsPointsText}>
                        {result.earned_points} / {result.available_points} available points
                    </Text>
                    )}

                    {result.case_points_awarded != null && (
                    <Text style={caseStyles.resultsPointsText}>
                        Case points earned: {result.case_points_awarded}
                    </Text>
                    )}

                    {result.user_total_points != null && (
                    <Text style={caseStyles.resultsPointsText}>
                        Total user points: {result.user_total_points}
                        {result.user_level != null ? ` · level ${result.user_level}` : ""}
                    </Text>
                    )}

                    {/* Critical fails */}
                    {result.critical_fails_triggered.length > 0 && (
                    <View style={caseStyles.resultsCriticalBox}>
                        <Text style={caseStyles.resultsCriticalTitle}>Critical Fails</Text>
                        {result.critical_fails_triggered.map((item) => (
                        <Text key={item} style={caseStyles.resultsCriticalItem}>· {item}</Text>
                        ))}
                    </View>
                    )}

                    {/* Missed red flags */}
                    {result.missed_red_flags.length > 0 && (
                    <View style={caseStyles.resultsRedFlagBox}>
                        <Text style={caseStyles.resultsRedFlagTitle}>Missed Red Flags</Text>
                        {result.missed_red_flags.map((item) => (
                        <Text key={item} style={caseStyles.resultsRedFlagItem}>· {item}</Text>
                        ))}
                    </View>
                    )}

                    {/* Missed history */}
                    {result.missed_required_questions.length > 0 && (
                    <View style={caseStyles.resultsMissedBox}>
                        <Text style={caseStyles.resultsMissedTitle}>Missed History Items</Text>
                        {result.missed_required_questions.map((item) => (
                        <Text key={item} style={caseStyles.resultsMissedItem}>· {item}</Text>
                        ))}
                    </View>
                    )}
                </View>

                <View style={caseStyles.resultsCard}>
                    <Text style={caseStyles.resultsSectionTitle}>Section Scores</Text>
                    {result.section_scores.map((section) => (
                    <View key={section.section} style={caseStyles.resultsSectionRow}>
                        <Text style={caseStyles.resultsSectionLabel}>{section.label || section.section}</Text>
                        <Text style={caseStyles.resultsSectionPoints}>
                        {section.earned_points}/{section.available_points}
                        </Text>
                    </View>
                    ))}
                </View>

                <Text style={caseStyles.resultsSectionTitle}>Criterion Breakdown</Text>
                </View>
            }
            renderItem={({ item }) => (
                <View style={caseStyles.criterionCard}>
                <View style={caseStyles.criterionRow}>
                    <Text style={caseStyles.criterionLabel}>{item.label || item.id}</Text>
                    <Text style={[caseStyles.criterionStatusText, { color: statusColor(item.status) }]}>
                    {statusLabel(item.status)}
                    </Text>
                </View>
                <Text style={caseStyles.criterionMeta}>
                    {item.section} • {item.earned_points}/{item.points}
                </Text>
                {!!item.rationale && (
                    <Text style={caseStyles.criterionRationale}>{item.rationale}</Text>
                )}
                {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                    <Text style={caseStyles.criterionEvidence}>
                    Evidence: {item.evidence.slice(0, 2).join(" | ")}
                    </Text>
                )}
                {!!item.omit_reason && (
                    <Text style={caseStyles.criterionOmitReason}>Reason: {item.omit_reason}</Text>
                )}
                </View>
            )}
            ListFooterComponent={
                <View style={attemptResultStyles.transcriptFooter}>
                    <Pressable
                    onPress={() => setShowTranscript((prev) => !prev)}
                    style={({ pressed }) => [
                      attemptResultStyles.transcriptToggleButton,
                      {
                        backgroundColor: pressed ? "#f3f4f6" : "#f9fafb",
                        marginBottom: showTranscript ? 12 : 0,
                      },
                    ]}
                    >
                    <Text style={attemptResultStyles.transcriptToggleText}>
                        {showTranscript ? "Hide Transcript ▲" : "View Transcript ▼"}
                    </Text>
                    </Pressable>

                    {showTranscript && (
                    <View style={attemptResultStyles.transcriptList}>
                        {messages.length === 0 ? (
                        <Text style={attemptResultStyles.transcriptEmptyText}>No messages found.</Text>
                        ) : (
                        messages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            return (
                            <View
                                key={index}
                                style={[attemptResultStyles.messageBubble, { alignSelf: isUser ? "flex-end" : "flex-start" }]}
                            >
                                <Text style={attemptResultStyles.messageSender}>
                                    {isUser ? "You" : "Patient"}
                                </Text>
                                <Text>{msg.content}</Text>
                            </View>
                            );
                        })
                        )}
                    </View>
                    )}
                </View>
            }
        />
      ) : null}
    </SafeAreaView>
  );
}
