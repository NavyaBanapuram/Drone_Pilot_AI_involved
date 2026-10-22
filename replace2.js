const fs = require('fs');

let code = fs.readFileSync('src/components/digital-twin/configuration-overview.tsx', 'utf8');

const replacement = `export function ConfigurationOverview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams?.get("drone") as DroneCategory | null;
  const showSavedSuccess = searchParams?.get("saved") === "true";

  const [status, setStatus] = useState<import('@/types/drone-digital-twin').ConfigStatus>("UNKNOWN");
  const [persistedConfig, setPersistedConfig] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setStatus("LOADING");
      return;
    }
    
    if (!user) {
      // Unauthenticated, wait for route guard to kick in
      return;
    }
    
    if (!activeCategory) {
      router.replace("/dashboard");
      return;
    }

    const fetchConfig = async () => {
      setStatus("LOADING");
      try {
        const result = await getUserConfiguration(user.uid, activeCategory, false);
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
  }, [user, authLoading, activeCategory, router]);

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
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-6 max-w-md mx-auto text-center">
        <Settings2 className="w-16 h-16 text-neutral-800" />
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">NOT CONFIGURED</h2>
          <p className="text-sm text-neutral-400">
            Your {activeCategory} aircraft does not have a verified digital twin configuration. 
            You must configure its mass, propulsion, and avionics before simulating flight.
          </p>
        </div>
        <Button 
          onClick={() => router.push(\`/configure/edit?drone=\${activeCategory}\`)}
          variant="primary"
          size="lg"
          className="w-full mt-4"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          CONFIGURE AIRCRAFT
        </Button>
      </div>
    );
  }

  const config = persistedConfig;
  // ... rest of the code is the summary layout
`;

const startIndex = code.indexOf('export function ConfigurationOverview() {');
const endIndex = code.indexOf('return (', code.indexOf('if (!config) {') > -1 ? code.indexOf('if (!config) {') : code.indexOf('const config = persistedConfig;') > -1 ? code.indexOf('const config = persistedConfig;') : code.indexOf('return (', code.indexOf('ConfigurationOverview()')));
// Wait, I will just do a targeted replace for the top of the function

let startTop = code.indexOf('export function ConfigurationOverview() {');
let startBottom = code.indexOf('  return (\n    <div className="w-full">');

if (startTop !== -1 && startBottom !== -1) {
  let bottomPart = code.substring(startBottom);
  bottomPart = bottomPart.replace(/\{showSavedSuccess.*\}/s, (match) => {
    return `{showSavedSuccess && (
        <div className="mb-8 p-4 bg-[#FF5500]/10 border border-[#FF5500]/20 rounded flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-[#FF5500] uppercase tracking-wider">Configuration Saved Successfully</h4>
            <p className="text-xs text-[#FF5500]/80 mt-1">Your aircraft digital twin has been verified and stored.</p>
          </div>
        </div>
      )}`;
  });
  
  let result = code.substring(0, startTop) + replacement + bottomPart;
  fs.writeFileSync('src/components/digital-twin/configuration-overview.tsx', result);
  console.log("ConfigurationOverview replaced successfully!");
} else {
  console.log("Indices not found");
}
