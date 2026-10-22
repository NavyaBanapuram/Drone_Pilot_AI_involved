import { Metadata } from "next";
import { VerifyEmailGuard } from "@/components/auth/route-guard";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";

export const metadata: Metadata = {
  title: "Verify Flight ID | DRONE PILOT",
  description: "Check your email to verify your Drone Pilot registration.",
};

export default function VerifyEmailPage() {
  return (
    <VerifyEmailGuard>
      <AuthCard
        heading="VERIFY YOUR FLIGHT ID"
        subheading="Check your email to complete your pilot registration."
      >
        <VerifyEmailCard />
      </AuthCard>
    </VerifyEmailGuard>
  );
}
