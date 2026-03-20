import React from "react";
import { JobStatus } from "../types";

interface Props {
  preview:   string | null;
  jobStatus: JobStatus | null;
  resultUrl: string | null;
  error:     string | null;
  onReset:   () => void;
  vibe?:     "glamour" | "school";
}

const PHASES = [
  { label: "Analyzing face",       threshold: 40  },
  { label: "Generating portrait",  threshold: 85  },
  { label: "Verifying likeness",   threshold: 100 },
];

function PhaseIndicator({ progress, vibe }: { progress: number; vibe: string }) {
  const isGlamour = vibe === "glamour";
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {PHASES.map((p, i) => {
        const done   = progress >= p.threshold;
        const active = !done && progress >= (PHASES[i - 1]?.threshold ?? 0);
        const activeColor = isGlamour ? "#d4a520" : "#ff2d78";
        const doneColor   = isGlamour ? "#d4a520" : "#ff2d78";
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "animate-pulse" : ""}`}
              style={{ background: done || active ? activeColor : isGlamour ? "#2a1a0a" : "#2a1040" }}
            />
            <span className={`text-xs ${
              done || active
                ? isGlamour ? "font-cinzel text-amber-400 tracking-wide" : "font-fredoka text-[#ff2d78]"
                : isGlamour ? "text-stone-700" : "text-[#ffffff30]"
            }`}>{p.label}</span>
            {i < PHASES.length - 1 && (
              <div className="w-5 h-px" style={{ background: done ? doneColor + "60" : isGlamour ? "#2a1a0a" : "#2a1040" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OutputPreview({ preview, jobStatus, resultUrl, error, onReset, vibe = "glamour" }: Props) {
  const isRunning  = !resultUrl && !error;
  const progress   = jobStatus?.progress ?? 0;
  const isGlamour  = vibe === "glamour";

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "glamour_portrait.png";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Progress card */}
      {isRunning && (
        <div className={`rounded-2xl p-5 space-y-4 ${
          isGlamour
            ? "bg-[#0e080e] border border-amber-900/30"
            : "bg-[#120d2e] border border-[#ff2d78]/20"
        }`}>
          <PhaseIndicator progress={progress} vibe={vibe} />

          <div className="flex items-center justify-between">
            <span className={`text-sm ${
              isGlamour ? "font-cinzel text-amber-800 tracking-wider text-xs uppercase" : "font-fredoka text-[#00d4ff]"
            }`}>{jobStatus?.message ?? "Starting…"}</span>
            <span className={`text-sm font-medium ${
              isGlamour ? "font-cinzel text-amber-500" : "font-fredoka text-[#ff2d78]"
            }`}>{progress}%</span>
          </div>

          {/* Bar */}
          <div className={`h-2 rounded-full overflow-hidden ${isGlamour ? "bg-[#1a0d0a]" : "bg-[#1a0f3a]"}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${progress < 98 ? "animate-pulse" : ""}`}
              style={{
                width: `${Math.max(progress, 4)}%`,
                background: isGlamour
                  ? "linear-gradient(to right, #7a4a05, #d4a520)"
                  : "linear-gradient(to right, #ff2d78, #00d4ff)",
                boxShadow: isGlamour ? "0 0 8px #d4a52060" : "0 0 8px #ff2d7880",
              }}
            />
          </div>

          {preview && (
            <div className="flex items-center gap-3 pt-1">
              <img src={preview} alt="Your photo" className="w-10 h-10 rounded-lg object-cover opacity-60" />
              <p className={`text-xs ${isGlamour ? "text-amber-900/60 font-cinzel tracking-wide" : "font-fredoka text-[#00d4ff]/60"}`}>
                {progress < 40
                  ? isGlamour ? "Studying your facial features…" : "Checking out your face! 👀"
                  : progress < 85
                  ? isGlamour ? "Painting your portrait…" : "Making you look SO 90s 😎"
                  : isGlamour ? "Verifying the likeness…" : "Almost done bestie! ✨"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className={`rounded-2xl p-5 space-y-2 ${
          isGlamour
            ? "bg-red-950/40 border border-red-900/40"
            : "bg-[#2a0820] border-2 border-[#ff2d78]/40"
        }`}>
          <p className={`font-medium text-sm ${isGlamour ? "text-red-400" : "font-fredoka text-[#ff2d78] text-base"}`}>
            {isGlamour ? "Generation failed" : "Uh oh! Something went wrong 😬"}
          </p>
          <p className="text-red-400/70 text-xs font-mono">{error}</p>
          <button onClick={onReset} className={`text-sm underline underline-offset-2 transition-colors ${
            isGlamour ? "text-red-400 hover:text-red-300" : "font-fredoka text-[#ff2d78] hover:text-white"
          }`}>
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <div className="space-y-4">
          <div className={`relative rounded-2xl overflow-hidden ${
            isGlamour ? "" : "border-2 border-[#ff2d78]/40"
          }`}
            style={isGlamour ? { boxShadow: "0 0 40px #d4a52018" } : { boxShadow: "0 0 30px #ff2d7830" }}>
            <img
              src={resultUrl}
              alt="Generated portrait"
              className="w-full object-cover rounded-2xl"
              style={{ maxHeight: "75vh" }}
            />
            {isGlamour && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(8,4,8,0.5) 100%)" }}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className={`flex-1 flex items-center justify-center gap-2
                         font-semibold text-sm rounded-xl py-3 px-5 transition-all ${
                isGlamour
                  ? "bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-stone-950 font-cinzel tracking-wider uppercase text-xs"
                  : "font-fredoka text-white text-base"
              }`}
              style={isGlamour
                ? { boxShadow: "0 0 15px #d4a52040" }
                : { background: "linear-gradient(135deg, #ff2d78, #c026a0)", boxShadow: "0 0 15px #ff2d7860" }}
            >
              {isGlamour ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Portrait
                </>
              ) : "⬇️ Save My School Photo!"}
            </button>
            <button
              onClick={onReset}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isGlamour
                  ? "bg-[#180d18] hover:bg-[#220e22] text-amber-800 border border-amber-900/30 font-cinzel tracking-wider uppercase text-xs"
                  : "font-fredoka text-[#00d4ff] border-2 border-[#00d4ff]/40 hover:border-[#00d4ff] bg-[#0d1b2a]"
              }`}
            >
              {isGlamour ? "New Portrait" : "New Photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
