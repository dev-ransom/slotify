import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";

// POST /api/ai/generate-description
// Body: { serviceName: string, keyPoints: string, durationMin: number }
//
// Provider-facing only — turns a few rough bullet points into a polished,
// customer-facing service description.
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
    const response = await gemini.models.generateContent({
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
  } catch (err) {
    console.error("AI description generation failed:", err);
    return NextResponse.json(
      { error: "AI service is temporarily unavailable. You can write your own description instead." },
      { status: 502 }
    );
  }
}