import { Pressable, Text, View } from "react-native";
import { casesStyles } from "../../assets/styles/cases.styles";
import { sessionDisplayTitle } from "../utils/clinicalDisplay";

type SessionCardSession = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  objective?: string | null;
  status?: "locked" | "available" | "completed" | string;
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  bestSessionScore?: number | null;
};

function badgeLabel(session: SessionCardSession) {
  if (session.status !== "completed") return null;
  if (!session.badgeTier || session.badgeTier === "NONE") return "Completed";
  if (session.badgeTier === "GOLD") return "🥇 Gold";
  if (session.badgeTier === "SILVER") return "🥈 Silver";
  if (session.badgeTier === "BRONZE") return "🥉 Bronze";
  return session.badgeTier.charAt(0) + session.badgeTier.slice(1).toLowerCase();
}

function nodeStyleFor(session: SessionCardSession) {
  if (session.status === "locked") return casesStyles.roadmapNodeLocked;
  if (session.status === "completed") {
    if (session.badgeTier === "GOLD") return casesStyles.roadmapNodeGold;
    if (session.badgeTier === "SILVER") return casesStyles.roadmapNodeSilver;
    if (session.badgeTier === "BRONZE") return casesStyles.roadmapNodeBronze;
    return casesStyles.roadmapNodeCompleted;
  }
  return casesStyles.roadmapNodeAvailable;
}

function nodeTextStyleFor(session: SessionCardSession) {
  if (session.status === "locked") return casesStyles.roadmapNodeTextLocked;
  if (session.status === "completed") return casesStyles.roadmapNodeTextCompleted;
  return casesStyles.roadmapNodeTextAvailable;
}

export function sessionStatusLabel(session: SessionCardSession) {
  return badgeLabel(session) || (session.status === "locked" ? "Locked" : "Available");
}

export function SessionCard({
  session,
  description,
  metaValue,
  statusLabel,
  disabled,
  onPress,
}: {
  session: SessionCardSession;
  description?: string | null;
  metaValue?: string | number | null;
  statusLabel?: string | null;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const isDisabled = disabled ?? session.status === "locked";
  const displayDescription = description ?? session.objective;
  const displayStatus = statusLabel || sessionStatusLabel(session);
  const displayMeta = metaValue ?? session.bestSessionScore;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        casesStyles.roadmapNode,
        nodeStyleFor(session),
        pressed && !isDisabled && casesStyles.roadmapNodePressed,
      ]}
    >
      <View style={casesStyles.nodeMain}>
        <Text style={[casesStyles.roadmapNodeTitle, nodeTextStyleFor(session)]}>
          {sessionDisplayTitle(session)}
        </Text>
        {!!displayDescription && (
          <Text style={casesStyles.roadmapNodeObjective} numberOfLines={2}>
            {displayDescription}
          </Text>
        )}
      </View>
      <View style={casesStyles.nodeMeta}>
        <Text style={[casesStyles.nodeStatusText, nodeTextStyleFor(session)]}>
          {displayStatus}
        </Text>
        {displayMeta != null && <Text style={casesStyles.nodeScoreText}>{displayMeta}</Text>}
      </View>
    </Pressable>
  );
}
