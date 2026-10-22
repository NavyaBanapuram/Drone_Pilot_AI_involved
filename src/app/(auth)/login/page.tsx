import { Metadata } from "next";
import { PublicOnlyRoute } from "@/components/auth/route-guard";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Pilot Login | DRONE PILOT",
  description: "Enter the flight experience. Sign in to your Drone Pilot account.",
};

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <LoginForm />
    </PublicOnlyRoute>
  );
}
