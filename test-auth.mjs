import assert from "node:assert";
import {
  isValidEmail,
  evaluatePasswordStrength,
  validateLoginForm,
  validateSignUpForm,
} from "./src/lib/validation.ts";
import { mapFirebaseAuthError } from "./src/lib/firebase/errors.ts";
import { FirebaseError } from "firebase/app";

console.log("=== DRONE PILOT AUTHENTICATION VERIFICATION SUITE ===");

// 1. Email validation
console.log("\n[TEST 1] Email validation checks...");
assert.strictEqual(isValidEmail("pilot@dronepilot.io"), true);
assert.strictEqual(isValidEmail("test.user+tag@domain.co.uk"), true);
assert.strictEqual(isValidEmail("invalid-email"), false);
assert.strictEqual(isValidEmail("missing@domain"), false);
assert.strictEqual(isValidEmail(""), false);
console.log("✓ Email validation passed.");

// 2. Password Strength Evaluation
console.log("\n[TEST 2] Password strength evaluation...");
const emptyStrength = evaluatePasswordStrength("");
assert.strictEqual(emptyStrength.score, 0);
assert.strictEqual(emptyStrength.label, "Critical");

const weakStrength = evaluatePasswordStrength("abc");
assert.strictEqual(weakStrength.score, 0);

const modStrength = evaluatePasswordStrength("Password123");
assert.ok(modStrength.score >= 2);

const optimalStrength = evaluatePasswordStrength("AeroDrone#2026!Sec");
assert.strictEqual(optimalStrength.score, 4);
assert.strictEqual(optimalStrength.label, "Optimal");
console.log("✓ Password strength evaluation passed.");

// 3. Login form validation
console.log("\n[TEST 3] Login form validation...");
const emptyLogin = validateLoginForm("", "");
assert.ok(emptyLogin.email, "Expected email error");
assert.ok(emptyLogin.password, "Expected password error");

const invalidLoginEmail = validateLoginForm("bad-email", "secret123");
assert.ok(invalidLoginEmail.email, "Expected invalid email error");
assert.strictEqual(invalidLoginEmail.password, undefined);

const validLogin = validateLoginForm("pilot@drone.io", "ClearancePass123");
assert.deepStrictEqual(validLogin, {});
console.log("✓ Login form validation passed.");

// 4. Signup form validation
console.log("\n[TEST 4] Signup form validation...");
const invalidSignup = validateSignUpForm({
  displayName: "",
  email: "invalid",
  password: "short",
  confirmPassword: "different",
  acceptTerms: false,
});
assert.ok(invalidSignup.displayName);
assert.ok(invalidSignup.email);
assert.ok(invalidSignup.password);
assert.ok(invalidSignup.confirmPassword);
assert.ok(invalidSignup.acceptTerms);

const validSignup = validateSignUpForm({
  displayName: "Maverick-01",
  email: "maverick@dronepilot.io",
  password: "FlightClearance#2026",
  confirmPassword: "FlightClearance#2026",
  acceptTerms: true,
});
assert.deepStrictEqual(validSignup, {});
console.log("✓ Signup form validation passed.");

// 5. Firebase Error Mapping
console.log("\n[TEST 5] Firebase error mapping...");
const credError = new FirebaseError("auth/invalid-credential", "Bad credential");
assert.strictEqual(
  mapFirebaseAuthError(credError),
  "Please check your email and password."
);

const userNotFoundError = new FirebaseError("auth/user-not-found", "Not found");
assert.strictEqual(
  mapFirebaseAuthError(userNotFoundError),
  "Please check your email and password."
);

const emailInUseError = new FirebaseError("auth/email-already-in-use", "In use");
assert.strictEqual(
  mapFirebaseAuthError(emailInUseError),
  "This email is already registered. Try signing in instead."
);

const googleCancelledError = new FirebaseError("auth/popup-closed-by-user", "Popup closed");
assert.strictEqual(
  mapFirebaseAuthError(googleCancelledError),
  "That Google sign-in could not be completed. Please try again."
);

const rateLimitError = new FirebaseError("auth/too-many-requests", "Rate limited");
assert.ok(mapFirebaseAuthError(rateLimitError).includes("Security lockout"));

console.log("✓ Firebase error mapping passed.");
console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
