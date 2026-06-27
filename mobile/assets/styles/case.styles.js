import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const caseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
    alignItems: "stretch",
    marginBottom: 2,
    flexShrink: 0,
  },

  avatarWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: 820,
    aspectRatio: 16 / 9,
    alignSelf: "center",
    borderRadius: 22,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#ddd6fe",

    // iOS shadow
    shadowColor: "#6d28d9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,

    // Android 
    elevation: 6,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  avatarVideo: {
    width: "100%",
    height: "100%",
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  subText: {
    color: "#4b5563",
    lineHeight: 19,
    fontWeight: "600",
  },

  patientMetaCard: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 4,
  },

  patientMetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  patientMetaEyebrow: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  patientMetaValue: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "800",
  },

  patientConcernValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  voiceToggleButton: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#faf5ff",
  },

  voiceToggleText: {
    fontWeight: "800",
    color: "#6d28d9",
    fontSize: 12,
  },

  chatContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    flexGrow: 1,
  },

  encounterBody: {
    flex: 1,
    minHeight: 0,
  },

  chatList: {
    flex: 1,
    minHeight: 0,
  },

  encounterFooter: {
    flexShrink: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },

  encounterFooterCompact: {
    paddingBottom: 14,
  },

  encounterFooterDesktop: {
    paddingBottom: 76,
  },

  messageBubble: {
    maxWidth: "85%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },

  messageBubblePatient: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
  },

  messageBubbleUser: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
  },

  // Results screen
  resultsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },

  resultsCardSecondary: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },

  resultsSectionHeading: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },

  resultsSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  resultsSummaryItem: {
    minWidth: "45%",
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#ffffff",
  },

  resultsSummaryLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  resultsSummaryValue: {
    color: "#111827",
    fontWeight: "800",
    marginTop: 4,
  },

  resultsAchievementRow: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#faf5ff",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  resultsAchievementMain: {
    flex: 1,
    gap: 4,
  },

  resultsAchievementTitle: {
    color: "#111827",
    fontWeight: "800",
  },

  resultsAchievementFeedback: {
    color: "#6b7280",
    lineHeight: 18,
  },

  resultsAchievementScore: {
    color: "#6d28d9",
    fontWeight: "800",
  },

  resultsReportText: {
    color: "#1f2937",
    lineHeight: 20,
  },

  resultsDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  resultsDetailHeaderText: {
    flex: 1,
    gap: 4,
  },

  resultsMutedText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
  },

  resultsToggleButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },

  resultsToggleButtonText: {
    color: "#374151",
    fontWeight: "800",
  },

  resultsDetailContent: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    gap: 10,
  },

  resultsScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },

  resultsScoreText: {
    fontSize: 28,
    fontWeight: "800",
  },

  resultsPassText: {
    fontWeight: "700",
  },

  resultsPointsText: {
    color: "#6b7280",
  },

  resultsCriticalBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },

  resultsCriticalTitle: {
    fontWeight: "700",
    color: "#b91c1c",
  },

  resultsCriticalItem: {
    color: "#b91c1c",
  },

  resultsRedFlagBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },

  resultsRedFlagTitle: {
    fontWeight: "700",
    color: "#92400e",
  },

  resultsRedFlagItem: {
    color: "#92400e",
  },

  resultsMissedBox: {
    gap: 4,
  },

  resultsMissedTitle: {
    fontWeight: "700",
    color: "#374151",
  },

  resultsMissedItem: {
    color: "#6b7280",
  },

  resultsSectionDivider: {
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    paddingTop: 10,
    gap: 6,
  },

  resultsSectionTitle: {
    fontWeight: "700",
    color: "#374151",
  },

  resultsSectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  resultsSectionLabel: {
    color: "#374151",
  },

  resultsSectionPoints: {
    color: "#6b7280",
  },

  // Criterion card
  criterionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  criterionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  criterionLabel: {
    flex: 1,
    fontWeight: "700",
  },

  criterionMeta: {
    color: "#6b7280",
    marginTop: 2,
  },

  criterionRationale: {
    marginTop: 6,
    color: "#374151",
  },

  criterionEvidence: {
    marginTop: 6,
    color: "#374151",
  },

  criterionOmitReason: {
    marginTop: 6,
    color: "#6b7280",
  },

  // HPI stage
  hpiCard: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#faf5ff",
  },

  hpiTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  hpiSubText: {
    color: "#4b5563",
    marginBottom: 8,
  },

  hpiInput: {
    borderWidth: 1,
    borderColor: "#ede9fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
    backgroundColor: "#ffffff",
    color: "#111827",
  },

  hpiButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  // Shared button
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#6d28d9",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#6d28d9",
  },

  outlineButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
  },

  // Resume prompt overlay
  resumeOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 99,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  resumeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
  },

  resumeTitle: {
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 8,
  },

  resumeSubText: {
    color: "#555",
    marginBottom: 20,
  },

  resumePrimaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },

  resumePrimaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  resumeSecondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },

  resumeSecondaryButtonText: {
    fontWeight: "600",
  },

  // Error / loading states
  loadErrorTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },

  // Results flat list
  resultsFlatListContent: {
    paddingHorizontal: 12,
    paddingBottom: 96,
  },

  resultsHeaderContainer: {
    gap: 10,
    marginBottom: 12,
  },

  resultsActionsContainer: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },

  resultsRetryNote: {
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  criterionStatusText: {
    fontWeight: "700",
  },

  // Chat messages
  messageSenderLabel: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  // Empty chat hint
  chatHintContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#faf5ff",
    padding: 12,
  },

  chatHintText: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // Done interview button wrapper
  doneButtonContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },

  // HPI stage wrapper
  hpiStageContainer: {
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: "#ffffff",
    flexShrink: 0,
  },

  hpiStageContainerCompact: {
    paddingBottom: 14,
  },

  hpiStageContainerDesktop: {
    paddingBottom: 76,
  },

  // Layout
  keyboardView: {
    flex: 1,
    minHeight: 0,
  },

  gradingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 99,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  gradingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    width: "100%",
    alignItems: "center",
    gap: 12,
  },

  gradingTitle: {
    fontWeight: "700",
    fontSize: 17,
  },

  gradingSubText: {
    color: "#6b7280",
    textAlign: "center",
  },

  debriefOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.55)",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
  },

  debriefPreceptorOverlay: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    position: "relative",
    overflow: "visible",
  },

  debriefPreceptorHeroLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    elevation: 3,
    alignItems: "center",
  },

  debriefPreceptorHeroLayerCompact: {
    top: 8,
  },

  debriefCard: {
    marginTop: 132,
    maxHeight: "68%",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },

  debriefCardCompact: {
    marginTop: 116,
    maxHeight: "70%",
  },

  achievementUnlockCard: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 10,
    alignItems: "center",
  },

  achievementUnlockIcon: {
    fontSize: 42,
  },

  achievementUnlockEyebrow: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  achievementUnlockTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  achievementUnlockSubText: {
    color: "#6b7280",
    fontWeight: "800",
    marginBottom: 4,
  },

  debriefScrollContent: {
    padding: 16,
    gap: 14,
  },

  debriefFixedHeader: {
    paddingHorizontal: 16,
    paddingTop: 92,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  debriefIdentityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  debriefFixedFooter: {
    flexShrink: 0,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 10,
  },

  debriefHeaderText: {
    flex: 1,
  },

  debriefName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  debriefSpecialty: {
    marginTop: 2,
    color: "#6b7280",
    fontWeight: "600",
  },

  debriefScoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  debriefMentorLabel: {
    color: "#6d28d9",
    fontSize: 11,
    fontWeight: "800",
  },

  debriefChatBox: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    padding: 12,
    gap: 10,
    backgroundColor: "#ffffff",
  },

  debriefContextLabel: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  debriefVoiceControls: {
    alignItems: "flex-end",
  },

  debriefVoiceToggle: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#faf5ff",
  },

  debriefVoiceToggleText: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "800",
  },

  debriefQuickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  debriefQuickActionButton: {
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#faf5ff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  debriefQuickActionText: {
    color: "#5b21b6",
    fontSize: 12,
    fontWeight: "800",
  },

  debriefChatMessages: {
    gap: 8,
  },

  debriefChatBubble: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },

  debriefChatBubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#faf5ff",
  },

  debriefChatBubbleAssistant: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eef2ff",
  },

  debriefChatHint: {
    color: "#6b7280",
    fontSize: 13,
  },

  debriefChatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  debriefChatInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },

  debriefChatSendButton: {
    minHeight: 42,
    minWidth: 58,
    borderRadius: 8,
    backgroundColor: "#6d28d9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  debriefChatSendText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  debriefReportDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  debriefReportLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  debriefReportHeading: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  debriefReportPanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    padding: 12,
    gap: 12,
  },

  debriefMetricBox: {
    flex: 1,
    minWidth: 180,
    minHeight: 126,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },

  debriefMetricLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  debriefMetricValue: {
    marginTop: 4,
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },

  debriefSection: {
    gap: 6,
  },

  debriefSectionTitle: {
    color: "#374151",
    fontWeight: "800",
  },

  debriefText: {
    color: "#1f2937",
    lineHeight: 20,
  },

  debriefCoachingList: {
    gap: 4,
  },

  debriefCoachingPoint: {
    color: "#4b5563",
    fontWeight: "700",
    lineHeight: 18,
  },

  debriefAchievementRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  debriefAchievementMain: {
    flex: 1,
    gap: 4,
  },

  debriefAchievementTitle: {
    color: "#111827",
    fontWeight: "800",
  },

  debriefAchievementFeedback: {
    color: "#6b7280",
    lineHeight: 18,
  },

  debriefAchievementScore: {
    color: "#6d28d9",
    fontWeight: "800",
  },

  debriefActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  badgeVisualCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 92,
  },

  badgeVisualGold: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },

  badgeVisualSilver: {
    borderColor: "#94a3b8",
    backgroundColor: "#f8fafc",
  },

  badgeVisualBronze: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },

  badgeVisualNone: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },

  badgeVisualMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  badgeVisualMarkText: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900",
  },

  badgeVisualText: {
    alignItems: "center",
    gap: 2,
  },

  badgeVisualLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  badgeVisualCopy: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },

  resultsBadgeInline: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  resultsBadgeInlineText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },

  resultsReviewBlock: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 5,
  },

  debriefSecondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  debriefSecondaryButtonText: {
    color: "#374151",
    fontWeight: "800",
  },

  debriefPrimaryButton: {
    backgroundColor: "#6d28d9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  debriefPrimaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
