import { View, Image, Text, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from "react-native";
import { indexStyles } from "../../assets/styles/index.styles";
import { useRouter } from "expo-router";

export default function IndexScreen() {
  const router = useRouter();
  
  return (
    <View style={indexStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={indexStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={indexStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={indexStyles.imageContainer}>
            <Image
              source={require("../../assets/images/logo.jpg")}
              style={indexStyles.image}
            />
          </View>

          <Text style={indexStyles.title}>
            Welcome to Clinicals
          </Text>

          <Text style={indexStyles.subtitle}>
            Clinical training, one case at a time!
          </Text>

          <View style={indexStyles.formContainer}>
            <TouchableOpacity
              style={[indexStyles.startedButton]}
              activeOpacity={0.8}
              onPress={() => router.push("/signup")}
            >
              <Text style={indexStyles.buttonText}>
                Get Started
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={indexStyles.linkContainer}
            activeOpacity={0.8}
            onPress={() => router.push("/signin")}
          >
            <Text style={indexStyles.linkText}>
              Already have an account? <Text style={indexStyles.link}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
