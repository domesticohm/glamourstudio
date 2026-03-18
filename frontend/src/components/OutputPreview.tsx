import React from "react";
import { JobStatus } from "../types";

interface Props {
  preview:   string | null;
  jobStatus: JobStatus | null;
  resultUrl: string | null;
  error:     string | null;
  onReset:   () => void;
}

const PHASES = [
  { label: "Analyzing face",       threshold: 40  },
  { label: "Generating portrait",  threshold: 85  },
  { label: "Verifying likeness",   threshold: 100 },
];

function PhaseIndicator({ progress }: { progress: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {PHASES.map((p, i) => {
        const done    = progress >= p.threshold;
        const active  = !done && progress >= (PHASES[i - 1]?.threshold ?? 0);
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              done   ? "bg-amber-400" :
              active ? "bg-amber-400 animate-pulse" :
                       "bg-stone-700"
            }`} />
            <span className={`text-xs ${
              done || active ? "text-stone-300" : "text-stone-600"
            }`}>{p.label}</span>
            {i < PHASES.length - 1 && (
              <div className={`w-6 h-px ${done ? "bg-amber-600" : "bg-stone-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OutputPreview({ preview, jobStatus, resultUrl, error, onReset }: Props) {
  const isRunning = !resultUrl && !error;
  const progress  = jobStatus?.progress ?? 0;

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
        <div className="bg-stone-900 rounded-2xl p-5 space-y-4">
          {/* Phase indicators */}
          <PhaseIndicator progress={progress} />

          {/* Message + percentage */}
          <div className="flex items-center justify-between">
            <span className="text-stone-400 text-sm">{jobStatus?.message ?? "Starting…"}</span>
            <span className="text-amber-400 text-sm font-medium">{progress}%</span>
          </div>

          {/* Bar */}
          <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700 ${
                progress < 98 ? "animate-pulse" : ""
              }`}
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>

          {/* Reference photo thumbnail */}
          {preview && (
            <div className="flex items-center gap-3 pt-1">
              <img src={preview} alt="Your photo" className="w-10 h-10 rounded-lg object-cover opacity-60" />
              <p className="text-stone-600 text-xs">
                {progress < 40
                  ? "Studying your facial features…"
                  : progress < 85
                  ? "Painting your portrait in 1970s style…"
                  : "Checking that the portrait looks like you…"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-800/50 rounded-2xl p-5 space-y-2">
          <p className="text-red-300 font-medium text-sm">Generation failed</p>
          <p className="text-red-400/80 text-xs font-mono">{error}</p>
          <button
            onClick={onReset}
            className="text-red-300 text-sm underline underline-offset-2 hover:text-red-200 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {resultUrl && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={resultUrl}
              alt="Generated portrait"
              className="w-full object-cover rounded-2xl"
              style={{ maxHeight: "75vh" }}
            />
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(30,20,5,0.4) 100%)" }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2
                         bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         text-stone-950 font-semibold text-sm rounded-xl py-3 px-5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Portrait
            </button>
            <button
              onClick={onReset}
              className="px-4 py-3 rounded-xl text-sm font-medium
                         bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            >
              New Portrait
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
