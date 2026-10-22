import { Metadata } from "next";
import { PublicOnlyRoute } from "@/components/auth/route-guard";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account | DRONE PILOT",
  description: "Create your pilot credentials and begin flight training.",
};

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <SignupForm />
    </PublicOnlyRoute>
  );
}
