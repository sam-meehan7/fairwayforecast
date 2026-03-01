import Anthropic from "@anthropic-ai/sdk";
import type { GolfDetectionResult } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function detectGolfEvent(
  title: string,
  description: string = ""
): Promise<GolfDetectionResult> {
  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Analyze this calendar event and determine if it's related to playing golf.

Event title: ${title}
Event description: ${description}

Respond with a JSON object containing:
- "is_golf": boolean - true if this is about playing golf (not watching golf on TV, not a golf meeting, etc.)
- "club_name": string or null - the golf club/course name if mentioned

Only return the JSON object, nothing else.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  try {
    let jsonText = responseText;

    // Handle potential markdown code blocks
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.split("```")[1];
      if (jsonText.startsWith("json")) {
        jsonText = jsonText.slice(4);
      }
    }

    const result = JSON.parse(jsonText);
    return {
      is_golf: result.is_golf ?? false,
      club_name: result.club_name ?? null,
    };
  } catch {
    console.warn(`Failed to parse LLM response: ${responseText.slice(0, 100)}`);
    return { is_golf: false, club_name: null };
  }
}
