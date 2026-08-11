import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";

// POST /api/ai/generate-description
// Body: { serviceName: string, keyPoints: string, durationMin: number }
//
// Provider-facing only — turns a few rough bullet points into a polished,
// customer-facing service description.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  params: Parameters<typeof gemini.models.generateContent>[0],
  maxRetries = 2
) {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await gemini.models.generateContent(params);
    } catch (err: any) {
      lastErr = err;

      // Only retry on rate limit (429). Other errors (bad request, auth,
      // model not found) won't be fixed by waiting, so fail fast.
      const status = err?.status ?? err?.error?.code;
      if (status !== 429 || attempt === maxRetries) {
        throw err;
      }

      // Respect the API's suggested retry delay if present, else backoff.
      const suggestedDelay = err?.error?.details?.find(
        (d: any) => d["@type"]?.includes("RetryInfo")
      )?.retryDelay;

      const delayMs = suggestedDelay
        ? parseFloat(suggestedDelay) * 1000
        : 1000 * 2 ** attempt; // 1s, 2s, 4s...

      await sleep(delayMs);
    }
  }

  throw lastErr;
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceName, keyPoints, durationMin } = await req.json();

  if (!serviceName || !keyPoints) {
    return NextResponse.json(
      { error: "serviceName and keyPoints are required" },
      { status: 400 }
    );
  }

  const systemInstruction =
    "You write short, professional service descriptions for a booking " +
    "platform. Output ONLY the description text — no preamble, no quotes, " +
    "no markdown formatting. Keep it to 1-2 sentences, warm but not " +
    "over-the-top, and never invent specific credentials, certifications, " +
    "or claims the provider didn't mention.";

  try {
    const response = await generateWithRetry({
      model: GEMINI_MODEL,
      config: {
        systemInstruction,
        maxOutputTokens: 200,
        temperature: 0.7,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Service name: ${serviceName}\nDuration: ${durationMin} minutes\nKey points from the provider: ${keyPoints}`,
            },
          ],
        },
      ],
    });

    const description = response.text?.trim();

    if (!description) {
      return NextResponse.json({ error: "Could not generate a description" }, { status: 502 });
    }

    return NextResponse.json({ description });
  } catch (err: any) {
    console.error("AI description generation failed:", err);

    const isRateLimit = (err?.status ?? err?.error?.code) === 429;

    return NextResponse.json(
      {
        error: isRateLimit
          ? "AI service is busy right now. Please try again in a moment, or write your own description."
          : "AI service is temporarily unavailable. You can write your own description instead.",
      },
      { status: 502 }
    );
  }
}