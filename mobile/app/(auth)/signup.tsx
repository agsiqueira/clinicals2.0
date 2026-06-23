import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { authStyles } from "../../assets/styles/auth.styles";

export default function SignupScreen() {
    const router = useRouter();
    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const { signUp, setActive, isLoaded } = useSignUp();

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!authLoaded) return;
        if (isSignedIn) router.replace("/(tabs)/cases");
    }, [authLoaded, isSignedIn, router]);

    if (!authLoaded || isSignedIn) {
        return (
            <View style={[authStyles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator />
            </View>
        );
    }

    const handleSignUp = async () => {
        if (!isLoaded || loading) return;

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setErrorMsg("Please enter both email and password.");
            return;
        }

        setErrorMsg("");
        setLoading(true);

        try {
            const trimmedUsername = username.trim();

            if (!trimmedEmail || !trimmedUsername || !password) {
                setErrorMsg("Please enter username, email, and password.");
                return;
            }

            const result = await signUp.create({
                emailAddress: trimmedEmail,
                password,
                username: trimmedUsername,
            });


            // Clerk email verification is disabled for now
            if (result.status !== "complete") {
                setErrorMsg(
                    "Signup is not complete. Disable email verification in Clerk or you must add a verify screen."
                );
                return;
            }

            await setActive({ session: result.createdSessionId });
            router.replace("/(tabs)/cases");
        } catch (err: any) {
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Sign up failed.";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={authStyles.container}>
            <KeyboardAvoidingView
                style={authStyles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={authStyles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={authStyles.imageContainer}>
                        <Image
                            source={require("../../assets/images/signup.jpg")}
                            style={authStyles.image}
                        />
                    </View>
                    
                    <Text style={authStyles.title}>Sign Up</Text>
                    <Text style={authStyles.subtitle}>Create your account.</Text>

                    {!!errorMsg && <Text style={authStyles.errorText}>{errorMsg}</Text>}

                    <View style={authStyles.inputContainer}>
                        <TextInput
                            placeholder="Username"
                            autoCapitalize="none"
                            value={username}
                            onChangeText={setUsername}
                            style={authStyles.textInput}
                        />
                    </View>

                    <View style={authStyles.inputContainer}>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress"
                            style={authStyles.textInput}
                        />
                    </View>

                    <View style={authStyles.inputContainer}>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password-new"
                            textContentType="newPassword"
                            style={authStyles.textInput}
                        />

                        <TouchableOpacity
                            style={authStyles.eyeButton}
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={10}
                            activeOpacity={0.8}
                        >
                        <Text style={authStyles.eyeText}>
                            {showPassword ? "Hide" : "Show"}
                        </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            authStyles.authButton,
                            (!isLoaded || loading || !email.trim() || !username.trim() || !password) && authStyles.buttonDisabled,
                        ]}
                        activeOpacity={0.8}
                        disabled={!isLoaded || loading || !email.trim() || !username.trim() || !password}
                        onPress={handleSignUp}
                    >
                        <Text style={authStyles.buttonText}>
                        {loading ? "Creating..." : "Create Account"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={authStyles.linkContainer}
                        activeOpacity={0.8}
                        onPress={() => router.replace("/signin")}
                    >
                        <Text style={authStyles.linkText}>
                        Already have an account?{" "}
                        <Text style={authStyles.link}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
