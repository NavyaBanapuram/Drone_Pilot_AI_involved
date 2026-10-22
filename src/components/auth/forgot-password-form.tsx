"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { isValidEmail } from "@/lib/validation";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email format.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch {
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center py-2">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-neutral-900 font-heading">
            Check your inbox
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
            If an account is associated with <span className="text-neutral-900 font-medium">{email}</span>,
            we have sent instructions to reset your password.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-black hover:underline transition-colors focus-visible:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 text-xs sm:text-sm font-medium text-red-600 py-0.5 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <p className="text-xs text-neutral-500 leading-relaxed">
        Enter your registered email address and we will dispatch a secure link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <Input
          id="recovery-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="pilot@dronepilot.io"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          required
        />

        <Button
          type="submit"
          variant="orange"
          size="md"
          className="w-full"
          isLoading={isSubmitting}
          loadingText="Sending link..."
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="pt-1 text-center">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors focus-visible:outline-none focus-visible:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
