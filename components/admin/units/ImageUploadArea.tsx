"use client";

import * as React from "react";
import { generateCloudinarySignature, saveUnitPhoto } from "@/actions/media";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, ImagePlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB hard ceiling
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const isValidImageType = (file: File) => {
  if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
};

export interface ImageUploadAreaProps {
  unitId: string;
  onUploadSuccess: () => void;
  className?: string;
}

export function ImageUploadArea({
  unitId,
  onUploadSuccess,
  className,
}: ImageUploadAreaProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const processUploadQueue = async (files: File[]) => {
    if (files.length === 0) return;

    // 1. Client-Side Validation: Check format & 3MB size limit before ANY network dispatch
    const validFiles: File[] = [];

    for (const file of files) {
      if (!isValidImageType(file)) {
        toast.error(
          `Invalid file format: "${file.name}". Only JPEG, PNG, and WebP are supported.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(
          `File too large: "${file.name}" is ${sizeMb}MB. Maximum allowed photo size is 3MB.`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      // 2. Sequential upload pipeline directly to Cloudinary REST
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress({
          current: i + 1,
          total: validFiles.length,
          fileName: file.name,
        });

        // Step A: Request signature from server action
        const sigRes = await generateCloudinarySignature({
          folder: "parlak_resort/units",
        });

        if (!sigRes.success || !sigRes.data) {
          throw new Error(
            sigRes.error || "Failed to generate Cloudinary signature"
          );
        }

        const { apiKey, timestamp, signature, cloudName, folder } = sigRes.data;

        // Step B: Upload file directly to Cloudinary REST endpoint
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp.toString());
        formData.append("signature", signature);
        if (folder) {
          formData.append("folder", folder);
        }

        const cloudinaryEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const uploadResponse = await fetch(cloudinaryEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json().catch(() => null);
          throw new Error(
            errData?.error?.message ||
              `Cloudinary upload failed with status ${uploadResponse.status}`
          );
        }

        const uploadResult = await uploadResponse.json();
        const secureUrl = uploadResult.secure_url;

        if (!secureUrl) {
          throw new Error("Cloudinary response did not return a secure URL");
        }

        // Step C: Save photo metadata in PostgreSQL via server action
        const saveRes = await saveUnitPhoto({
          unitId,
          url: secureUrl,
          caption: file.name.replace(/\.[^/.]+$/, ""),
        });

        if (!saveRes.success) {
          throw new Error(saveRes.error || "Failed to save photo in database");
        }

        successCount++;
      }

      toast.success(
        successCount === 1
          ? "Photo uploaded successfully."
          : `${successCount} photos uploaded successfully.`
      );
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete upload queue");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    processUploadQueue(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processUploadQueue(files);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.005]"
            : "border-border hover:border-primary/40 hover:bg-muted/30 bg-muted/10",
          isUploading && "pointer-events-none opacity-70 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading && uploadProgress ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-3 ring-1 ring-primary/20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Uploading {uploadProgress.current} of {uploadProgress.total} photos...
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs font-mono">
                {uploadProgress.fileName}
              </div>
            </div>
            <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-center">
            <div className="rounded-full bg-muted p-3 ring-1 ring-border group-hover:scale-105 transition-transform duration-150">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Drag & drop photos here, or browse
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Max 3MB per file · JPEG, PNG, or WebP · Direct Cloudinary REST pipeline
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs pointer-events-none"
              >
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                Select Files
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>The first uploaded photo is automatically set as the Featured Cover.</span>
        <span className="font-mono">Max: 3.0 MB / photo</span>
      </div>
    </div>
  );
}
