"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  signUpWithEmail as apiSignUp,
  loginWithEmail as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  logoutUser as apiLogout,
  resetPassword as apiResetPassword,
  sendVerificationEmail as apiSendVerificationEmail,
  reloadCurrentUser as apiReloadCurrentUser,
  type PilotUser,
} from "@/lib/firebase/auth";
import { mapFirebaseAuthError } from "@/lib/firebase/errors";

interface AuthContextType {
  user: PilotUser | null;
  loading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  isFirebaseLive: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_STORAGE_KEY = "drone_pilot_mock_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PilotUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawFirebaseUser, setRawFirebaseUser] = useState<User | null>(null);

  const isLive = isFirebaseConfigured();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize and observe auth state
  useEffect(() => {
    if (isLive) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setRawFirebaseUser(firebaseUser);
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Mock auth persistent listener for local testing
      try {
        const stored = localStorage.getItem(MOCK_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    }
  }, [isLive]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await apiLogin(email, password);
      setUser(result.user);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      const result = await apiSignUp(email, password, displayName);
      setUser(result.user);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const result = await apiLoginWithGoogle();
      setUser(result.user);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await apiLogout();
      setUser(null);
      setRawFirebaseUser(null);
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(MOCK_STORAGE_KEY);
        }
      } catch {
        // Ignore
      }
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await apiResetPassword(email);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const sendVerificationEmail = async () => {
    setError(null);
    try {
      await apiSendVerificationEmail(rawFirebaseUser);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    try {
      const verified = await apiReloadCurrentUser(rawFirebaseUser);
      if (verified) {
        setUser((prev) => (prev ? { ...prev, emailVerified: true } : null));
      }
      return verified;
    } catch (err) {
      console.warn("Error reloading pilot status:", err);
      return false;
    }
  };

  const isEmailVerified = Boolean(user?.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isEmailVerified,
        isFirebaseLive: isLive,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        sendVerificationEmail,
        reloadUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
