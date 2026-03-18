import React from "react";
import { FaceResult, UploadedImage } from "../types";

interface Props {
  uploads: UploadedImage[];
  primaryFaceKey: string | null;          // "imageId:faceIndex"
  onSelectFace: (key: string) => void;
  onRemoveImage: (imageId: string) => void;
}

export default function FaceSelector({
  uploads,
  primaryFaceKey,
  onSelectFace,
  onRemoveImage,
}: Props) {
  if (uploads.length === 0) return null;

  return (
    <div className="space-y-5">
      {uploads.map((upload) => (
        <div key={upload.id} className="bg-stone-900 rounded-2xl p-4 space-y-3">
          {/* Image header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={upload.previewUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <span className="text-stone-400 text-sm truncate">{upload.file.name}</span>
            </div>
            <button
              onClick={() => onRemoveImage(upload.id)}
              className="p-1 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
              title="Remove"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Faces */}
          {upload.faces.length === 0 ? (
            <p className="text-red-400/80 text-xs px-1">No face detected in this photo.</p>
          ) : (
            <div>
              {upload.faces.length > 1 && (
                <p className="text-stone-500 text-xs mb-2 px-1">
                  {upload.faces.length} faces detected — tap to select the primary face:
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {upload.faces.map((face) => {
                  const key = `${upload.id}:${face.face_index}`;
                  const selected = primaryFaceKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onSelectFace(key)}
                      className={`
                        relative rounded-xl overflow-hidden border-2 transition-all duration-150
                        ${selected
                          ? "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
                          : "border-stone-700 hover:border-stone-500"}
                      `}
                      title={`Confidence: ${(face.confidence * 100).toFixed(0)}%`}
                    >
                      <img
                        src={`data:image/jpeg;base64,${face.crop_b64}`}
                        alt={`Face ${face.face_index + 1}`}
                        className="w-16 h-16 object-cover"
                      />
                      {selected && (
                        <div className="absolute inset-0 bg-amber-400/10 flex items-end justify-center pb-1">
                          <span className="text-amber-300 text-[10px] font-semibold bg-stone-900/80 px-1 rounded">
                            PRIMARY
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
