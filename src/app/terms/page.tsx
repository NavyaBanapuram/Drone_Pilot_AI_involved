import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { DroneIcon } from "@/components/ui/drone-icon";
import { ArrowLeft, ShieldCheck, FileText, Compass, AlertTriangle, KeyRound, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | DRONE PILOT",
  description: "Pilot terms of service, simulation rules, and flight operational clearance accord.",
};

export default function TermsOfServicePage() {
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

      {/* Main Legal Content Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 pt-24 sm:pt-28 pb-16 w-full">
        <div className="w-full max-w-3xl rounded-2xl border-2 border-black bg-white p-6 sm:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.14),0_6px_18px_-4px_rgba(0,0,0,0.06)] space-y-8">
          {/* Header & Meta */}
          <div className="border-b border-neutral-200 pb-6 space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-800 font-medium">
              <FileText className="h-3.5 w-3.5 text-neutral-600" />
              <span>Document Ref: DP-TOS-REV4</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 uppercase">
              Pilot Terms of Service
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500">
              Effective Date: September 2026 • Flight Control Operational Accord
            </p>
          </div>

          {/* Intro Notice */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-xs sm:text-sm text-neutral-700 leading-relaxed space-y-2">
            <p className="font-semibold text-neutral-900 flex items-center gap-2">
              <Compass className="h-4 w-4 text-black" />
              Clearance Authorization & Acceptance
            </p>
            <p>
              By establishing a pilot station, registering flight credentials, or engaging the simulation
              telemetry engine on DRONE PILOT, you agree to comply with and be bound by the following flight
              regulations. If you do not agree to these terms, do not access the pilot portal.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-black" />
              1. Simulation Operations & Flight Safety
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              DRONE PILOT provides next-generation unmanned aerial vehicle (UAV) simulation, flight path
              computation, aerodynamic physics modeling, and pilot training software. All simulated flights,
              waypoint grids, and telemetry visualizations are strictly virtual and educational. Users must
              not confuse virtual simulation parameters with real-world certified FAA, EASA, or national civil
              aviation authority flight control protocols.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-black" />
              2. Pilot Call Signs & Credential Security
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              When enlisting as a pilot, you agree to provide authentic and accurate flight registration details.
              You are solely responsible for maintaining the confidentiality of your access keys and security
              passwords. Any flight simulation operations or telemetry dispatches executed under your credentials
              shall be deemed your sole operational responsibility. If you detect unauthorized clearance
              activity, notify flight control immediately.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-black" />
              3. Telemetry Integrity & Platform Conduct
            </h2>
            <div className="text-xs sm:text-sm text-neutral-600 leading-relaxed space-y-2">
              <p>Pilots are strictly prohibited from engaging in any of the following unauthorized maneuvers:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
                <li>Injecting malicious telemetry packets, spoofed GPS coordinates, or reverse-engineering flight engines.</li>
                <li>Attempting to bypass station route guards, authorization barriers, or automated security limits.</li>
                <li>Using automated scraping bots to harvest flight metrics, leaderboards, or pilot profiles.</li>
                <li>Simulating hostile UAV maneuvers against shared flight rooms or multi-agent test environments.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-black" />
              4. Disclaimer of Aeronautical Liability
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              DRONE PILOT AND ITS SIMULATION ENGINE ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS.
              THE PLATFORM DOES NOT GUARANTEE THAT SIMULATED AERODYNAMIC BEHAVIORS WILL 100% MIRROR REAL-WORLD
              HARDWARE UAV DYNAMICS SUBJECT TO MICRO-METEOROLOGICAL PHENOMENA. UNDER NO CIRCUMSTANCES SHALL
              DRONE PILOT BE HELD LIABLE FOR HARDWARE DAMAGE, REAL-WORLD FLIGHT CRASHES, OR OPERATOR NEGLIGENCE
              OCCURRING OUTSIDE THE SIMULATOR.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900">
              5. Grounding & Account Termination
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Flight Control reserves the right to suspend, ground, or permanently terminate any pilot account
              found to be in breach of these terms, engaging in telemetry tampering, or violating security
              protocols, without prior notice or liability.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-neutral-200 pt-6">
            <h2 className="font-heading text-base sm:text-lg font-bold text-neutral-900">
              6. Contact Flight Control
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              For legal inquiries, flight regulation clarifications, or station assistance, please reach out to
              Flight Control at{" "}
              <a href="mailto:support@dronepilot.io" className="text-black font-semibold underline hover:text-neutral-700">
                support@dronepilot.io
              </a>.
            </p>
          </section>

          {/* Bottom Back Button */}
          <div className="border-t border-neutral-200 pt-6 flex justify-between items-center">
            <Link
              href="/privacy"
              className="text-xs font-semibold text-neutral-600 hover:text-black underline transition-colors"
            >
              View Privacy Policy &rarr;
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
