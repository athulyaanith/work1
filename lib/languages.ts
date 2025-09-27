export type LanguageInfo = {
  code: string
  name: string
  script: string
  slug: string
}

// Note: Some languages have multiple scripts in use. For Indian signage/export,
// we select a primary script commonly used in India.
export const LANGUAGES_22: LanguageInfo[] = [
  { code: "asm", name: "Assamese", script: "Assamese (Bengali-Assamese)", slug: "assamese" },
  { code: "ben", name: "Bengali", script: "Bengali", slug: "bengali" },
  { code: "bod", name: "Bodo", script: "Devanagari", slug: "bodo" },
  { code: "doi", name: "Dogri", script: "Devanagari", slug: "dogri" },
  { code: "guj", name: "Gujarati", script: "Gujarati", slug: "gujarati" },
  { code: "hin", name: "Hindi", script: "Devanagari", slug: "hindi" },
  { code: "kan", name: "Kannada", script: "Kannada", slug: "kannada" },
  { code: "kas", name: "Kashmiri", script: "Devanagari", slug: "kashmiri" },
  { code: "kok", name: "Konkani", script: "Devanagari", slug: "konkani" },
  { code: "mai", name: "Maithili", script: "Devanagari", slug: "maithili" },
  { code: "mal", name: "Malayalam", script: "Malayalam", slug: "malayalam" },
  { code: "mni", name: "Manipuri (Meitei)", script: "Meitei Mayek", slug: "manipuri-meitei" },
  { code: "mar", name: "Marathi", script: "Devanagari", slug: "marathi" },
  { code: "nep", name: "Nepali", script: "Devanagari", slug: "nepali" },
  { code: "ori", name: "Odia", script: "Odia", slug: "odia" },
  { code: "pan", name: "Punjabi", script: "Gurmukhi", slug: "punjabi-gurmukhi" },
  { code: "san", name: "Sanskrit", script: "Devanagari", slug: "sanskrit" },
  { code: "sat", name: "Santali", script: "Ol Chiki", slug: "santali-olchiki" },
  { code: "snd", name: "Sindhi", script: "Devanagari", slug: "sindhi-devanagari" },
  { code: "tam", name: "Tamil", script: "Tamil", slug: "tamil" },
  { code: "tel", name: "Telugu", script: "Telugu", slug: "telugu" },
  { code: "urd", name: "Urdu", script: "Arabic (Nastaliq)", slug: "urdu-arabic" },
]

export type TargetLanguage = {
  id: string // slug
  label: string
}

// Build a simple selector list for the UI.
export const TARGET_LANGUAGES: TargetLanguage[] = LANGUAGES_22.map((l) => ({
  id: l.slug,
  label: `${l.name} (${l.script})`,
}))

// Map our slugs to Aksharamukha script keys.
// Note: These keys should match aksharamukha's script names.
const AKSHARAMUKHA_SCRIPT_MAP: Record<string, string> = {
  assamese: "Assamese",
  bengali: "Bengali",
  bodo: "Devanagari",
  dogri: "Devanagari",
  gujarati: "Gujarati",
  hindi: "Devanagari",
  kannada: "Kannada",
  kashmiri: "Devanagari",
  konkani: "Devanagari",
  maithili: "Devanagari",
  malayalam: "Malayalam",
  "manipuri-meitei": "Meetei Mayek",
  marathi: "Devanagari",
  nepali: "Devanagari",
  odia: "Odia",
  "punjabi-gurmukhi": "Gurmukhi",
  sanskrit: "Devanagari",
  "santali-olchiki": "Ol Chiki",
  "sindhi-devanagari": "Devanagari",
  tamil: "Tamil",
  telugu: "Telugu",
  "urdu-arabic": "Arabic",
}

export function getScriptById(slug: string): string | null {
  return AKSHARAMUKHA_SCRIPT_MAP[slug] ?? null
}

export function isRtl(slug: string): boolean {
  return slug === "urdu-arabic"
}

// Heuristic detection of script from OCR text using Unicode ranges.
export function detectScriptFromText(s: string): string {
  const counts: Record<string, number> = {
    Latin: 0,
    Devanagari: 0,
    Bengali: 0,
    Gurmukhi: 0,
    Gujarati: 0,
    Odia: 0,
    Tamil: 0,
    Telugu: 0,
    Kannada: 0,
    Malayalam: 0,
    Arabic: 0,
    "Meetei Mayek": 0,
    "Ol Chiki": 0,
  }

  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0
    if ((cp >= 0x0041 && cp <= 0x007a) || (cp >= 0x0030 && cp <= 0x0039)) counts.Latin++
    else if (cp >= 0x0900 && cp <= 0x097f) counts.Devanagari++
    else if (cp >= 0x0980 && cp <= 0x09ff) counts.Bengali++
    else if (cp >= 0x0a00 && cp <= 0x0a7f) counts.Gurmukhi++
    else if (cp >= 0x0a80 && cp <= 0x0aff) counts.Gujarati++
    else if (cp >= 0x0b00 && cp <= 0x0b7f) counts.Odia++
    else if (cp >= 0x0b80 && cp <= 0x0bff) counts.Tamil++
    else if (cp >= 0x0c00 && cp <= 0x0c7f) counts.Telugu++
    else if (cp >= 0x0c80 && cp <= 0x0cff) counts.Kannada++
    else if (cp >= 0x0d00 && cp <= 0x0d7f) counts.Malayalam++
    else if (cp >= 0x0600 && cp <= 0x06ff) counts.Arabic++
    else if ((cp >= 0xabc0 && cp <= 0xabff) || (cp >= 0xaae0 && cp <= 0xaaff)) counts["Meetei Mayek"]++
    else if (cp >= 0x1c50 && cp <= 0x1c7f) counts["Ol Chiki"]++
  }

  let best = "Latin"
  let bestCount = -1
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestCount) {
      best = k
      bestCount = v
    }
  }
  return best
}
