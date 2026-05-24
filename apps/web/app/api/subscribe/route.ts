// app/api/deliveries/events/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:9000";

export async function GET(req: NextRequest) {
  // Create a TransformStream for streaming the response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Get query parameters
  const companyId = req.nextUrl.searchParams.get("company_id");
  const driverId = req.nextUrl.searchParams.get("driver_id");
  const deliveryId = req.nextUrl.searchParams.get("delivery_id");

  // Build the SSE URL
  let serverUrl = `${BACKEND_URL}/store/deliveries/subscribe`;
  const params = new URLSearchParams();
  
  if (companyId) params.append("company_id", companyId);
  if (driverId) params.append("driver_id", driverId);
  if (deliveryId) params.append("delivery_id", deliveryId);
  
  if (params.toString()) {
    serverUrl += `?${params.toString()}`;
  }

  // Send initial connection message
  const connectionMessage = {
    type: "connection",
    message: `Subscribing to${companyId ? ` company ${companyId}` : ""}${driverId ? ` driver ${driverId}` : ""}${deliveryId ? ` delivery ${deliveryId}` : ""}`,
    timestamp: new Date().toISOString(),
  };
  
  await writer.write(
    encoder.encode(`data: ${JSON.stringify(connectionMessage)}\n\n`)
  );

  // Set up the fetch request to the backend
  let abortController = new AbortController();
  
  const fetchSSE = async () => {
    try {
      const response = await fetch(serverUrl, {
        headers: {
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              // Forward the event data
              await writer.write(encoder.encode(`data: ${data}\n\n`));
            } catch (error) {
              console.error("Error writing to stream:", error);
            }
          } else if (line.startsWith("event: ")) {
            // Forward event type if needed
            await writer.write(encoder.encode(`${line}\n`));
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("SSE fetch error:", error);
        const errorMessage = {
          type: "error",
          message: error.message || "Connection error",
          timestamp: new Date().toISOString(),
        };
        
        try {
          await writer.write(
            encoder.encode(`event: error\ndata: ${JSON.stringify(errorMessage)}\n\n`)
          );
        } catch (writeError) {
          console.error("Error writing error to stream:", writeError);
        }
      }
    } finally {
      try {
        await writer.close();
      } catch (closeError) {
        // Writer might already be closed
      }
    }
  };

  // Start the SSE connection
  fetchSSE();

  // Handle client disconnect
  req.signal.addEventListener("abort", () => {
    abortController.abort();
    writer.close().catch(console.error);
  });

  // Return the stream response
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}