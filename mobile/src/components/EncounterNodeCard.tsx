import { Pressable, Text, View } from "react-native";
import { casesStyles } from "../../assets/styles/cases.styles";
import { PatientAvatar } from "./PatientAvatar";

type EncounterNodeCardProps = {
  patientName: string;
  encounterTitle?: string | null;
  patientSessionSlug?: string | null;
  caseId?: string | null;
  status?: "locked" | "available" | "completed" | string | null;
  tier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  bestScore?: number | null;
  estimatedTimeLabel?: string | null;
  statusLabel?: string | null;
  disabled?: boolean;
  onPress?: () => void;
  variant?: "roadmap" | "today";
};

function badgeOverlay(tier?: string | null) {
  if (tier === "GOLD") return "🥇";
  if (tier === "SILVER") return "🥈";
  if (tier === "BRONZE") return "🥉";
  return null;
}

function roundedScore(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${Math.round(Number(value))}%`;
}

function defaultStatusLabel({
  status,
  tier,
  bestScore,
}: Pick<EncounterNodeCardProps, "status" | "tier" | "bestScore">) {
  const score = roundedScore(bestScore);
  if (status === "locked") return "Locked";
  if (status === "completed") {
    if (tier === "GOLD") return score ? `Gold · ${score}` : "Gold";
    if (tier === "SILVER") return score ? `Silver · ${score}` : "Silver";
    if (tier === "BRONZE") return score ? `Bronze · ${score}` : "Bronze";
    return score ? `Complete · ${score}` : "Complete";
  }
  return "Available";
}

function statusStyle(status?: string | null, label?: string | null) {
  if (/retry/i.test(String(label || ""))) return casesStyles.encounterStatusRetry;
  if (status === "locked") return casesStyles.encounterStatusLocked;
  if (status === "completed") return casesStyles.encounterStatusMastered;
  return casesStyles.encounterStatusAvailable;
}

export function EncounterNodeCard({
  patientName,
  encounterTitle,
  patientSessionSlug,
  caseId,
  status = "available",
  tier,
  bestScore,
  estimatedTimeLabel,
  statusLabel,
  disabled,
  onPress,
  variant = "roadmap",
}: EncounterNodeCardProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isDisabled = disabled ?? isLocked;
  const displayStatus = statusLabel || defaultStatusLabel({ status, tier, bestScore });
  const overlay = badgeOverlay(tier);

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        casesStyles.encounterNodeCard,
        variant === "today" && casesStyles.encounterNodeCardToday,
        isLocked && casesStyles.encounterNodeCardLocked,
        isCompleted && casesStyles.encounterNodeCardCompleted,
        pressed && !isDisabled && casesStyles.roadmapNodePressed,
      ]}
    >
      <View style={casesStyles.patientAvatarWrap}>
        <PatientAvatar
          patientName={patientName}
          patientSessionSlug={patientSessionSlug}
          caseId={caseId}
          size={56}
          status={status || "available"}
          tier={tier}
        />
        {!!overlay && <Text style={casesStyles.patientNodeBadge}>{overlay}</Text>}
      </View>

      <Text style={[casesStyles.encounterPatientName, isLocked && casesStyles.encounterTextLocked]}>
        {patientName}
      </Text>
      {!!encounterTitle && (
        <Text style={[casesStyles.encounterTask, isLocked && casesStyles.encounterTextLocked]}>
          {encounterTitle}
        </Text>
      )}

      {!!displayStatus && (
        <Text style={[casesStyles.encounterStatus, statusStyle(status, displayStatus)]}>
          {displayStatus}
        </Text>
      )}
      {!!estimatedTimeLabel && (
        <Text style={casesStyles.encounterScore}>{estimatedTimeLabel}</Text>
      )}
    </Pressable>
  );
}
