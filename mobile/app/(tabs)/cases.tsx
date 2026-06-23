import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/api/client";
import { casesStyles } from "../../assets/styles/cases.styles";

export default function HomeScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<{ caseId: string; title: string; level?: number }[]>([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);

  const userHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (user?.id) headers["x-clerk-user-id"] = user.id;
    if (user?.fullName) headers["x-user-name"] = user.fullName;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) headers["x-user-email"] = email;
    if (user?.imageUrl) headers["x-user-image"] = user.imageUrl;
    return headers;
  }, [user]);

  const displayName = useMemo(() => {
    // username, fallback to email, then "there"
    const info =
      user?.username ||
      user?.firstName ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      "there";

      // capitalize 1st letter
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

  return (
    <SafeAreaView style={casesStyles.container}>
      <View style={casesStyles.headerBar}>
        <View style={casesStyles.headerLeft}>
          <Text style={casesStyles.headerName}>
            Hi, {displayName}
          </Text>
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

      <View style={casesStyles.pointsSection}>
        <View style={casesStyles.pointsCard}>
          <Text style={casesStyles.pointsLabel}>
            TOTAL POINTS
          </Text>
          {loadingProgress ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <>
              <Text style={casesStyles.pointsValue}>
                {points}
              </Text>
              <Text style={casesStyles.pointsSubText}>Current level: {level}</Text>
              <Text style={casesStyles.pointsRetryNote}>
                Highest case score is kept when you retry.
              </Text>
            </>
          )}
        </View>

        <Text style={casesStyles.casesTitle}>Cases</Text>
        <Text style={casesStyles.casesSubText}>Select a case to begin the patient simulation.</Text>
      </View>

      {loadingCases ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Text style={casesStyles.errorText}>{error}</Text>
          <Pressable
            onPress={loadCases}
            style={casesStyles.retryButton}
          >
            <Text style={casesStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.caseId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={casesStyles.caseCard}>
              <Pressable
                onPress={() => router.push({ pathname: "/(tabs)/level1", params: { caseId: item.caseId } })}
                style={({ pressed }) => [
                  casesStyles.caseCardPressable,
                  pressed && casesStyles.caseCardPressablePressed,
                ]}
              >
                <View style={casesStyles.caseCardHeaderRow}>
                  <View style={casesStyles.caseCardHeaderText}>
                    <Text style={casesStyles.caseCardLevelLabel}>
                      Level {Math.max(1, Number(item.level ?? 1) || 1)}
                    </Text>
                    <Text style={casesStyles.caseCardTitle}>
                      {item.title || `Level ${Math.max(1, Number(item.level ?? 1) || 1)}.1`}
                    </Text>
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
                  style={({ pressed }) => (
                    [casesStyles.attemptsButton,
                    {backgroundColor: pressed ? "#f3f4f6" : "#f9fafb"}]
                  )}
                >
                  <Text style={casesStyles.attemptsButtonText}>Previous Attempts →</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 24 }}>
              <Text style={casesStyles.emptyText}>No cases found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
