import { StyleSheet } from "react-native";

export const attemptResultStyles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header bar
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#1d4ed8",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Error state
  errorContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
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

  // Transcript footer
  transcriptFooter: {
    marginTop: 12,
    marginBottom: 20,
  },
  transcriptToggleButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  transcriptToggleText: {
    fontWeight: "700",
    color: "#374151",
  },
  transcriptList: {
    gap: 10,
  },
  transcriptEmptyText: {
    color: "#6b7280",
  },
  messageBubble: {
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fbfcfd",
  },
  messageSender: {
    fontWeight: "700",
    marginBottom: 4,
  },
});