import React, { useCallback, useState } from "react";
import UploadZone from "./components/UploadZone";
import OutputPreview from "./components/OutputPreview";
import { JobStatus } from "./types";

type Stage = "upload" | "generating" | "done" | "error";
type Vibe  = "glamour" | "school";

const VIBES: { value: Vibe; label: string }[] = [
  { value: "glamour", label: "✦ Glamour Studio" },
  { value: "school",  label: "📸 1990s School Photo" },
];

const POLL_MS = 1500;

export default function App() {
  const [vibe, setVibe]           = useState<Vibe>("glamour");
  const [stage, setStage]         = useState<Stage>("upload");
  const [preview, setPreview]     = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];

    setPreview(URL.createObjectURL(file));
    setStage("generating");
    setJobStatus(null);
    setResultUrl(null);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("vibe", vibe);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail ?? "Failed to start generation");
      }
      const { job_id } = await res.json();

      const poll = setInterval(async () => {
        const sr = await fetch(`/api/status/${job_id}`);
        const status: JobStatus = await sr.json();
        setJobStatus(status);

        if (status.status === "done") {
          clearInterval(poll);
          setResultUrl(`/api/result/${job_id}`);
          setStage("done");
        } else if (status.status === "error") {
          clearInterval(poll);
          setError(status.error ?? "Generation failed");
          setStage("error");
        }
      }, POLL_MS);
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  }, [vibe]);

  const handleReset = () => {
    setStage("upload");
    setPreview(null);
    setJobStatus(null);
    setResultUrl(null);
    setError(null);
  };

  const isGlamour = vibe === "glamour";

  return (
    <div
      className={`min-h-screen flex flex-col items-center py-12 px-4 transition-all duration-700 ${
        isGlamour ? "bg-glamour text-amber-50" : "bg-school text-white"
      }`}
    >
      {/* Sticky vibe selector */}
      <div className={`sticky top-0 z-10 w-full backdrop-blur border-b py-3 px-4 mb-8 transition-all duration-700 ${
        isGlamour
          ? "bg-black/80 border-amber-900/40"
          : "bg-[#0d0b2a]/85 border-[#ff2d78]/30"
      }`}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <label className={`text-sm font-medium whitespace-nowrap ${
            isGlamour ? "font-cinzel text-amber-600 tracking-widest uppercase text-xs" : "font-fredoka text-[#00d4ff] text-base"
          }`}>
            {isGlamour ? "Choose Your Vibe" : "Choose Your Vibe"}
          </label>
          <select
            value={vibe}
            onChange={e => setVibe(e.target.value as Vibe)}
            disabled={stage === "generating"}
            className={`flex-1 text-sm rounded-xl px-3 py-2 appearance-none cursor-pointer
                       focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isGlamour
                ? "bg-[#110810] border border-amber-900/50 text-amber-200 focus:ring-2 focus:ring-amber-700/50 hover:border-amber-700/60"
                : "bg-[#120d2e] border-2 border-[#ff2d78]/60 text-white focus:ring-2 focus:ring-[#ff2d78]/50 hover:border-[#ff2d78]"
            }`}
          >
            {VIBES.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        {isGlamour ? (
          <>
            <h1 className="font-cinzel text-4xl font-bold tracking-[0.15em] uppercase"
                style={{ color: "#d4a520", textShadow: "0 0 30px #d4a52060, 0 2px 4px #000" }}>
              GlamourStudio
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/60" />
              <p className="text-amber-700/80 text-xs font-cinzel tracking-widest uppercase">
                1970s · 1980s · Double Exposure
              </p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/60" />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-fredoka text-4xl"
                style={{ color: "#ff2d78", textShadow: "0 0 20px #ff2d7880, 0 0 40px #ff2d7840, 2px 2px 0 #00d4ff" }}>
              GlamourStudio
            </h1>
            <p className="font-fredoka text-[#00d4ff] text-lg mt-1"
               style={{ textShadow: "0 0 10px #00d4ff60" }}>
              📷 1990s School Photo Edition 📷
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {["★","★","★","★","★"].map((s, i) => (
                <span key={i} className="text-[#a3ff00] text-sm">★</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="w-full max-w-md space-y-6">
        {stage === "upload" && (
          <UploadZone onFiles={handleFile} vibe={vibe} />
        )}

        {(stage === "generating" || stage === "done" || stage === "error") && (
          <OutputPreview
            preview={preview}
            jobStatus={jobStatus}
            resultUrl={resultUrl}
            error={error}
            onReset={handleReset}
            vibe={vibe}
          />
        )}
      </div>
    </div>
  );
}
