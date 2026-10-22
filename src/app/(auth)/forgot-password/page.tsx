import { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password | DRONE PILOT",
  description: "Recover your flight credentials and regain access.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      heading="PASSWORD RECOVERY"
      subheading="Enter your email to receive recovery instructions."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
