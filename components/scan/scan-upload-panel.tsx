"use client"

import { IconLock, IconPhoto, IconSparkles } from "@tabler/icons-react"

import {
  createFileUploadItem,
  FileUpload,
  type FileUploadItem,
} from "@/components/motion/file-upload"
import type { CaptureMode } from "@/lib/scan/types"

type ScanUploadPanelProps = {
  onImageSelected: (file: File, previewUrl: string, source: CaptureMode) => void
}

const QUALITY_NOTES = [
  { icon: IconPhoto, label: "JPG or PNG, 1024px+" },
  { icon: IconSparkles, label: "Soft, even front light" },
  { icon: IconLock, label: "Analyzed in memory, never stored" },
] as const

export function ScanUploadPanel({ onImageSelected }: ScanUploadPanelProps) {
  const handleFilesAdded = (added: FileUploadItem[], files: File[]) => {
    const file = files[0]
    const item = added[0]
    if (!file || !item) return

    const previewUrl = URL.createObjectURL(file)
    onImageSelected(file, previewUrl, "upload")
  }

  return (
    <div className="space-y-3">
      <FileUpload
        accept="image/*"
        multiple={false}
        maxFiles={1}
        variant="centered"
        title="Drop your photo here"
        description="A clear, well-lit photo with your face fully visible"
        browseLabel="Browse photos"
        onFilesAdded={handleFilesAdded}
        defaultValue={[]}
        classNames={{
          dropzone:
            "min-h-72 rounded-[1.75rem] border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-muted/30 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5",
        }}
      />

      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1 pb-0.5">
        {QUALITY_NOTES.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Icon className="size-3.5 shrink-0 text-primary/70" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function createScanUploadItem(file: File): FileUploadItem {
  return {
    ...createFileUploadItem(file),
    progress: 100,
    status: "success",
  }
}
