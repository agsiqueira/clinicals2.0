import { StyleSheet } from "react-native";

export const casesStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  casesTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  casesSubText: {
    color: "#6b7280",
  },
  legacyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  loadingBlock: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineErrorBox: {
    gap: 10,
    marginBottom: 16,
  },

  // Roadmap
  roadmapPath: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 14,
    marginBottom: 18,
  },
  pathHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  pathTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  pathPreceptor: {
    color: "#6d28d9",
    fontWeight: "700",
    fontSize: 13,
  },
  pathDescription: {
    marginTop: 6,
    color: "#6b7280",
    lineHeight: 19,
  },
  unitBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: "#f3f4f6",
    paddingTop: 14,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6d28d9",
    textTransform: "uppercase",
  },
  unitTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  unitObjective: {
    marginTop: 4,
    color: "#6b7280",
    lineHeight: 19,
  },
  sessionNodeList: {
    marginTop: 14,
    gap: 10,
  },
  roadmapNode: {
    minHeight: 84,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  roadmapNodePressed: {
    opacity: 0.82,
  },
  roadmapNodeLocked: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
  },
  roadmapNodeAvailable: {
    backgroundColor: "#faf5ff",
    borderColor: "#8b5cf6",
  },
  roadmapNodeCompleted: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  roadmapNodeGold: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  roadmapNodeSilver: {
    backgroundColor: "#f8fafc",
    borderColor: "#94a3b8",
  },
  roadmapNodeBronze: {
    backgroundColor: "#fff7ed",
    borderColor: "#f97316",
  },
  nodeMain: {
    flex: 1,
  },
  roadmapNodeTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  roadmapNodeTextLocked: {
    color: "#6b7280",
  },
  roadmapNodeTextAvailable: {
    color: "#4c1d95",
  },
  roadmapNodeTextCompleted: {
    color: "#111827",
  },
  roadmapNodeObjective: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
  },
  nodeMeta: {
    alignItems: "flex-end",
    minWidth: 76,
  },
  nodeStatusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  nodeScoreText: {
    marginTop: 4,
    color: "#6b7280",
    fontWeight: "700",
  },
  legacyList: {
    gap: 12,
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

  // Session overview modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    padding: 18,
  },
  sessionModal: {
    maxHeight: "88%",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  modalLoading: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  modalObjective: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4c1d95",
    lineHeight: 21,
  },
  modalDescription: {
    color: "#4b5563",
    lineHeight: 20,
  },
  modalSection: {
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  achievementRow: {
    borderWidth: 1,
    borderColor: "#ede9fe",
    backgroundColor: "#faf5ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  achievementTitle: {
    flex: 1,
    fontWeight: "700",
    color: "#111827",
  },
  achievementWeight: {
    color: "#6d28d9",
    fontWeight: "800",
  },
  thresholdGrid: {
    flexDirection: "row",
    gap: 8,
  },
  thresholdCellGold: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    padding: 10,
  },
  thresholdCellSilver: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#94a3b8",
    backgroundColor: "#f8fafc",
    padding: 10,
  },
  thresholdCellBronze: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
    padding: 10,
  },
  thresholdLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  thresholdValue: {
    marginTop: 4,
    color: "#4b5563",
    fontWeight: "700",
  },
  estimatedTimeText: {
    color: "#4b5563",
    fontWeight: "700",
  },
  briefingBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
    padding: 12,
    gap: 6,
  },
  briefingLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3730a3",
    textTransform: "uppercase",
  },
  briefingText: {
    color: "#1f2937",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSecondaryButtonText: {
    fontWeight: "800",
    color: "#374151",
  },
  modalPrimaryButton: {
    backgroundColor: "#6d28d9",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  modalPrimaryButtonText: {
    fontWeight: "800",
    color: "#ffffff",
  },
});
