"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { Mail, RefreshCw, Send, LogOut } from "lucide-react";

export function VerifyEmailCard() {
  const router = useRouter();
  const { user, sendVerificationEmail, reloadUser, logout } = useAuth();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    setMessage(null);

    try {
      await sendVerificationEmail();
      setResendCooldown(60);
      setMessage({
        type: "success",
        text: "Verification email dispatched. Check your inbox and spam folder.",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: "error", text: err.message });
      } else {
        setMessage({ type: "error", text: "Unable to send verification email. Try again later." });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setMessage(null);

    try {
      const verified = await reloadUser();
      if (verified) {
        setMessage({
          type: "success",
          text: "Email verified successfully! Entering Command Center...",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setMessage({
          type: "info",
          text: "Verification pending. Please click the link in your email, then check status again.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Sync error. Please try again in a few moments.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-black border border-neutral-200">
        <Mail className="h-5 w-5" />
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-neutral-900 font-heading">
          Confirm your email
        </h2>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
          We sent an activation link to complete your pilot registration:
        </p>
        <p className="text-xs font-semibold text-neutral-900">
          {user?.email || "pilot@dronepilot.io"}
        </p>
      </div>

      {message && (
        <Alert
          variant={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          type="button"
          variant="orange"
          size="md"
          className="w-full"
          onClick={handleCheckStatus}
          isLoading={isChecking}
          loadingText="Checking status..."
          rightIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Check Verification Status
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          isLoading={isResending}
          loadingText="Sending..."
          leftIcon={<Send className="h-3.5 w-3.5" />}
        >
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Resend Verification Email"}
        </Button>
      </div>

      {/* Logout / Switch Account */}
      <div className="pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors focus-visible:outline-none"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out / Use different account
        </button>
      </div>
    </div>
  );
}
