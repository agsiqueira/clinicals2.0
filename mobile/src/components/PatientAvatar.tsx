import { Image, StyleSheet, Text, View } from "react-native";
import { getPatientAvatarSource, getPatientInitials } from "../utils/patientAssets";

type PatientAvatarProps = {
  patientName?: string | null;
  patientSessionSlug?: string | null;
  caseId?: string | null;
  size?: number;
  status?: "locked" | "available" | "completed" | string;
  tier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  showRing?: boolean;
  fallbackInitials?: string;
};

function ringStyleFor({ status, tier }: Pick<PatientAvatarProps, "status" | "tier">) {
  if (status === "locked") return styles.ringLocked;
  if (status === "completed") {
    if (tier === "GOLD") return styles.ringGold;
    if (tier === "SILVER") return styles.ringSilver;
    if (tier === "BRONZE") return styles.ringBronze;
    return styles.ringCompleted;
  }
  return styles.ringAvailable;
}

export function PatientAvatar({
  patientName,
  patientSessionSlug,
  caseId,
  size = 52,
  status = "available",
  tier,
  showRing = true,
  fallbackInitials = "PT",
}: PatientAvatarProps) {
  const imageSource = getPatientAvatarSource({ patientSessionSlug, caseId });
  const initials = getPatientInitials(patientName, fallbackInitials);
  const ringWidth = showRing ? (status === "locked" ? 2 : tier === "GOLD" ? 5 : 4) : 0;
  const innerSize = Math.max(0, size - ringWidth * 2);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
        },
        showRing && ringStyleFor({ status, tier }),
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          resizeMode="cover"
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          }}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            status === "locked" && styles.initialsLocked,
            status === "completed" && styles.initialsCompleted,
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf5ff",
    shadowColor: "#4c1d95",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    overflow: "visible",
  },
  ringLocked: {
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    shadowOpacity: 0,
  },
  ringAvailable: {
    borderColor: "#8b5cf6",
    backgroundColor: "#faf5ff",
    shadowColor: "#6d28d9",
    shadowOpacity: 0.14,
  },
  ringCompleted: {
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  ringGold: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    shadowColor: "#d97706",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  ringSilver: {
    borderColor: "#94a3b8",
    backgroundColor: "#f8fafc",
    shadowColor: "#64748b",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ringBronze: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
    shadowColor: "#c2410c",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  initials: {
    color: "#4c1d95",
    fontWeight: "900",
    fontSize: 14,
  },
  initialsLocked: {
    color: "#6b7280",
  },
  initialsCompleted: {
    color: "#065f46",
  },
});
