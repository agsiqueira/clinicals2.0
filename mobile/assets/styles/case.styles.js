import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const caseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    padding: 16,
    gap: 5,
    alignItems: "center",
    marginBottom: 5,
  },

  avatarWrapper: {
    position: "relative",
    borderRadius: 60,
    backgroundColor: "#fff",

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    // Android 
    elevation: 6,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarClip: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarVideo: {
    width: "100%",
    height: "100%",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  subText: {
    opacity: 0.7,
    textAlign: "center",
  },

  voiceControlsRow: {
    width: "100%",
    marginTop: 8,
    alignItems: "center",
    gap: 6,
  },

  voiceToggleButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
  },

  voiceToggleText: {
    fontWeight: "700",
    color: "#1f2937",
  },

  voiceStateText: {
    color: "#6b7280",
    fontSize: 12,
  },

  chatContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  messageBubble: {
    maxWidth: "85%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fbfcfd",
  },

  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
  },

  // Results screen
  resultsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 12,
  },

  hpiTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  hpiSubText: {
    color: "#4b5563",
    marginBottom: 8,
  },

  hpiInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 120,
  },

  hpiButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  // Shared button
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  outlineButtonText: {
    fontWeight: "700",
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
    paddingBottom: 20,
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
    fontWeight: "700",
    marginBottom: 4,
  },

  // Empty chat hint
  chatHintContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },

  chatHintText: {
    color: "#555",
  },

  // Done interview button wrapper
  doneButtonContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // HPI stage wrapper
  hpiStageContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },

  // Layout
  keyboardView: {
    flex: 1,
  },

  // Generic button label
  buttonText: {
    fontWeight: "700",
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
});
