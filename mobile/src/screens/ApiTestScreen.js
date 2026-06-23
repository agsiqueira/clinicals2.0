import React, { useMemo, useState } from "react";
import { ScrollView, View, Text, Button, Pressable } from "react-native";
import { router } from "expo-router";
import { api } from "../api/client";

export default function ApiTestScreen() {
  const [loading, setLoading] = useState(false);

  const [healthOut, setHealthOut] = useState(null); // string | object | null
  const [cases, setCases] = useState([]); // [{ caseId, title, ... }]
  const [errorOut, setErrorOut] = useState(null); // { error, status, data } | null

  const levels = useMemo(() => {
    // Turn "uti_level1" into { label: "Level 1", caseId: "uti_level1" }
    return cases
      .map((c) => {
        const id = c?.caseId || "";
        const m = id.match(/level(\d+)/i);
        if (!m) return null;
        return { label: `Level ${m[1]}`, caseId: id };
      })
      .filter(Boolean);
  }, [cases]);

  const runHealth = async () => {
    setLoading(true);
    setErrorOut(null);
    try {
      const data = await api.health();
      setHealthOut(data);
    } catch (e) {
      setHealthOut(null);
      setErrorOut({
        error: e?.message ?? "Request failed",
        status: e?.status,
        data: e?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const runCases = async () => {
    setLoading(true);
    setErrorOut(null);
    try {
      const data = await api.getCases();
      setCases(Array.isArray(data) ? data : []);
    } catch (e) {
      setCases([]);
      setErrorOut({
        error: e?.message ?? "Request failed",
        status: e?.status,
        data: e?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>API Test</Text>

      <Button
        title={loading ? "Loading..." : "GET /health"}
        onPress={runHealth}
        disabled={loading}
      />
      <Button
        title={loading ? "Loading..." : "GET /cases"}
        onPress={runCases}
        disabled={loading}
      />

      {/* OUTPUT BOX */}
      <View style={{ padding: 12, borderWidth: 1, borderRadius: 8, gap: 8 }}>
        {/* Cases (clickable levels) */}
        {levels.length > 0 && (
          <View style={{ gap: 8 }}>
            {levels.map((lvl) => (
              <Pressable
                key={lvl.caseId}
                onPress={() =>
                  router.push({
                    pathname: "/level1", // simplest for now
                    params: { caseId: lvl.caseId },
                  })
                }
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderRadius: 8,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: 16 }}>{lvl.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Health output (only shown if you ran /health) */}
        {healthOut != null && (
          <Text selectable style={{ fontFamily: "Menlo" }}>
            {typeof healthOut === "string"
              ? healthOut
              : JSON.stringify(healthOut, null, 2)}
          </Text>
        )}

        {/* Error output */}
        {errorOut != null && (
          <Text selectable style={{ fontFamily: "Menlo" }}>
            {JSON.stringify(errorOut, null, 2)}
          </Text>
        )}

        {/* Empty state */}
        {levels.length === 0 && healthOut == null && errorOut == null && (
          <Text>Tap a button above.</Text>
        )}
      </View>

      <Text style={{ opacity: 0.6 }}>
        Base URL: {process.env.EXPO_PUBLIC_API_BASE_URL}
      </Text>
    </ScrollView>
  );
}