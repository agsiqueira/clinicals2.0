import { Text, View } from "react-native";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";

type JourneyCardProps = {
  levelTitle?: string | null;
  professionalLevel?: number | null;
  xp?: number | null;
  nextLevelXp?: number | null;
  streakCount?: number | null;
  label?: string;
  showProgress?: boolean;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function JourneyCard({
  levelTitle,
  professionalLevel,
  xp,
  nextLevelXp,
  streakCount,
  label = "Your Journey",
  showProgress = true,
}: JourneyCardProps) {
  const level = toNumber(professionalLevel, 1);
  const currentXp = toNumber(xp, 0);
  const nextXp = toNumber(nextLevelXp, level * 100);
  const currentLevelBase = Math.max(0, (level - 1) * 100);
  const progress =
    nextXp > currentLevelBase
      ? clampPercent(((currentXp - currentLevelBase) / (nextXp - currentLevelBase)) * 100)
      : 0;

  return (
    <View style={portfolioStyles.journeyCard}>
      <Text style={portfolioStyles.identityLabel}>{label}</Text>
      <Text style={portfolioStyles.identityTitle}>{levelTitle || "Student Clinician"}</Text>
      <View style={portfolioStyles.compactStatsRow}>
        <Text style={portfolioStyles.compactStatText}>Level {level}</Text>
        <Text style={portfolioStyles.compactStatText}>{currentXp} XP</Text>
        <Text style={portfolioStyles.compactStatText}>🔥 {toNumber(streakCount, 0)} days</Text>
      </View>
      {showProgress ? (
        <>
          <View style={portfolioStyles.progressTrack}>
            <View style={[portfolioStyles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={portfolioStyles.streakText}>Next level at {nextXp} XP</Text>
        </>
      ) : null}
    </View>
  );
}
