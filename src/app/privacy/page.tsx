import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { DroneIcon } from "@/components/ui/drone-icon";
import { ArrowLeft, Lock, FileCheck2, Database, EyeOff, ShieldAlert, Cpu, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | DRONE PILOT",
  description: "Pilot data privacy charter, telemetry handling, and security compliance standard.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white text-neutral-900 overflow-x-hidden">
      {/* Pristine Drone Flight Illustration Background with Aerospace Orange Blueprint Tint */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-white">
        <Image
          src="/Final-Baground.png"
          alt="Technical Drone Flight Blueprint Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-30 [filter:sepia(100%)_saturate(500%)_hue-rotate(-22deg)]"
        />
      </div>

      {/* Bold Fixed Aerospace Orange Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gradient-to-r from-[#FF5500] via-[#FF5F08] to-[#E64800] px-4 py-3 sm:px-10 sm:py-3 text-white shadow-[0_4px_20px_rgba(255,85,0,0.35)] border-b border-[#D43F00]">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
        >
          <DroneIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="font-machinic text-base sm:text-lg font-bold tracking-widest text-black uppercase flex items-center gap-1.5">
            DRONE <span className="text-white">PILOT</span>
          </span>
        </Link>

        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-black hover:bg-neutral-900 border border-black transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign Up</span>
        </Link>
      </header>

      {/* Main Privacy Content Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 pt-24 sm:pt-28 pb-16 w-full">
        <div className="w-full max-w-3xl rounded-2xl border-2 border-black bg-white p-6 sm:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.14),0_6px_18px_-4px_rgba(0,0,0,0.06)] space-y-8">
          {/* Header & Meta */}
          <div className="border-b border-neutral-200 pb-6 space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-800 font-medium">
              <FileCheck2 className="h-3.5 w-3.5 text-neutral-600" />
              <span>Security Classification: Tier-1 Privacy Compliance</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 uppercase">
              Pilot Data Privacy Policy
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500">
              Last Updated: September 2026 • Aerospace Telemetry Privacy Charter
            </p>
          </div>

          {/* Intro Notice */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-xs sm:text-sm text-neutral-700 leading-relaxed space-y-2">
            <p className="font-semibold text-neutral-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-black" />
              Commitment to Flight Privacy & Encryption
            </p>
            <p>
              DRONE PILOT values pilot confidentiality. This charter details how your personal identity,
              telemetry signals, flight logs, and simulation metrics are collected, encrypted, and protected
              across all station operations.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-black" />
              1. Information Collected from Pilots
            </h2>
            <div className="text-xs sm:text-sm text-neutral-600 leading-relaxed space-y-2">
              <p>We collect only the minimum telemetry and authentication records required to run flight simulations:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
                <li><strong className="text-neutral-900">Account Credentials:</strong> Call sign, email address, password hash, and OAuth profile identifiers.</li>
                <li><strong className="text-neutral-900">Flight Logs & Telemetry:</strong> Simulated drone coordinates, pitch/roll/yaw attitude values, throttle inputs, virtual battery discharge curves, and mission completion times.</li>
                <li><strong className="text-neutral-900">Station Diagnostics:</strong> Browser architecture, WebGL graphics capabilities, session timestamps, and network latency indicators.</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-black" />
              2. How Telemetry Data is Utilized
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Collected telemetry is processed exclusively to calculate real-time flight physics, benchmark
              aerodynamic accuracy, maintain flight clearance leaderboards, prevent cheating or unauthorized
              telemetry injection, and enhance simulation realism. We do not monetize, sell, or rent your
              flight records to third parties.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-black" />
              3. Zero Commercial Data Brokerage
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              DRONE PILOT has a strict zero-ad tracking policy. We do not embed ad trackers, cross-site behavioral
              beacons, or commercial tracking pixels. Your simulation activities remain isolated to your pilot
              station.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-black" />
              4. Data Security & Cryptography
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              All communications between your pilot station and the flight server are protected with TLS 1.3
              end-to-end transport encryption. Passwords and credentials are cryptographically hashed using
              industry-standard one-way key derivation functions. We employ automated rate limiting and
              multi-layer route guards to shield pilot accounts from brute-force incursions.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-black" />
              5. Pilot Rights & Data Deletion
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Pilots have the permanent right to access, inspect, export, or request the irrevocable deletion
              of their account and associated flight logs at any time. Upon receiving a validated deletion
              command, all personal profile records are expunged from primary active storage.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-neutral-200 pt-6">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900">
              6. Privacy Officer Contact
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              For data protection questions, compliance verifications, or account deletion requests, reach
              the Privacy Operations Desk at{" "}
              <a href="mailto:privacy@dronepilot.io" className="text-black font-semibold underline hover:text-neutral-700">
                privacy@dronepilot.io
              </a>.
            </p>
          </section>

          {/* Bottom Back Button */}
          <div className="border-t border-neutral-200 pt-6 flex justify-between items-center">
            <Link
              href="/terms"
              className="text-xs font-semibold text-neutral-600 hover:text-black underline transition-colors"
            >
              &larr; View Terms of Service
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-black hover:bg-neutral-900 shadow-md transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign Up</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
