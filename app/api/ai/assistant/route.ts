import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gemini, GEMINI_MODEL } from "@/lib/gemini";
import { getOrCreateGuestSessionId } from "@/lib/guest-session";
import {
  assistantTools,
  executeSearchServices,
  executeGetAvailableSlots,
  executeHoldSlot,
} from "@/lib/ai-tools";
import { Content } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Slotify's booking assistant. You help users find and book services
using the tools available to you — never invent services, prices, or availability that
didn't come from a tool result.

Guidelines:
- Always search for services before claiming one exists.
- Always check real availability before suggesting a specific time.
- Only call hold_slot if the user has clearly confirmed they want to hold a specific time.
- After a successful hold, always tell the user the hold lasts 5 minutes and they must
  complete checkout via the link provided to actually pay and confirm the booking —
  make clear that holding a slot is not the same as booking it.
- Keep responses short and conversational, not a wall of text.`;

const MAX_TOOL_ROUNDS = 4; // safety cap — prevents a runaway loop of tool calls

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const session = await auth();
  const holderId = session?.user?.id ?? (await getOrCreateGuestSessionId());

  // Convert our simple {role, text} history into Gemini's expected format.
  const contents: Content[] = messages.map((m: { role: "user" | "model"; text: string }) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  let toolRounds = 0;

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: assistantTools,
      },
      contents,
    });

    const functionCalls = response.functionCalls;

    // No tool call requested — the model has a final text answer, we're done.
    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({ reply: response.text ?? "" });
      }
      
      const modelParts = response.candidates?.[0]?.content?.parts;

if (!modelParts) {
  throw new Error("No model parts returned alongside function calls");
}


    // Record the model's tool-call request in the conversation history...
    contents.push({
      role: "model",
      parts: modelParts,
    });

    // ...then actually execute each requested tool, using OUR implementations —
    // the model can only ever reach these three narrow functions, nothing else.
    const functionResponseParts = [];
    for (const call of functionCalls) {
      let result;

      switch (call.name) {
        case "search_services":
          result = await executeSearchServices(call.args?.query as string);
          break;
        case "get_available_slots":
          result = await executeGetAvailableSlots(call.args?.serviceId as string);
          break;
        case "hold_slot":
          result = await executeHoldSlot(call.args?.slotId as string, holderId);
          break;
        default:
          result = { error: `Unknown tool: ${call.name}` };
      }

      functionResponseParts.push({
        functionResponse: { name: call.name, response: result },
      });
    }

    // Feed the tool results back in as the next turn, then loop —
    // the model will use this real data to either call another tool or answer.
    contents.push({ role: "user", parts: functionResponseParts });
    toolRounds++;
  }

  return NextResponse.json({
    reply: "I'm having trouble completing that request right now — could you try rephrasing, or browse services directly?",
  });
}