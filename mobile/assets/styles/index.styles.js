import { StyleSheet, Dimensions } from "react-native";
import { COLORS } from "../../constants/colors";

export const indexStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
    alignItems: "center"
  },
  imageContainer: {
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center"
  },
  image: {
    width: 320,
    height: 320,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 50,
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20
  },
  formContainer: {
    width: "100%",
    alignItems: "center"
  },
  startedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    width: "75%",
    borderRadius: 50,
    marginTop: 20
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
    textAlign: "center",
  },
  linkContainer: {
    alignItems: "center",
    paddingBottom: 20,
    marginTop: 15,
  },
  linkText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
