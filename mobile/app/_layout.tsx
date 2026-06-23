import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { ClerkLoaded, ClerkLoading, ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";

import { useColorScheme } from "@/hooks/use-color-scheme";
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
  const colorScheme = useColorScheme();

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <ClerkLoading>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
            </View>
          </ClerkLoading>
          <ClerkLoaded>
            <SignedIn>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
                <Stack.Screen name="attempt-result" options={{ headerShown: false }} />
                <Stack.Screen name="attempts" options={{ headerShown: false }} />
              </Stack>
            </SignedIn>
            <SignedOut>
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack>
            </SignedOut>
          </ClerkLoaded>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
