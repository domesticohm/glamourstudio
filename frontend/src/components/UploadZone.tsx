import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onFiles:   (files: File[]) => void;
  loading?:  boolean;
  disabled?: boolean;
}

export default function UploadZone({ onFiles, loading, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted.length) onFiles(accepted); },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative rounded-2xl border-2 border-dashed p-10 text-center
        transition-colors duration-200 cursor-pointer
        ${isDragActive
          ? "border-amber-400 bg-amber-400/5"
          : "border-stone-700 hover:border-stone-500 bg-stone-900/50"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm">Detecting face…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg className="w-10 h-10 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <div>
            <p className="text-stone-300 font-medium">
              {isDragActive ? "Drop your photo here" : "Upload your photo"}
            </p>
            <p className="text-stone-500 text-xs mt-1">
              Selfie, headshot, or full-body — any photo with your face
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
