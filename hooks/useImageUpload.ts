'use client'
import { useState, useCallback } from 'react'

interface UploadedImage {
  url: string
  path: string
}

export function useImageUpload(folder = 'products') {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<UploadedImage | null> => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', folder)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) { setError(data.error); return null }
      return data as UploadedImage
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setUploading(false)
    }
  }, [folder])

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadedImage[]> => {
    const results = await Promise.all(files.map(f => upload(f)))
    return results.filter((r): r is UploadedImage => r !== null)
  }, [upload])

  return { upload, uploadMultiple, uploading, error }
}
