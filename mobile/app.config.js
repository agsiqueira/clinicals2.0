import "dotenv/config";

export default ({ config }) => ({
  ...config,
  plugins: Array.from(new Set([...(config.plugins || []), "expo-video"])),
  extra: {
    ...(config.extra || {}),
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    eas: {
      projectId: "245a4a98-9645-43d9-9664-9d34c502e8eb",
    },
  },
});