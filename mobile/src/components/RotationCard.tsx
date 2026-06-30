import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { casesStyles } from "../../assets/styles/cases.styles";
import { sessionDisplayParts, unitDisplayTitle } from "../utils/clinicalDisplay";
import { PatientAvatar } from "./PatientAvatar";

export type RotationSession = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  status: "locked" | "available" | "completed" | string;
  badgeTier?: "GOLD" | "SILVER" | "BRONZE" | "NONE" | string | null;
  bestSessionScore?: number | null;
  latestSessionScore?: number | null;
  badgeThresholds?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  achievements?: unknown[];
  requiresHpi?: boolean;
  workflow?: {
    requiresHpi?: boolean;
  };
};

export type RotationUnit = {
  id: string;
  slug: string;
  title: string;
  objective?: string | null;
  sortOrder?: number | null;
  sessions: RotationSession[];
};

type RotationCardProps = {
  unit: RotationUnit;
  unitIndex: number;
  isLastRotation?: boolean;
  onSessionPress: (session: RotationSession) => void;
  showRail?: boolean;
  animatingMilestoneIds?: Set<string>;
  milestoneTrophyScale?: Animated.Value;
  forceRetrySessionIds?: Set<string>;
};

function rotationTitle(unit: RotationUnit) {
  return unitDisplayTitle(unit).replace(/^Unit\s+\d+\s*:\s*/i, "");
}

function rotationTheme(unit: RotationUnit) {
  const order = Number(unit.sortOrder || 1);
  const title = unitDisplayTitle(unit);

  if (order === 3 || /assessment|hpi|summary/i.test(title)) {
    return {
      icon: "🩺",
      description: "Practice organizing clinical evidence and summarizing the patient's story.",
      style: casesStyles.rotationCardAssessment,
      iconStyle: casesStyles.rotationIconAssessment,
      backdropStyle: casesStyles.rotationBackdropAssessment,
      lineStyle: casesStyles.rotationRoomLineAssessment,
    };
  }

  if (order === 2 || /seasonal|allerg|hall/i.test(title)) {
    return {
      icon: "🌸",
      description: "Practice focused history-taking for common outpatient symptoms.",
      style: casesStyles.rotationCardSpring,
      iconStyle: casesStyles.rotationIconSpring,
      backdropStyle: casesStyles.rotationBackdropSpring,
      lineStyle: casesStyles.rotationRoomLineSpring,
    };
  }

  return {
    icon: "🏥",
    description:
      "Practice professional introductions, rapport, and identifying the patient's main concern.",
    style: casesStyles.rotationCardClinic,
    iconStyle: casesStyles.rotationIconClinic,
    backdropStyle: casesStyles.rotationBackdropClinic,
    lineStyle: casesStyles.rotationRoomLineClinic,
  };
}

function encounterStatusLabel(session: RotationSession) {
  if (session.status === "locked") return "Locked";
  if (session.status !== "completed") return "Available";
  return null;
}

export function rotationComplete(unit: RotationUnit) {
  return unit.sessions.every(
    (session) => session.status === "completed" && Number(session.bestSessionScore ?? -1) >= 84
  );
}

function milestoneProgress(unit: RotationUnit) {
  const total = Math.max(unit.sessions.length, 1);
  const completed = unit.sessions.filter(
    (session) => session.status === "completed" && Number(session.bestSessionScore ?? -1) >= 84
  ).length;

  return {
    completed,
    total,
    percent: Math.min(100, Math.round((completed / total) * 100)),
  };
}

function sessionScoreLabel(session: RotationSession) {
  const rawScore = session.bestSessionScore ?? session.latestSessionScore;
  if (rawScore == null) return null;

  const numericScore = Number(rawScore);
  if (!Number.isFinite(numericScore)) return null;

  return `${Math.round(numericScore)}%`;
}

export function RotationCard({
  unit,
  unitIndex,
  isLastRotation = false,
  onSessionPress,
  showRail = true,
  animatingMilestoneIds,
  milestoneTrophyScale,
  forceRetrySessionIds,
}: RotationCardProps) {
  const internalTrophyScale = useRef(new Animated.Value(1)).current;
  const theme = rotationTheme(unit);
  const isRotationComplete = rotationComplete(unit);
  const hasOpenSession = unit.sessions.some((session) => session.status !== "locked");
  const rotationMarker = hasOpenSession ? "✓" : "🔒";
  const milestone = milestoneProgress(unit);
  const milestoneStatusLabel = isRotationComplete ? "Achieved" : hasOpenSession ? "In Progress" : "Locked";
  const trophyScale = milestoneTrophyScale || internalTrophyScale;

  useEffect(() => {
    if (milestoneTrophyScale || !isRotationComplete) return;

    trophyScale.setValue(1);
    Animated.sequence([
      Animated.timing(trophyScale, {
        toValue: 1.1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(trophyScale, {
        toValue: 0.98,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(trophyScale, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRotationComplete, milestoneTrophyScale, trophyScale]);

  return (
    <View style={showRail ? casesStyles.rotationTimelineItem : undefined}>
      {showRail ? (
        <View style={casesStyles.rotationRailColumn}>
          <View
            style={[
              casesStyles.rotationRailMarker,
              isRotationComplete
                ? casesStyles.rotationRailMarkerComplete
                : hasOpenSession
                  ? casesStyles.rotationRailMarkerOpen
                  : casesStyles.rotationRailMarkerLocked,
            ]}
          >
            <Text
              style={[
                casesStyles.rotationRailMarkerText,
                !hasOpenSession && !isRotationComplete && casesStyles.rotationRailMarkerTextLocked,
              ]}
            >
              {rotationMarker}
            </Text>
          </View>
          <View
            style={[
              casesStyles.rotationRailLine,
              unitIndex === 0 && casesStyles.rotationRailLineFirst,
              isLastRotation && casesStyles.rotationRailLineLast,
            ]}
          />
        </View>
      ) : null}

      <View style={showRail ? casesStyles.rotationTimelineContent : undefined}>
        <View style={[casesStyles.rotationCard, theme.style]}>
          <View style={[casesStyles.rotationBackdropAccent, theme.backdropStyle]}>
            <Text style={casesStyles.rotationBackdropIcon}>{theme.icon}</Text>
          </View>
          <View style={[casesStyles.rotationBackdropBubble, theme.backdropStyle]} />
          <View style={[casesStyles.rotationRoomLineWide, theme.lineStyle]} />
          <View style={[casesStyles.rotationRoomLineShort, theme.lineStyle]} />

          <View style={casesStyles.rotationHeader}>
            <View style={[casesStyles.rotationIcon, theme.iconStyle]}>
              <Text style={casesStyles.rotationIconText}>{theme.icon}</Text>
            </View>
            <View style={casesStyles.rotationHeaderText}>
              <Text style={casesStyles.rotationEyebrow}>
                Rotation {Number(unit.sortOrder || unitIndex + 1)}
              </Text>
              <Text style={casesStyles.rotationTitle}>{rotationTitle(unit)}</Text>
              <Text style={casesStyles.rotationDescription}>
                {unit.objective || theme.description}
              </Text>
            </View>
          </View>

          <View style={casesStyles.patientRoster}>
            <Text style={casesStyles.patientRosterLabel}>Patient roster</Text>
            {unit.sessions.map((session, index) => {
              const display = sessionDisplayParts(session);
              const isLocked = session.status === "locked";
              const isCompleted = session.status === "completed";
              const nextSessionLocked = unit.sessions[index + 1]?.status === "locked";
              const shouldRetry =
                Boolean(forceRetrySessionIds?.has(session.id)) ||
                (isCompleted &&
                  nextSessionLocked &&
                  (Number(session.bestSessionScore ?? 0) < 84 ||
                    session.badgeTier === "BRONZE" ||
                    session.badgeTier === "SILVER"));
              const chipLabel = shouldRetry ? "Retry" : encounterStatusLabel(session);
              const scoreLabel = isLocked ? null : sessionScoreLabel(session);
              const medalIcon =
                !!session.badgeTier && session.badgeTier !== "NONE"
                  ? session.badgeTier === "GOLD"
                    ? "🥇"
                    : session.badgeTier === "SILVER"
                      ? "🥈"
                      : "🥉"
                  : isLocked
                    ? "🔒"
                    : "●";

              return (
                <Pressable
                  key={session.id}
                  onPress={() => onSessionPress(session)}
                  disabled={isLocked}
                  style={({ pressed }) => [
                    casesStyles.patientRosterRow,
                    isLocked && casesStyles.patientRosterRowLocked,
                    pressed && !isLocked && casesStyles.patientRosterRowPressed,
                  ]}
                >
                  <PatientAvatar
                    patientName={display.patientName}
                    patientSessionSlug={session.slug}
                    size={48}
                    status={session.status}
                    tier={session.badgeTier}
                  />
                  <View style={casesStyles.patientRosterText}>
                    <Text
                      style={[
                        casesStyles.patientRosterName,
                        isLocked && casesStyles.patientRosterTextLocked,
                      ]}
                    >
                      {display.patientName}
                    </Text>
                    <Text
                      style={[
                        casesStyles.patientRosterEncounter,
                        isLocked && casesStyles.patientRosterTextLocked,
                      ]}
                    >
                      {display.taskTitle}
                    </Text>
                  </View>
                  <View style={casesStyles.patientRosterMeta}>
                    <View style={casesStyles.patientRosterScoreRow}>
                      <Text style={casesStyles.patientRosterBadge}>{medalIcon}</Text>
                      {scoreLabel ? (
                        <Text style={casesStyles.patientRosterScore}>{scoreLabel}</Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        casesStyles.patientRosterPill,
                        isLocked
                          ? casesStyles.patientRosterPillLocked
                          : shouldRetry
                            ? casesStyles.patientRosterPillRetry
                            : isCompleted
                              ? casesStyles.patientRosterPillComplete
                              : casesStyles.patientRosterPillStart,
                      ]}
                    >
                      {chipLabel || (isCompleted ? "Continue" : "Start")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <View
              style={[
                casesStyles.patientRosterRow,
                casesStyles.milestoneRosterRow,
                isRotationComplete
                  ? casesStyles.rotationMilestoneComplete
                  : casesStyles.rotationMilestoneUpcoming,
              ]}
            >
              <View style={casesStyles.milestoneRosterContent}>
                <Animated.View
                  style={[
                    casesStyles.milestoneRosterIcon,
                    isRotationComplete
                      ? casesStyles.milestoneRosterIconComplete
                      : casesStyles.milestoneRosterIconInactive,
                    animatingMilestoneIds?.has(unit.id) && {
                      transform: [{ scale: trophyScale }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      casesStyles.milestoneRosterIconText,
                      !isRotationComplete && casesStyles.milestoneRosterIconTextInactive,
                    ]}
                  >
                    🏆
                  </Text>
                </Animated.View>
                <View style={casesStyles.milestoneRosterText}>
                  <Text
                    style={[
                      casesStyles.rotationMilestoneTitle,
                      !isRotationComplete && casesStyles.rotationMilestoneTextMuted,
                    ]}
                  >
                    Clinical Milestone
                  </Text>
                  <Text
                    style={[
                      casesStyles.rotationMilestoneBody,
                      !isRotationComplete && casesStyles.rotationMilestoneTextMuted,
                    ]}
                  >
                    Complete each encounter with 84% or higher to reach this checkpoint.
                  </Text>
                  <Text
                    style={[
                      casesStyles.rotationMilestoneProgressText,
                      !isRotationComplete && casesStyles.rotationMilestoneTextMuted,
                    ]}
                  >
                    {milestone.completed}/{milestone.total} encounters at 84%+
                  </Text>
                </View>
                <Text
                  style={[
                    casesStyles.rotationMilestonePill,
                    isRotationComplete
                      ? casesStyles.rotationMilestonePillComplete
                      : hasOpenSession
                        ? casesStyles.rotationMilestonePillProgress
                        : casesStyles.rotationMilestonePillLocked,
                  ]}
                >
                  {milestoneStatusLabel}
                </Text>
              </View>
              <View style={casesStyles.rotationMilestoneProgressTrack}>
                <View
                  style={[
                    casesStyles.rotationMilestoneProgressFill,
                    isRotationComplete && casesStyles.rotationMilestoneProgressFillComplete,
                    { width: `${milestone.percent}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
