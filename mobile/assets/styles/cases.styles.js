import { StyleSheet } from "react-native";

export const casesStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },

  // Header bar (name + sign out row)
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerEmail: {
    color: "#4b5563",
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutButtonText: {
    fontWeight: "600",
  },

  // Points card
  pointsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pointsCard: {
    alignSelf: "center",
    minWidth: 180,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#faf5ff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6d28d9",
    letterSpacing: 0.3,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4c1d95",
    marginTop: 4,
  },
  pointsSubText: {
    color: "#6b7280",
    marginTop: 2,
  },
  pointsRetryNote: {
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
    fontSize: 12,
  },

  // Section heading
  casesTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  casesSubText: {
    color: "#6b7280",
  },

  // Error state
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontWeight: "600",
  },

  // Case card
  caseCard: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  caseCardPressable: {
    padding: 14,
    backgroundColor: "#faf5ff",
  },
  caseCardPressablePressed: {
    backgroundColor: "#f3e8ff",
  },
  caseCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  caseCardHeaderText: {
    flex: 1,
  },
  caseCardLevelLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6d28d9",
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  caseCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  caseCardHintText: {
    color: "#6b7280",
    marginTop: 4,
    fontSize: 13,
  },
  caseCardLaunchPill: {
    borderRadius: 999,
    backgroundColor: "#6d28d9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 74,
    alignItems: "center",
  },
  caseCardLaunchPillText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  attemptsRow: {
    borderTopWidth: 1,
    borderColor: "#ede9fe",
    backgroundColor: "#fcfcff",
  },
  attemptsButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attemptsButtonText: {
    fontWeight: "600",
    color: "#6b7280",
    fontSize: 14,
  },

  // Empty state
  emptyText: {
    color: "#6b7280",
  },
});
