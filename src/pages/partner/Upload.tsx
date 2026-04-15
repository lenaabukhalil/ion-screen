import { useCallback, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadMedia } from '@/services/api'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Upload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const onFile = useCallback((f: File | null) => {
    setFile(f)
    setError('')
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.type.startsWith('image/') || f.type.startsWith('video/'))) {
      onFile(f)
    } else if (f) {
      setError('Please drop an image or video file.')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Please select a file')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title || file.name)
      const res = await uploadMedia(fd)
      if (!res.success) {
        setError(res.message || 'Upload failed')
        return
      }
      setSuccess(true)
    } catch {
      setError('Upload request failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto w-full pt-4">
        <Card className="border border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/40 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Uploaded successfully!</h2>
              <p className="text-sm text-muted-foreground mt-2">Your media is under review.</p>
            </div>
            <Button asChild className="bg-primary">
              <Link to="/">Back to My Media</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto w-full pt-2">
      <Card className="border border-border shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <UploadCloud className="h-10 w-10 text-primary mb-4" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Upload Media</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Images and videos are reviewed before going live
            </p>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2 text-start">
              <Label htmlFor="title" className="text-foreground">
                Title <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a display title"
                className="h-11"
              />
            </div>

            <div className="space-y-2 text-start">
              <Label className="text-foreground">File</Label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              {!file ? (
                <button
                  type="button"
                  onClick={openPicker}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={[
                    'w-full rounded-xl border-2 border-dashed p-10 transition-colors text-center',
                    dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.25} />
                  <p className="text-sm font-medium text-foreground">Drag &amp; drop or click to select</p>
                  <p className="text-xs text-muted-foreground mt-2">Images or videos up to 100MB</p>
                </button>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-start">
                    <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => onFile(null)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!file || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading…
                </>
              ) : (
                <>
                  Submit for Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
