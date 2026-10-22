$content = Get-Content -Raw "src/components/simulator/island-map-modal.tsx"
$startString = '            <svg'
$endString = '            </svg>'
$startIndex = $content.IndexOf($startString)
$endIndex = $content.IndexOf($endString, $startIndex) + $endString.Length

$newSvg = @"
            <svg
              viewBox="0 0 1000 1000"
              className="w-full h-full max-w-[720px] max-h-[720px] rounded-xl border border-white/10 shadow-lg bg-[#030712] transition-transform duration-300 ease-out"
              style={{
                transform: `"scale(`${zoomLevel})"`,
                transformOrigin: zoomLevel <= 1.05 ? "center center" : `"`${droneSvg.x}px `${droneSvg.y}px"`,
              }}
            >
              <defs>
                <pattern id="modal-recon-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.05" />
                </pattern>

                <radialGradient id="modal-recon-cone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#ffffff" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width={SVG_CANVAS_SIZE} height={SVG_CANVAS_SIZE} fill="#030712" />
              <rect width={SVG_CANVAS_SIZE} height={SVG_CANVAS_SIZE} fill="url(#modal-recon-grid)" />

              {/* Natural Island Landmass */}
              <path
                d={mapData.coastlinePath}
                fill="#0a0a0a"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeOpacity="0.15"
                strokeLinejoin="round"
              />

              {/* Lake */}
              <circle
                cx={mapData.waterways.lake.cx}
                cy={mapData.waterways.lake.cy}
                r={mapData.waterways.lake.r}
                fill="#ffffff"
                fillOpacity="0.03"
                stroke="#ffffff"
                strokeWidth="1"
                strokeOpacity="0.1"
              />

              {/* River Channel */}
              <path
                d={mapData.waterways.riverPath}
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeOpacity="0.05"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Master Road & Highway Network */}
              <g fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round">
                {mapData.roads.highways.map((h) => (
                  <path key={h.id} d={h.path} strokeWidth={h.width} />
                ))}
                {mapData.roads.connectors.map((c) => (
                  <path key={c.id} d={c.path} strokeWidth={c.width} />
                ))}
                {mapData.roads.mountainPasses.map((m) => (
                  <path key={m.id} d={m.path} strokeWidth={m.width} strokeDasharray="5 4" />
                ))}
              </g>

              {/* Central Airfield & Runway Complex */}
              <g transform="translate(450, 450)">
                <rect x="-80" y="-12" width="160" height="24" rx="2" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
                <line x1="-70" y1="0" x2="70" y2="0" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.8" strokeDasharray="6 5" />
                <text x="0" y="-18" fill="#ffffff" fillOpacity="0.4" fontSize="12" fontWeight="bold" textAnchor="middle">
                  RUNWAY 09/27
                </text>
              </g>

              {/* Live Flight Trail */}
              {flightPathPoints && (
                <polyline
                  points={flightPathPoints}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.65"
                />
              )}

              {/* Active Waypoint Line */}
              <line
                x1={droneSvg.x}
                y1={droneSvg.y}
                x2={targetSvg.x}
                y2={targetSvg.y}
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeDasharray="6 4"
                opacity="0.85"
              />

              {/* Midpoint Distance Tag */}
              <g transform={`translate(`${(droneSvg.x + targetSvg.x) / 2}, `${(droneSvg.y + targetSvg.y) / 2})`}>
                <rect x="-40" y="-14" width="80" height="28" rx="4" fill="#000000" stroke="#ffffff" strokeWidth="1.2" />
                <text x="0" y="5" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
                  {navStats.dist.toFixed(0)}m
                </text>
              </g>

              {/* Helipads & Landmarks with Anti-Collision Labels */}
              {TACTICAL_POIS.map((poi) => {
                const pt = worldToSvg(poi.x, poi.z);
                const isSelected = poi.id === selectedPoiId;
                const ox = poi.labelOffsetX;
                const oy = poi.labelOffsetY;

                return (
                  <g
                    key={poi.id}
                    className="cursor-pointer group"
                    onClick={() => handleSelectTarget(poi)}
                  >
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r="18" fill="none" stroke="#ffffff" strokeWidth="2" className="animate-ping" opacity="0.75" />
                    )}

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="12"
                      fill={isSelected ? "#ffffff" : "#000000"}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      strokeOpacity={isSelected ? "1" : "0.5"}
                      className="transition-transform duration-150 group-hover:scale-125 shadow-lg"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 4}
                      fill={isSelected ? "#000000" : "#ffffff"}
                      fontSize="11"
                      fontWeight="900"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      H
                    </text>

                    {/* Premium Label */}
                    <g transform={`translate(`${pt.x + ox}, `${pt.y + oy})`}>
                      <rect
                        x="-70"
                        y="-16"
                        width="140"
                        height="28"
                        rx="4"
                        fill="#000000"
                        fillOpacity="0.8"
                        stroke="#ffffff"
                        strokeOpacity={isSelected ? "1" : "0.3"}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#ffffff"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none shadow-black drop-shadow-md"
                      >
                        {poi.name}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Drone Tracker Reticle */}
              <g transform={`translate(`${droneSvg.x}, `${droneSvg.y})`}>
                <g transform={`rotate(`${telemetry.heading})`}>
                  <path d="M 0 0 L -45 -120 A 120 120 0 0 1 45 -120 Z" fill="url(#modal-recon-cone)" />
                </g>
                <circle cx="0" cy="0" r="16" fill="none" stroke="#ffffff" strokeWidth="2" className="animate-ping" opacity="0.6" />
                <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                <g transform={`rotate(`${telemetry.heading})`}>
                  <path d="M 0 -14 L -7 7 L 0 3 L 7 7 Z" fill="#000000" />
                </g>
              </g>
            </svg>
"@

$content = $content.Substring(0, $startIndex) + $newSvg + $content.Substring($endIndex)
Set-Content -Path "src/components/simulator/island-map-modal.tsx" -Value $content
