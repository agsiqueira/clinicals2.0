import { Text, View } from "react-native";
import { portfolioStyles } from "../../assets/styles/portfolio.styles";

type TimelineEventProps = {
  icon?: string | null;
  title: string;
  detail?: string | null;
  date?: string | null;
};

export function TimelineEvent({ icon, title, detail, date }: TimelineEventProps) {
  return (
    <View style={portfolioStyles.timelineEvent}>
      <View style={portfolioStyles.timelineMarker}>
        <Text style={portfolioStyles.timelineIcon}>{icon || "•"}</Text>
      </View>
      <View style={portfolioStyles.timelineBody}>
        <View style={portfolioStyles.timelineHeader}>
          <Text style={portfolioStyles.timelineTitle}>{title}</Text>
          {!!date && <Text style={portfolioStyles.dateText}>{date}</Text>}
        </View>
        {!!detail && <Text style={portfolioStyles.cardSubText}>{detail}</Text>}
      </View>
    </View>
  );
}
