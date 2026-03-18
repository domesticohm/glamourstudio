import React, { useCallback, useState } from "react";
import UploadZone from "./components/UploadZone";
import OutputPreview from "./components/OutputPreview";
import { JobStatus } from "./types";

type Stage = "upload" | "generating" | "done" | "error";
type Vibe  = "glamour" | "school";

const VIBES: { value: Vibe; label: string }[] = [
  { value: "glamour", label: "Glamour Studio" },
  { value: "school",  label: "1990s School Photo" },
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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center py-12 px-4">
      {/* Sticky vibe selector */}
      <div className="sticky top-0 z-10 w-full bg-stone-950/90 backdrop-blur border-b border-stone-800/60 py-3 px-4 mb-8">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <label className="text-stone-400 text-sm font-medium whitespace-nowrap">
            Choose Your Vibe
          </label>
          <select
            value={vibe}
            onChange={e => setVibe(e.target.value as Vibe)}
            disabled={stage === "generating"}
            className="flex-1 bg-stone-900 border border-stone-700 text-stone-200 text-sm
                       rounded-xl px-3 py-2 appearance-none cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-amber-500/50
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:border-stone-500 transition-colors"
          >
            {VIBES.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-amber-400">GlamourStudio</h1>
        <p className="text-stone-500 text-sm mt-1">
          {vibe === "glamour"
            ? "Upload any photo · AI generates your 1970s double-exposure portrait"
            : "Upload any photo · AI generates your 1990s school portrait"}
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {stage === "upload" && (
          <UploadZone onFiles={handleFile} />
        )}

        {(stage === "generating" || stage === "done" || stage === "error") && (
          <OutputPreview
            preview={preview}
            jobStatus={jobStatus}
            resultUrl={resultUrl}
            error={error}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
