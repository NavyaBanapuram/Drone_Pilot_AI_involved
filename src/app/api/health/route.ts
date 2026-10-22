import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "operational",
      service: "Drone Pilot Simulation Platform",
      version: "1.0.0",
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || "production",
      subsystems: {
        simulationEngine: "ready",
        digitalTwin: "ready",
        telemetryBus: "ready",
        multiplayerAirspace: "ready",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
