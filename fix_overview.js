const fs = require('fs');

let oldCode = fs.readFileSync('overview.txt', 'utf8');

const newCode = `import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DroneCategory, DroneDigitalTwinConfiguration, ConfigStatus } from "@/types/drone-digital-twin";
import { getUserConfiguration } from "@/lib/digital-twin/digital-twin-storage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Settings2, AlertTriangle, CheckCircle2 } from "lucide-react";

// Helper component for formatting values
const Value = ({ value, unit = "" }: { value: any, unit?: string }) => {
  if (value === undefined || value === null || Number.isNaN(value) || value === "") {
    return <span className="text-neutral-500">—</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Enabled" : "Disabled"}</span>;
  }
  return <span>{String(value)}{unit ? \` \${unit}\` : ""}</span>;
};

// Row layout for engineering specifications
const SpecRow = ({ label, value, unit }: { label: string, value: any, unit?: string }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 border-b border-white/5 group hover:bg-white/[0.02] px-1 transition-colors">
    <span className="text-xs text-neutral-400 mb-1 md:mb-0">{label}</span>
    <span className="text-sm font-medium text-white/90 md:text-right">
      <Value value={value} unit={unit} />
    </span>
  </div>
);

// Group section layout
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-4 mb-3">
      <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FF5500] shrink-0">{title}</h3>
      <div className="h-px bg-white/10 flex-1" />
    </div>
    <div className="flex flex-col">
      {children}
    </div>
  </div>
);

export function ConfigurationOverview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams?.get("drone") as DroneCategory | null;
  const showSavedSuccess = searchParams?.get("saved") === "true";

  const [status, setStatus] = useState<ConfigStatus>("UNKNOWN");
  const [persistedConfig, setPersistedConfig] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setStatus("LOADING");
      return;
    }
    
    if (!activeCategory) {
      router.replace("/dashboard");
      return;
    }

    if (!user) {
      return;
    }

    const fetchConfig = async () => {
      setStatus("LOADING");
      try {
        const result = await getUserConfiguration(user.uid, activeCategory, showSavedSuccess);
        
        if (result.status === "SUCCESS" && result.data) {
          setPersistedConfig(result.data);
          setStatus("CONFIGURED");
        } else if (result.status === "NOT_FOUND") {
          setPersistedConfig(null);
          setStatus("NOT_CONFIGURED");
        } else if (result.status === "OFFLINE") {
          setPersistedConfig(null);
          setErrorMsg(result.error || "Client is offline");
          setStatus("OFFLINE");
        } else {
          setPersistedConfig(null);
          setErrorMsg(result.error || "Load error");
          setStatus("LOAD_ERROR");
        }
      } catch (err: any) {
        console.error("Failed to load config", err);
        setErrorMsg(err.message || "Unknown error");
        setStatus("LOAD_ERROR");
      }
    };
    
    fetchConfig();
  }, [user, authLoading, activeCategory, showSavedSuccess, router]);

  if (status === "LOADING" || status === "UNKNOWN") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Loading Configuration...</p>
      </div>
    );
  }

  if (status === "LOAD_ERROR" || status === "OFFLINE") {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          {status === "OFFLINE" ? "You are currently offline." : "Unable to load your aircraft configuration."}
        </p>
        {errorMsg && <p className="text-[10px] text-neutral-600">{errorMsg}</p>}
        <Button 
          onClick={() => { setStatus("LOADING"); router.refresh(); }}
          variant="primary"
          className="mt-4 inline-flex items-center justify-center gap-2"
        >
          <span>RETRY</span>
        </Button>
      </div>
    );
  }

  if (status === "NOT_CONFIGURED" || !persistedConfig) {
    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col mt-8 pb-32">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight uppercase">
                    {activeCategory}
                </h1>
                <Button  
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                    RETURN TO HANGAR
                </Button>
            </div>
            
            <div className="w-full flex flex-col items-center justify-center py-20 px-6 border border-white/10 rounded-lg bg-[#0c0d0e] mt-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-6">
                        <Settings2 className="w-8 h-8 text-neutral-500" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2 uppercase tracking-widest">NOT CONFIGURED</h2>
                  <p className="text-sm text-neutral-400 text-center max-w-md mb-8">
                      Configure your aircraft's airframe, propulsion, battery, avionics, payload and performance parameters before entering simulation.
                  </p>
                  <Button  
                        onClick={() => router.push(\`/configure/edit?drone=\${activeCategory}\`)}
                        variant="primary"
                        leftIcon={<Settings2 className="w-4 h-4" />}
                    >
                        CONFIGURE AIRCRAFT
                  </Button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 landscape:py-2 bg-gradient-to-t from-[#08090a] via-[#08090a]/90 to-transparent z-50 pointer-events-none safe-area-pb">
                <div className="max-w-5xl mx-auto flex items-center justify-center sm:justify-end gap-2 sm:gap-4 pointer-events-auto px-4 safe-area-padding">
                    <span className="text-xs font-medium text-neutral-500 mr-4">
                        Complete aircraft configuration to continue.
                    </span>
                    <Button
                        disabled
                        variant="black"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                        SELECT ENVIRONMENT
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  const config = persistedConfig;
`;

const splitString = "  return (\n    <div className=\"w-full max-w-5xl mx-auto flex flex-col mt-8 pb-32\">";
const splitIndex = oldCode.indexOf(splitString);

if (splitIndex !== -1) {
  const remainder = oldCode.substring(splitIndex);
  // Add showSavedSuccess message logic
  const modifiedRemainder = remainder.replace("{showSavedSuccess && (", 
  `{showSavedSuccess && (
        <div className="mb-8 p-4 bg-[#FF5500]/10 border border-[#FF5500]/20 rounded flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-[#FF5500] uppercase tracking-wider">Configuration Saved Successfully</h4>
            <p className="text-xs text-[#FF5500]/80 mt-1">Your aircraft digital twin has been verified and stored.</p>
          </div>
        </div>
      )}
      {false && (`);
      
  fs.writeFileSync('src/components/digital-twin/configuration-overview.tsx', newCode + "\\n" + remainder);
  console.log("ConfigurationOverview rewritten successfully");
} else {
  console.log("splitString not found in oldCode");
}
