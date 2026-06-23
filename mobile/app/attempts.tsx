import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../src/api/client";

type Attempt = {
  conversationId: string;
  submittedAt: string;
  score: number | null;
  passed: boolean | null;
  attemptNumber: number;
};

export default function AttemptsScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (user?.id) headers["x-clerk-user-id"] = user.id;
    if (user?.fullName) headers["x-user-name"] = user.fullName;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) headers["x-user-email"] = email;
    if (user?.imageUrl) headers["x-user-image"] = user.imageUrl;
    return headers;
  }, [user]);

  const loadAttempts = useCallback(async () => {
    if (!caseId) return;
    try {
      setError(null);
      setLoading(true);
      const data = await api.getAttemptsByCase(caseId, userHeaders);
      setAttempts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load attempts.");
    } finally {
      setLoading(false);
    }
  }, [caseId, userHeaders]);

  useFocusEffect(
    useCallback(() => {
      loadAttempts();
    }, [loadAttempts])
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 4, paddingRight: 8 }}
        >
          <Text style={{ fontSize: 16, color: "#1d4ed8" }}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700" }}>Previous Attempts</Text>
          <Text style={{ color: "#6b7280", fontSize: 13 }}>Case: {caseId}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "600" }}>{error}</Text>
          <Pressable
            onPress={loadAttempts}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={attempts}
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const date = item.submittedAt
              ? new Date(item.submittedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Unknown date";
            const scoreLabel = item.score != null ? `${item.score}%` : "No score";
            const passedColor =
              item.passed === true
                ? "#166534"
                : item.passed === false
                ? "#b91c1c"
                : "#6b7280";
            const passedLabel =
              item.passed === true
                ? "Passed"
                : item.passed === false
                ? "Not passed"
                : "—";

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/attempt-result",
                    params: { conversationId: item.conversationId },
                  })
                }
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 12,
                  padding: 14,
                  backgroundColor: pressed ? "#f9fafb" : "#ffffff",
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: "700" }}>
                  Attempt {item.attemptNumber}
                </Text>
                <Text style={{ color: "#6b7280", marginTop: 2 }}>{date}</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 16 }}>{scoreLabel}</Text>
                  <Text style={{ fontWeight: "600", color: passedColor }}>
                    {passedLabel}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 24 }}>
              <Text style={{ color: "#6b7280" }}>No submitted attempts yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}