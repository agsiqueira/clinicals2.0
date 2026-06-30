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
import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { authStyles } from "../../assets/styles/auth.styles";

export default function SigninScreen() {
    const router = useRouter();
    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [authMode, setAuthMode] = useState<"signin" | "reset-request" | "reset-code">("signin");
    const [resetEmail, setResetEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [resetPassword, setResetPassword] = useState("");
    const [resetSuccess, setResetSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    // if already signed in
    useEffect(() => {
        if (!authLoaded) return;
        if (isSignedIn) router.replace("/(tabs)");
    }, [authLoaded, isSignedIn, router]);

    // while Clerk is loading or redirecting
    if (!authLoaded || isSignedIn) {
        return (
            <View style={[authStyles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator />
            </View>
        );
    }

    const handleSignIn = async () => {
        if (!signInLoaded || loading) return;

        const trimmedIdentifier = identifier.trim();
        if (!trimmedIdentifier || !password) {
            setErrorMsg("Please enter your email/username and password.");
            return;
        }

        setErrorMsg("");
        setLoading(true);

        try {
            const result = await signIn.create({
                identifier: trimmedIdentifier,
                password,
            });

            if (result.status !== "complete") {
                setErrorMsg("Sign in requires additional verification.");
                return;
            }

            await setActive({ session: result.createdSessionId });
            router.replace("/(tabs)");
        } catch (err: any) {
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Sign in failed.";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    const openPasswordReset = () => {
        setErrorMsg("");
        setResetSuccess("");
        setResetEmail(identifier.trim());
        setResetCode("");
        setResetPassword("");
        setAuthMode("reset-request");
    };

    const returnToSignIn = () => {
        setErrorMsg("");
        setAuthMode("signin");
        setResetCode("");
        setResetPassword("");
    };

    const handleSendResetCode = async () => {
        if (!signInLoaded || loading) return;

        const trimmedEmail = resetEmail.trim();
        if (!trimmedEmail) {
            setErrorMsg("Please enter the email address for your account.");
            return;
        }

        setErrorMsg("");
        setResetSuccess("");
        setLoading(true);

        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: trimmedEmail,
            });
            setAuthMode("reset-code");
        } catch (err: any) {
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Could not send a password reset code.";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!signInLoaded || loading) return;

        const code = resetCode.trim();
        if (!code || !resetPassword) {
            setErrorMsg("Please enter the reset code and a new password.");
            return;
        }

        setErrorMsg("");
        setLoading(true);

        try {
            const verification = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
            });

            if (verification.status !== "needs_new_password") {
                setErrorMsg("Password reset requires another verification step.");
                return;
            }

            const result = await signIn.resetPassword({ password: resetPassword });

            if (result.status !== "complete") {
                setErrorMsg("Password reset requires another verification step.");
                return;
            }

            if (result.createdSessionId) {
                await setActive({ session: result.createdSessionId });
                router.replace("/(tabs)");
                return;
            }

            setIdentifier(resetEmail.trim());
            setPassword("");
            setResetCode("");
            setResetPassword("");
            setResetSuccess("Password reset complete. Sign in with your new password.");
            setAuthMode("signin");
        } catch (err: any) {
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Password reset failed.";
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
                        source={require("../../assets/images/signin.jpg")}
                        style={authStyles.image}
                    />
                </View>
        
                <Text style={authStyles.title}>Sign In</Text>
                <Text style={authStyles.subtitle}>
                    {authMode === "signin" ? "Welcome back." : "Reset your password."}
                </Text>

                {!!errorMsg && <Text style={authStyles.errorText}>{errorMsg}</Text>}
                {!!resetSuccess && authMode === "signin" && (
                    <Text style={authStyles.successText}>{resetSuccess}</Text>
                )}

                {authMode === "signin" ? (
                    <>
                        <View style={authStyles.inputContainer}>
                            <TextInput
                                value={identifier}
                                onChangeText={setIdentifier}
                                placeholder="Email or Username"
                                autoCapitalize="none"
                                autoCorrect={false}
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
                                autoComplete="password"
                                textContentType="password"
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
                            style={authStyles.forgotPasswordLink}
                            activeOpacity={0.8}
                            onPress={openPasswordReset}
                        >
                            <Text style={authStyles.link}>Forgot password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                authStyles.authButton,
                                (!signInLoaded || loading || !identifier.trim() || !password) && authStyles.buttonDisabled,
                            ]}
                            activeOpacity={0.8}
                            disabled={!signInLoaded || loading || !identifier.trim() || !password}
                            onPress={handleSignIn}
                        >
                            <Text style={authStyles.buttonText}>
                                {loading ? "Signing in..." : "Sign In"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={authStyles.linkContainer}
                            activeOpacity={0.8}
                            onPress={() => router.replace("/signup")}
                        >
                            <Text style={authStyles.linkText}>
                                New here? <Text style={authStyles.link}>Create an account</Text>
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : authMode === "reset-request" ? (
                    <>
                        <View style={authStyles.inputContainer}>
                            <TextInput
                                value={resetEmail}
                                onChangeText={setResetEmail}
                                placeholder="Email"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                                autoComplete="email"
                                textContentType="emailAddress"
                                style={authStyles.textInput}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                authStyles.authButton,
                                (!signInLoaded || loading || !resetEmail.trim()) && authStyles.buttonDisabled,
                            ]}
                            activeOpacity={0.8}
                            disabled={!signInLoaded || loading || !resetEmail.trim()}
                            onPress={handleSendResetCode}
                        >
                            <Text style={authStyles.buttonText}>
                                {loading ? "Sending..." : "Send Reset Code"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={authStyles.linkContainer}
                            activeOpacity={0.8}
                            onPress={returnToSignIn}
                        >
                            <Text style={authStyles.link}>Back to sign in</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={authStyles.resetHelpText}>
                            Enter the code Clerk sent to {resetEmail.trim() || "your email"} and choose a new password.
                        </Text>

                        <View style={authStyles.inputContainer}>
                            <TextInput
                                value={resetCode}
                                onChangeText={setResetCode}
                                placeholder="Verification code"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="number-pad"
                                style={authStyles.textInput}
                            />
                        </View>

                        <View style={authStyles.inputContainer}>
                            <TextInput
                                value={resetPassword}
                                onChangeText={setResetPassword}
                                placeholder="New password"
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
                                (!signInLoaded || loading || !resetCode.trim() || !resetPassword) && authStyles.buttonDisabled,
                            ]}
                            activeOpacity={0.8}
                            disabled={!signInLoaded || loading || !resetCode.trim() || !resetPassword}
                            onPress={handleResetPassword}
                        >
                            <Text style={authStyles.buttonText}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={authStyles.linkContainer}
                            activeOpacity={0.8}
                            onPress={returnToSignIn}
                        >
                            <Text style={authStyles.link}>Back to sign in</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
        </View>
    );
}
