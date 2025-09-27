export type OverlayOptions = {
  direction?: CanvasDirection
  fontFamily?: string
  sizeRatio?: number
  padding?: number
  barHeightRatio?: number
  barColor?: string
  textColor?: string
}

export async function drawOverlay(imgFile: File, text: string, opts: OverlayOptions = {}): Promise<Blob> {
  const {
    direction = "inherit",
    fontFamily = "system-ui, ui-sans-serif, Noto Sans, Arial",
    sizeRatio = 0.055,
    padding = 16,
    barHeightRatio = 0.14,
    barColor = "rgba(0,0,0,0.66)",
    textColor = "#ffffff",
  } = opts

  const imgUrl = URL.createObjectURL(imgFile)
  const img = await loadImage(imgUrl)
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.drawImage(img, 0, 0)

  const barH = Math.max(48, Math.floor(canvas.height * barHeightRatio))
  const yTop = canvas.height - barH
  ctx.fillStyle = barColor
  ctx.fillRect(0, yTop, canvas.width, barH)

  const baseSize = Math.max(18, Math.floor(canvas.width * sizeRatio))
  ctx.font = `${baseSize}px ${fontFamily}`
  ;(ctx as any).direction = direction
  ctx.textBaseline = "middle"
  ctx.fillStyle = textColor

  const maxWidth = canvas.width - padding * 2
  let currentSize = baseSize
  while (ctx.measureText(text).width > maxWidth && currentSize > 12) {
    currentSize -= 2
    ctx.font = `${currentSize}px ${fontFamily}`
  }

  const width = ctx.measureText(text).width
  const x = (canvas.width - width) / 2
  const y = yTop + barH / 2
  ctx.fillText(text, x, y)

  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
