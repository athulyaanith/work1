"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

type Props = {
  onImage: (file: File) => void
}

export default function CameraCapture({ onImage }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [streamActive, setStreamActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStreamActive(true)
        }
      } catch (e: any) {
        setError("Camera unavailable. You can upload an image instead.")
        setStreamActive(false)
      }
    }
    start()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((t) => t.stop())
      }
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.png", { type: "image/png" })
        onImage(file)
      }
    }, "image/png")
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onImage(f)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border p-3 flex flex-col gap-3">
        {streamActive ? (
          <div className="flex flex-col gap-2">
            <video ref={videoRef} playsInline muted className="w-full rounded" aria-label="Camera preview" />
            <button type="button" onClick={capture} className="px-4 py-2 rounded bg-primary text-primary-foreground">
              Capture
            </button>
          </div>
        ) : (
          <div className="text-sm opacity-80">{error || "Camera not started."}</div>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="upload" className="text-sm">
            Or upload image:
          </label>
          <input id="upload" type="file" accept="image/*" onChange={onUpload} />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
