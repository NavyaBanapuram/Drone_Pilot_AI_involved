import { FirebaseError } from "firebase/app";

/**
 * Maps Firebase Authentication error codes to user-friendly aerospace-themed messages.
 * Prevents exposing raw internal error stacks to pilots in production.
 */
export function mapFirebaseAuthError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      // Login & credential failures
      case "auth/invalid-credential":
        return "Incorrect password or account does not exist. Please check your details or create an account.";

      case "auth/user-not-found":
        return "Account does not exist. Please check your email or create an account.";

      case "auth/wrong-password":
        return "Incorrect password. Please try again or reset your password.";

      case "auth/invalid-email":
        return "Invalid email address format.";

      case "auth/user-disabled":
        return "This account has been suspended. Please contact support.";

      // Registration failures
      case "auth/email-already-in-use":
        return "This email is already registered. Try signing in instead.";

      case "auth/weak-password":
        return "Password does not meet security clearance (at least 8 characters required).";

      case "auth/operation-not-allowed":
        return "This sign-in method is currently disabled in flight settings.";

      // Google & OAuth failures
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "That Google sign-in could not be completed. Please try again.";

      case "auth/popup-blocked":
        return "Authentication window was blocked by your browser. Please allow popups.";

      case "auth/account-exists-with-different-credential":
        return "An account already exists with the same email using a different sign-in method.";

      // Rate limiting & network
      case "auth/too-many-requests":
        return "Security lockout: too many failed attempts. Please stand by for a few moments.";

      case "auth/network-request-failed":
        return "Telemetry link lost. Please verify your internet connection and retry.";

      case "auth/requires-recent-login":
        return "This sensitive operation requires fresh credentials. Please sign in again.";

      case "auth/expired-action-code":
        return "This verification or reset link has expired. Request a new dispatch.";

      case "auth/invalid-action-code":
        return "This action token is invalid or has already been consumed.";

      default:
        // In development, log the code for debugging
        if (process.env.NODE_ENV === "development") {
          console.warn("[FirebaseAuth Error Code]:", error.code, error.message);
        }
        return "An unexpected authorization error occurred. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
