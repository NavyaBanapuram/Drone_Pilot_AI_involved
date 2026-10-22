"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Screen displayed during authentication state resolution.
 * Minimalist luxury white canvas loader.
 */
export function FlightSysLoader({ message = "AUTHENTICATING..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#08090a] p-4 text-white">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5500]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Ensures user is authenticated. Redirects to /login if unauthenticated.
 */
export function ProtectedRoute({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <FlightSysLoader message="Authenticating..." />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

/**
 * For auth pages (/login, /signup). Redirects to /dashboard if already authenticated.
 */
export function PublicOnlyRoute({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return <FlightSysLoader message="Checking session..." />;
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Route guard for /verify-email.
 */
export function VerifyEmailGuard({ children }: RouteGuardProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (isEmailVerified) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, isEmailVerified, router]);

  if (loading) {
    return <FlightSysLoader message="Checking verification..." />;
  }

  if (!user || isEmailVerified) {
    return null;
  }

  return <>{children}</>;
}
