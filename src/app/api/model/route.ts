import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side model streaming endpoint to bypass client-side CORS restrictions
 * when hosting the ONNX model on external hosts like GitHub Releases or AWS S3.
 */
export async function GET(req: NextRequest) {
  const modelUrl = process.env.MODEL_SOURCE_URL || process.env.NEXT_PUBLIC_MODEL_URL;

  if (!modelUrl || modelUrl === "/api/model") {
    return NextResponse.json(
      {
        error: "No external model source URL configured.",
        hint: "Set MODEL_SOURCE_URL in Vercel environment variables to your GitHub Release or CDN URL.",
      },
      { status: 404 }
    );
  }

  try {
    const upstreamRes = await fetch(modelUrl, {
      headers: {
        "User-Agent": "DronePilot-Simulation-Platform/1.0",
      },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch model from upstream: ${upstreamRes.status} ${upstreamRes.statusText}`,
        },
        { status: upstreamRes.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[/api/model] Error proxying model:", error);
    return NextResponse.json(
      { error: "Model streaming error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
