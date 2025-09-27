"use client"

import { useMemo, useState } from "react"
import CameraCapture from "./camera-capture"
import { TARGET_LANGUAGES, isRtl } from "@/lib/languages"
import { drawOverlay, triggerDownload } from "@/lib/canvas"

type ApiResponse = {
  text: string
  sourceScript: string
  targetScript: string
  transliterated: string
}

export default function TransliterateApp() {
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = useState<string>("hindi")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  const targetLabel = useMemo(() => TARGET_LANGUAGES.find((l) => l.id === target)?.label ?? "Selected", [target])

  const onImage = (f: File) => {
    setResultUrl(null)
    setError(null)
    setFile(f)
  }

  const process = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const b64 = await fileToBase64(file)
      const res = await fetch("/api/ocr-and-transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, targetLanguageId: target }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || "Failed to process image")
      }
      const data: ApiResponse = await res.json()

      const blob = await drawOverlay(file, data.transliterated, {
        direction: isRtl(target) ? "rtl" : "ltr",
      })
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
    } catch (e: any) {
      setError(e?.message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (!resultUrl) return
    const blob = await (await fetch(resultUrl)).blob()
    triggerDownload(blob, `transliterated-${target}.png`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="lang">
          Select target language
        </label>
        <select
          id="lang"
          className="max-w-sm rounded border p-2 bg-background"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {TARGET_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <CameraCapture onImage={onImage} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={process}
          disabled={!file || busy}
          className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Processing..." : "Transliterate Image"}
        </button>
        {resultUrl && (
          <button type="button" onClick={download} className="px-4 py-2 rounded border">
            Download PNG
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="text-sm text-red-500">
          {error}
        </div>
      )}

      {resultUrl && (
        <figure className="mt-2">
          <img
            src={resultUrl || "/placeholder.svg?height=400&width=800&query=transliteration%20result%20preview"}
            alt={`Transliterated output in ${targetLabel}`}
            className="w-full rounded border"
          />
          <figcaption className="text-xs opacity-70 mt-1">
            Transliterated into {targetLabel}. The original image remains intact; an overlay bar is drawn at the bottom.
          </figcaption>
        </figure>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string) || "")
    r.onerror = reject
    r.readAsDataURL(file)
  })
}
