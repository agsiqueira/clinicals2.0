import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

type ClinicalsChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend?: () => void;
  onSubmit?: () => void;
  onMicPress: () => void;
  placeholder?: string;
  submitLabel?: string;
  editable?: boolean;
  sendDisabled?: boolean;
  micDisabled?: boolean;
  sending?: boolean;
  transcribing?: boolean;
  isRecording?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ClinicalsChatComposer({
  value,
  onChangeText,
  onSend,
  onSubmit,
  onMicPress,
  placeholder = "Type a message...",
  submitLabel = "Send",
  editable = true,
  sendDisabled = false,
  micDisabled = false,
  sending = false,
  transcribing = false,
  isRecording = false,
  containerStyle,
}: ClinicalsChatComposerProps) {
  const submit = onSubmit || onSend || (() => {});

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        editable={editable}
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Pressable
        onPress={onMicPress}
        disabled={micDisabled}
        style={({ pressed }) => [
          styles.iconButton,
          micDisabled && styles.disabled,
          pressed && !micDisabled && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>{transcribing ? "..." : isRecording ? "⏹️" : "🎤"}</Text>
      </Pressable>
      <Pressable
        onPress={submit}
        disabled={sendDisabled}
        style={({ pressed }) => [
          styles.sendButton,
          sendDisabled && styles.disabled,
          pressed && !sendDisabled && styles.pressed,
        ]}
      >
        <Text style={styles.sendButtonText}>{sending ? "..." : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 10,
    width: "100%",
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#faf5ff",
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#ede9fe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontWeight: "600",
  },
  iconButton: {
    minWidth: 42,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  sendButton: {
    minWidth: 48,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  buttonText: {
    color: "#6d28d9",
    fontWeight: "800",
  },
  sendButtonText: {
    color: "#6d28d9",
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.65,
  },
});
