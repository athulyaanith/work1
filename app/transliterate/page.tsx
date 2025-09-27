"use client"

import TransliterateApp from "@/components/transliterate-app"

export default function Page() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-start p-6 gap-6">
      <header className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-pretty">Camera Transliteration (22 Languages)</h1>
        <p className="text-sm opacity-80 mt-1">
          Capture or upload a road sign, choose your target language, and get the image back with transliterated text
          overlaid automatically.
        </p>
      </header>
      <section className="w-full max-w-3xl">
        <TransliterateApp />
      </section>
    </main>
  )
}
