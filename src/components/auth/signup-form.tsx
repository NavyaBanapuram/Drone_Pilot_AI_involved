"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { validateSignUpForm } from "@/lib/validation";
import { Input } from "../ui/input";
import { PasswordInput } from "../ui/password-input";
import { Button } from "../ui/button";
import { GoogleIcon } from "../ui/google-icon";
import { PasswordStrengthMeter } from "./password-strength";
import { AuthCard } from "./auth-card";
import { User, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAuthError(null);

    const validationErrors = validateSignUpForm({
      displayName,
      email,
      password,
      confirmPassword,
      acceptTerms,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await signup(email, password, displayName);
      router.push("/verify-email");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError("Google sign-up could not be completed.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      heading="PILOT ENLISTMENT"
      subheading="Register your flight credentials."
      belowCard={
        <>
          {/* Subtle Canvas-blended Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative bg-[#08090a] px-4 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              OR CONTINUE WITH
            </div>
          </div>

          {/* Premium Google OAuth Bar Button with Warm Tint */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full justify-center text-xs sm:text-sm font-semibold transition-all bg-white text-black hover:bg-neutral-200 border-none"
            onClick={handleGoogleSignUp}
            isLoading={isGoogleLoading}
            loadingText="CONNECTING..."
            leftIcon={<GoogleIcon className="h-4 w-4 shrink-0" />}
          >
            CONTINUE WITH GOOGLE
          </Button>

          {/* Existing User Account Switch */}
          <div className="relative flex justify-center pt-6 pb-2">
            <p className="text-center text-xs font-bold tracking-wider uppercase text-neutral-500">
              ALREADY HAVE AN ACCOUNT?{" "}
              <Link
                href="/login"
                className="text-[#FF5500] hover:text-white transition-colors ml-1 focus-visible:outline-none focus-visible:underline"
              >
                SIGN IN
              </Link>
            </p>
          </div>
        </>
      }
    >
      <div className="space-y-2.5">
        {authError && (
          <div className="flex items-start gap-2 text-xs font-medium text-red-600 py-0.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-snug">{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} action="javascript:void(0);" className="space-y-2.5" noValidate>
          {/* Responsive 2-Column Row 1: Call Sign & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              id="pilot-callsign"
              label="Pilot Call Sign"
              type="text"
              autoComplete="name"
              placeholder="e.g. Maverick"
              leftIcon={<User className="h-4 w-4" />}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: "" }));
              }}
              error={errors.displayName}
              required
            />

            <Input
              id="pilot-signup-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="pilot@dronepilot.io"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              error={errors.email}
              required
            />
          </div>

          {/* Responsive 2-Column Row 2: Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
            <div>
              <PasswordInput
                id="pilot-signup-password"
                label="Password"
                autoComplete="new-password"
                placeholder="At least 8 chars"
                leftIcon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                error={errors.password}
                required
              />

              <PasswordStrengthMeter password={password} />
            </div>

            <PasswordInput
              id="pilot-signup-confirm-password"
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              error={errors.confirmPassword}
              required
            />
          </div>

          {/* Terms & Consent */}
          <div className="pt-0.5">
            <label className="flex items-start gap-2 text-xs text-neutral-600 font-medium select-none cursor-pointer leading-tight">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (errors.acceptTerms) setErrors((prev) => ({ ...prev, acceptTerms: "" }));
                }}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#FF5500] focus:ring-[#FF5500] accent-[#FF5500] cursor-pointer"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-[#FF5500] font-semibold hover:underline transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[#FF5500] font-semibold hover:underline transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Privacy Policy
                </Link>.
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                <span className="inline-block h-1 w-1 rounded-full bg-red-600" />
                {errors.acceptTerms}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="orange"
            size="md"
            className="w-full mt-1 font-semibold text-xs sm:text-sm"
            isLoading={isSubmitting}
            loadingText="Creating account..."
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Create an account
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
