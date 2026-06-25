import { Text, View } from "react-native";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";

type CompactJourneyCardProps = {
  levelTitle?: string | null;
  professionalLevel?: number | null;
  xp?: number | null;
  streakCount?: number | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CompactJourneyCard({
  levelTitle,
  professionalLevel,
  xp,
  streakCount,
}: CompactJourneyCardProps) {
  return (
    <View style={portfolioStyles.compactJourneyCard}>
      <Text style={portfolioStyles.compactJourneyText}>
        {levelTitle || "Student Clinician"} · Level {toNumber(professionalLevel, 1)} ·{" "}
        {toNumber(xp, 0)} XP · 🔥 {toNumber(streakCount, 0)}-day streak
      </Text>
    </View>
  );
}
