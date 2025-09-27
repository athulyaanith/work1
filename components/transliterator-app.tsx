"use client"

import type React from "react"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import Tesseract from "tesseract.js"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Download, Camera, ImageDown } from "lucide-react"
import { LANGUAGES_22 } from "@/lib/languages"
import { downloadJson, downloadDataUrl } from "@/lib/download"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TransliteratorApp() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState<string>("")
  const [ocrProgress, setOcrProgress] = useState<number>(0)
  const [isOcrRunning, setIsOcrRunning] = useState(false)

  const [selectedLangCode, setSelectedLangCode] = useState<string>("hin")
  const [isTransliterating, setIsTransliterating] = useState(false)
  const [resultText, setResultText] = useState<string>("")

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setResultText("")
    setGeneratedImageUrl("")
    setOcrText("")
    setOcrProgress(0)
    setIsOcrRunning(true)

    try {
      const { data } = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && m.progress != null) {
            setOcrProgress(Math.round(m.progress * 100))
          }
        },
      })
      const text = (data?.text || "").trim()
      setOcrText(text)
    } catch (err: any) {
      console.error("[v0] OCR error:", err?.message || err)
      setOcrText("")
    } finally {
      setIsOcrRunning(false)
    }
  }, [])

  const handleTransliterate = useCallback(async () => {
    const text = ocrText.trim()
    if (!text) return
    const lang = LANGUAGES_22.find((l) => l.code === selectedLangCode)
    if (!lang) return

    setIsTransliterating(true)
    setResultText("")
    setGeneratedImageUrl("")
    try {
      const res = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          target: { code: lang.code, name: lang.name, script: lang.script },
        }),
      })
      if (!res.ok) {
        throw new Error(`Failed: ${res.status} ${res.statusText}`)
      }
      const data = (await res.json()) as { result: string }
      setResultText(data.result || "")
    } catch (err: any) {
      console.error("[v0] Transliteration error:", err?.message || err)
    } finally {
      setIsTransliterating(false)
    }
  }, [ocrText, selectedLangCode])

  const handleExportSelectedJson = useCallback(() => {
    const lang = LANGUAGES_22.find((l) => l.code === selectedLangCode)
    if (!lang || !resultText) return
    const payload = {
      sourceLanguage: "English",
      sourceScript: "Latin",
      targetLanguage: lang.name,
      targetScript: lang.script,
      originalText: ocrText,
      transliteratedText: resultText,
    }
    downloadJson(payload, `transliteration-${lang.slug}.json`)
  }, [selectedLangCode, ocrText, resultText])

  const handleRenderOnImage = useCallback(async () => {
    if (!imageUrl || !resultText) return
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = imageUrl
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Failed to load image"))
      })

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not supported")

      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw translucent bar at bottom
      const pad = Math.max(16, Math.round(canvas.width * 0.02))
      const maxWidth = canvas.width - pad * 2
      // Base font size relative to width, clamped between 20-64
      const baseFont = Math.max(20, Math.min(64, Math.round(canvas.width * 0.035)))

      ctx.font = `${baseFont}px sans-serif`
      ctx.textBaseline = "top"
      // Handle RTL for Urdu specifically
      const lang = LANGUAGES_22.find((l) => l.code === selectedLangCode)
      if (lang?.code === "urd") {
        // basic RTL hint
        // @ts-expect-error: direction is supported in canvas typings in modern browsers
        ctx.direction = "rtl"
      } else {
        // @ts-expect-error
        ctx.direction = "ltr"
      }

      // Word wrap
      const lines: string[] = []
      const words = resultText.split(/\s+/)
      let current = ""
      for (const w of words) {
        const test = current ? `${current} ${w}` : w
        const width = ctx.measureText(test).width
        if (width <= maxWidth) {
          current = test
        } else {
          if (current) lines.push(current)
          // If single word is too long, push it alone to avoid infinite loop
          current = w
        }
      }
      if (current) lines.push(current)

      // Compute text block height
      const lineHeight = Math.round(baseFont * 1.35)
      const textHeight = lines.length * lineHeight + pad
      const barHeight = textHeight + pad

      // Background bar
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight)

      // Text
      ctx.fillStyle = "#ffffff"
      const startY = canvas.height - barHeight + pad
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const measured = ctx.measureText(line).width
        // Center horizontally, with RTL handled via direction and alignment
        if (lang?.code === "urd") {
          ctx.textAlign = "center"
          ctx.fillText(line, canvas.width / 2, startY + i * lineHeight)
        } else {
          ctx.textAlign = "center"
          ctx.fillText(line, canvas.width / 2, startY + i * lineHeight)
        }
      }

      const dataUrl = canvas.toDataURL("image/png")
      setGeneratedImageUrl(dataUrl)
    } catch (err: any) {
      console.error("[v0] Render overlay error:", err?.message || err)
    }
  }, [imageUrl, resultText, selectedLangCode])

  const handleDownloadImage = useCallback(() => {
    if (!generatedImageUrl) return
    const lang = LANGUAGES_22.find((l) => l.code === selectedLangCode)
    const slug = lang?.slug || "selected"
    downloadDataUrl(generatedImageUrl, `transliteration-overlay-${slug}.png`)
  }, [generatedImageUrl, selectedLangCode])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1) Capture or Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={handlePickImage} className="inline-flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Use Camera / Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {imageUrl ? (
            <div className="rounded-md border p-2">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt="Captured road sign"
                width={1200}
                height={800}
                className="h-auto w-full rounded"
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No image selected yet.</p>
          )}
          {isOcrRunning && (
            <div className="space-y-2">
              <Label className="text-sm">OCR in progress… {ocrProgress}%</Label>
              <Progress value={ocrProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2) Choose Target Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="target">Target language and script</Label>
          <Select value={selectedLangCode} onValueChange={setSelectedLangCode}>
            <SelectTrigger id="target" className="w-full md:w-80">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES_22.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name} — {l.script}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3) Review OCR Text (English)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="ocrText">Detected Text</Label>
          <Textarea
            id="ocrText"
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Detected English text will appear here for review and edits before transliteration."
            className="min-h-32"
          />
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleTransliterate} disabled={!ocrText.trim() || isTransliterating}>
              {isTransliterating ? "Transliterating…" : "Transliterate to Selected Language"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultText && (
        <Card>
          <CardHeader>
            <CardTitle>4) Result (Strict Transliteration)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground mb-1">
                {LANGUAGES_22.find((l) => l.code === selectedLangCode)?.name}
              </div>
              <div className="whitespace-pre-wrap">{resultText}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportSelectedJson}
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
              <Button
                type="button"
                onClick={handleRenderOnImage}
                className="inline-flex items-center gap-2"
                disabled={!imageUrl}
              >
                <ImageDown className="h-4 w-4" />
                Render on Image
              </Button>
            </div>
            {generatedImageUrl && (
              <div className="space-y-2">
                <div className="rounded-md border p-2">
                  <Image
                    src={generatedImageUrl || "/placeholder.svg"}
                    alt="Transliteration overlay preview"
                    width={1200}
                    height={800}
                    className="h-auto w-full rounded"
                  />
                </div>
                <Button type="button" onClick={handleDownloadImage} className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PNG
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
