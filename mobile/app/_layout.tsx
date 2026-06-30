import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { ClerkLoaded, ClerkLoading, ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";

import { getItemAsync, setItemAsync } from "../src/utils/storage";

export const unstable_settings = {
  anchor: "(tabs)",
};

const tokenCache = {
  async getToken(key: string) {
    return getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    await setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider style={{ flex: 1 }}>
        <ThemeProvider value={DefaultTheme}>
          <ClerkLoading>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
            </View>
          </ClerkLoading>
          <ClerkLoaded>
            <SignedIn>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
                <Stack.Screen name="attempt-result" />
                <Stack.Screen name="attempts" />
              </Stack>
            </SignedIn>
            <SignedOut>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
              </Stack>
            </SignedOut>
          </ClerkLoaded>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
