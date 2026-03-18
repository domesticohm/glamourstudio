export interface JobStatus {
  job_id:   string;
  status:   "queued" | "running" | "done" | "error";
  progress: number;
  message:  string;
  error?:   string | null;
}
