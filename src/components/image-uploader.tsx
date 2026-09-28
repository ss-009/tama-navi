"use client";

import { useRef, useState, useTransition } from "react";
import { removeTeamImage, uploadTeamImage } from "@/server/actions/teams";
import { buttonClass } from "./ui";

const SIZES = {
  logo: { width: 320, height: 320 },
  cover: { width: 1200, height: 400 },
} as const;

/** 中央を切り抜いて縮小し、data URL にする（WebP が使えなければ JPEG） */
async function resize(file: File, kind: keyof typeof SIZES): Promise<string> {
  const { width, height } = SIZES[kind];
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

export function ImageUploader({ teamId, kind, currentUrl }: { teamId: string; kind: "logo" | "cover"; currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = kind === "logo" ? "ロゴ" : "カバー画像";

  return (
    <div className="space-y-2">
      <div
        className={`overflow-hidden border border-dashed border-ink/20 bg-[#f5f7fb] ${kind === "logo" ? "size-28 rounded-2xl" : "aspect-[3/1] w-full rounded-xl"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 自前の画像配信なので最適化は不要
          <img src={preview} alt={label} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-bold text-ink/40">{label}なし</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError(null);
          startTransition(async () => {
            try {
              const dataUrl = await resize(file, kind);
              const result = await uploadTeamImage({ teamId, kind, dataUrl });
              if (result.ok) setPreview(dataUrl);
              else setError(result.error);
            } catch {
              setError("画像を読み込めませんでした。別の画像を選んでください");
            }
          });
        }}
      />
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className={buttonClass("secondary", "sm")}>
          {pending ? "アップロード中…" : preview ? `${label}を変更` : `${label}を選ぶ`}
        </button>
        {preview && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`${label}を削除しますか？`)) return;
              startTransition(async () => {
                const result = await removeTeamImage({ teamId, kind });
                if (result.ok) setPreview(null);
                else setError(result.error);
              });
            }}
            className={buttonClass("danger", "sm")}
          >
            削除
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-hit">{error}</p>}
    </div>
  );
}
