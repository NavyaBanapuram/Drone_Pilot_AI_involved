"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { DroneIcon } from "@/components/ui/drone-icon";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090a]">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col justify-between bg-[#08090a] text-white overflow-x-hidden safe-area-pb">
      
      {/* Bold Fixed Aerospace Orange Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0c0d0e] px-4 py-3 sm:px-10 sm:py-3 text-white safe-area-padding">
        <div className="flex items-center gap-2.5">
          <DroneIcon className="h-5 w-5 transition-transform hover:scale-105 text-[#FF5500]" />
          <span className="font-sans text-base sm:text-lg font-bold tracking-widest text-white uppercase flex items-center gap-1.5">
            DRONE <span className="text-[#FF5500]">PILOT</span>
          </span>
        </div>
      </header>

      {/* Hero directly on page */}
      <div className="relative my-auto z-10 w-full max-w-xl mx-auto px-4 py-8 pt-24 sm:pt-28 flex flex-col items-center text-center">

        <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white uppercase">
          DRONE PILOT
        </h1>

        <p className="mt-3.5 sm:mt-4 text-xs sm:text-base text-neutral-400 font-bold tracking-widest uppercase leading-relaxed max-w-md px-2">
          Next-generation drone simulation and learning platform. Authenticate to access your pilot credentials.
        </p>

        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-2 sm:px-0">
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto min-w-[135px] border-white/10 text-white hover:bg-white/5"
            onClick={() => router.push("/login")}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            SIGN IN
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto min-w-[175px]"
            onClick={() => router.push("/signup")}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            CREATE AN ACCOUNT
          </Button>
        </div>
      </div>
    </main>
  );
}
