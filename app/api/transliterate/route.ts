import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { text, target } = (await req.json()) as {
      text: string
      target: { code: string; name: string; script: string }
    }

    const targetLine = `${target.code}::${target.name}::${target.script}`

    const prompt = [
      "You are a transliterator. Do not translate. Render the same words in the requested script only.",
      "Rules:",
      "- Preserve word boundaries and punctuation.",
      "- Do not invent local synonyms or translations; map Latin letters phonetically into the target script.",
      "- Keep acronyms and short forms recognizable (e.g., 'NH-44', 'U-Turn').",
      "",
      "INPUT_TEXT:",
      text,
      "",
      "TARGET_LANGUAGE (code::name::script):",
      targetLine,
      "",
      "RESPONSE FORMAT (JSON only, no markdown):",
      '{ "result": "..." }',
    ].join("\n")

    const { text: out } = await generateText({
      model: "openai/gpt-5-mini",
      prompt,
      maxTokens: 400,
      temperature: 0.2,
    })

    let parsed: { result: string } = { result: "" }
    try {
      parsed = JSON.parse(out)
    } catch {
      const start = out.indexOf("{")
      const end = out.lastIndexOf("}")
      if (start >= 0 && end > start) {
        parsed = JSON.parse(out.slice(start, end + 1))
      } else {
        throw new Error("Non-JSON response from model")
      }
    }

    return NextResponse.json({ result: parsed.result || "" })
  } catch (err: any) {
    console.error("[v0] /api/transliterate error:", err?.message || err)
    return NextResponse.json({ error: "Failed to transliterate" }, { status: 500 })
  }
}
