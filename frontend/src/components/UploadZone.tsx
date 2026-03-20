import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onFiles:   (files: File[]) => void;
  loading?:  boolean;
  disabled?: boolean;
  vibe?:     "glamour" | "school";
}

export default function UploadZone({ onFiles, loading, disabled, vibe = "glamour" }: Props) {
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

  const isGlamour = vibe === "glamour";

  return (
    <div
      {...getRootProps()}
      className={`
        relative rounded-2xl border-2 border-dashed p-10 text-center
        transition-all duration-300 cursor-pointer
        ${isGlamour
          ? isDragActive
            ? "border-amber-500 bg-amber-900/10 gold-glow"
            : "border-amber-900/50 bg-[#0e080e]/60 hover:border-amber-700/70 hover:bg-[#110a11]/80"
          : isDragActive
            ? "border-[#ff2d78] bg-[#ff2d78]/10 neon-pink"
            : "border-[#ff2d78]/40 bg-[#120d2e]/60 hover:border-[#ff2d78]/80 hover:neon-pink"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      style={isGlamour ? {} : { boxShadow: isDragActive ? "0 0 20px #ff2d7850" : undefined }}
    >
      <input {...getInputProps()} />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
            isGlamour ? "border-amber-500" : "border-[#ff2d78]"
          }`} />
          <p className={isGlamour ? "text-amber-700 text-sm" : "font-fredoka text-[#00d4ff] text-sm"}>
            Detecting face…
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {isGlamour ? (
            <svg className="w-10 h-10 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          ) : (
            <div className="text-4xl">📸</div>
          )}
          <div>
            <p className={`font-medium ${
              isGlamour
                ? "font-cinzel text-amber-300/80 tracking-wider text-sm uppercase"
                : "font-fredoka text-white text-xl"
            }`}>
              {isDragActive ? "Drop it here!" : "Upload Your Photo"}
            </p>
            <p className={`mt-1 text-xs ${
              isGlamour ? "text-amber-900/70" : "font-fredoka text-[#00d4ff]/70 text-sm"
            }`}>
              {isGlamour
                ? "Selfie, headshot, or portrait · any clear photo"
                : "Any photo with your face works! 🌟"}
            </p>
          </div>
          {!isGlamour && (
            <div className="flex gap-2 text-xs">
              {["JPG", "PNG", "WEBP"].map(f => (
                <span key={f} className="px-2 py-0.5 rounded-full font-fredoka"
                      style={{ background: "#1a0f3a", border: "1px solid #ff2d7860", color: "#ff2d78" }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
