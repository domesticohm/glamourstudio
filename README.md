# GlamourStudio — Vintage Portrait Generator

Generate 1970s–1980s double-exposure studio portraits with your exact face preserved.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Uvicorn |
| Face detection | InsightFace `buffalo_l` (ArcFace) |
| Generation | Stable Diffusion XL + IP-Adapter FaceID SDXL |

---

## Requirements

- **Python 3.10+**
- **Node.js 18+**
- **NVIDIA GPU** with ≥ 10 GB VRAM (RTX 3080 / A10 or better recommended)
  - CPU-only mode works but will be very slow (~10–30 min/image)
- CUDA 12.1 drivers

---

## Quick Setup (Windows)

```bat
double-click setup.bat
```

Or manually:

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate

# PyTorch with CUDA 12.1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Project deps
pip install -r requirements.txt

# IP-Adapter library
pip install git+https://github.com/tencent-ailab/IP-Adapter.git
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running

**Terminal 1 — Backend**
```bash
cd backend
.venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**

---

## First Run

On first run, the backend will automatically download:

| Model | Size | Source |
|---|---|---|
| InsightFace `buffalo_l` | ~300 MB | insightface hub |
| SDXL base `stabilityai/stable-diffusion-xl-base-1.0` | ~7 GB | HuggingFace |
| SDXL fp16 VAE `madebyollin/sdxl-vae-fp16-fix` | ~330 MB | HuggingFace |
| IP-Adapter FaceID SDXL `h94/IP-Adapter-FaceID` | ~580 MB | HuggingFace |

Total: ~8–9 GB. Downloads are cached in `~/.cache/huggingface/`.

---

## How It Works

```
User uploads 1–3 photos
        │
        ▼
InsightFace buffalo_l
  – Detects all faces
  – Extracts 512-dim ArcFace embedding per face
  – Crops face thumbnails for selection UI
        │
        ▼
User selects primary face
(+ optional secondary images → embeddings averaged)
        │
        ▼
IP-Adapter FaceID SDXL
  – Face embedding injected into cross-attention layers
  – SDXL generates body / pose / composition
  – Face identity locked to reference embedding
        │
        ▼
4:5 portrait (832×1024 px)
PNG download
```

### Why IP-Adapter FaceID?

Standard img2img or ControlNet alter facial geometry. IP-Adapter FaceID operates in embedding space — it conditions on *who* the person is (ArcFace identity vector), not pixel-level appearance, which means the generated face matches the reference without being a photocopy.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/detect-faces` | Upload 1–3 images, returns face crops + embeddings |
| POST | `/api/generate` | Start generation job, returns `{ job_id }` |
| GET | `/api/status/{id}` | Poll progress: `queued / running / done / error` |
| GET | `/api/result/{id}` | Download finished PNG |

---

## CPU-only Mode

In `backend/requirements.txt`, swap:
```
onnxruntime-gpu  →  onnxruntime
```

And in `backend/generator.py` remove the `xformers` call. Generation will use CPU (~15–30 min per image).

---

## Customising the Style Prompt

Edit `POSITIVE_PROMPT` in `backend/generator.py`:

```python
POSITIVE_PROMPT = "A 1970s–1980s vintage double exposure studio portrait ..."
```

Adjust `IP_SCALE` (0.0–1.0) to control how strongly the face embedding guides generation vs. the text prompt. Default is `0.8`.
