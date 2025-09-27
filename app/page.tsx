import TransliteratorApp from "@/components/transliterator-app"

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Indian Road Sign Transliteration</h1>
        <p className="text-muted-foreground mt-1 text-pretty">
          Capture a road sign with your camera, OCR the English text, and get a strict transliteration in your selected
          Indian language. Optionally render the transliterated text onto the image and download the result.
        </p>
      </header>
      <TransliteratorApp />
    </main>
  )
}
