import { type NextRequest, NextResponse } from "next/server"
import { detectScriptFromText, getScriptById } from "@/lib/languages"

// Tesseract.js for OCR
import Tesseract from "tesseract.js"

// Aksharamukha for Indic script transliteration
// Docs: https://www.npmjs.com/package/aksharamukha
import { transliterate } from "aksharamukha"

export const dynamic = "force-dynamic"

type Body = {
  imageBase64: string // data URL
  targetLanguageId: string
}

function dataUrlToBlob(dataUrl: string): Buffer {
  // data:[mime];base64,....
  const comma = dataUrl.indexOf(",")
  if (comma === -1) {
    throw new Error("Invalid image data")
  }
  const b64 = dataUrl.slice(comma + 1)
  return Buffer.from(b64, "base64")
}

function listOcrLanguages(): string {
  // Using a subset commonly present in Tesseract distributions. Expand as needed.
  // Note: loading too many at once increases load time.
  return [
    "eng",
    "hin", // Hindi
    "ben", // Bengali (also Assamese)
    "tam",
    "tel",
    "kan",
    "mal",
    "guj",
    "pan", // Punjabi Gurmukhi
    "urd",
    "mar",
    "ori", // Odia
    "asm",
    "nep",
  ].join("+")
}

function normalizeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    if (!body?.imageBase64 || !body?.targetLanguageId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 })
    }

    const targetScript = getScriptById(body.targetLanguageId)
    if (!targetScript) {
      return NextResponse.json({ error: "Unknown target language" }, { status: 400 })
    }

    const buf = dataUrlToBlob(body.imageBase64)

    // Run OCR with multiple language packs and let Tesseract infer
    const { data } = await Tesseract.recognize(buf, listOcrLanguages(), {
      logger: () => {}, // silence
    })

    const text = normalizeText(data.text || "")
    if (!text) {
      return NextResponse.json({ error: "No text detected" }, { status: 422 })
    }

    const sourceScript = detectScriptFromText(text)

    // Special case: Latin (English letters) won't transliterate well via Aksharamukha unless
    // text follows a Sanskrit romanization. For road signs, if Latin is detected we will keep
    // the text as-is and attempt a best-effort via source "Devanagari" fallback if target != Latin.
    let transliterated = text
    if (sourceScript !== "Latin") {
      try {
        transliterated = transliterate(sourceScript, targetScript, text)
      } catch {
        // Fallback: if Aksharamukha doesn't support a route, just return original text.
        transliterated = text
      }
    } // else keep English letters as-is; a phonetic model can be added later.

    return NextResponse.json({
      text,
      sourceScript,
      targetScript,
      transliterated,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
