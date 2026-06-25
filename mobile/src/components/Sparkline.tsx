import { Text, View } from "react-native";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";

type SparklineProps = {
  best?: number | null;
  latest?: number | null;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "0%";
  return `${Math.round(Number(value))}%`;
}

function ChartBar({ label, value }: { label: string; value?: number | null }) {
  const percent = clampPercent(toNumber(value, 0));

  return (
    <View style={portfolioStyles.compactChartRow}>
      <Text style={portfolioStyles.compactChartLabel}>{label}</Text>
      <View style={portfolioStyles.compactChartTrack}>
        <View style={[portfolioStyles.compactChartFill, { width: `${percent}%` }]} />
      </View>
      <Text style={portfolioStyles.compactChartValue}>{formatPercent(value)}</Text>
    </View>
  );
}

export function Sparkline({ best, latest }: SparklineProps) {
  const bestValue = toNumber(best, 0);
  const latestValue = toNumber(latest, 0);

  if (bestValue <= 0 && latestValue <= 0) {
    return (
      <Text style={portfolioStyles.sparklinePlaceholder}>
        Complete more encounters to begin tracking this competency.
      </Text>
    );
  }

  return (
    <View style={portfolioStyles.compactChart}>
      <ChartBar label="Best" value={best} />
      <ChartBar label="Latest" value={latest} />
    </View>
  );
}
