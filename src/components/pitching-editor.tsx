"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatInnings, MAX_OUTS_PER_GAME, PITCHING_DECISION_LABELS, type PitchingDecision } from "@/domain/pitching";
import { savePitching } from "@/server/actions/pitching";
import { BottomSheet } from "./bottom-sheet";
import { TAB_BAR_HEIGHT } from "./bottom-tabs";
import { Stepper } from "./stepper";
import { buttonClass, EmptyState } from "./ui";

export type PitchingRowState = {
  playerId: string;
  outs: number;
  hits: number;
  strikeouts: number;
  walks: number;
  hitByPitch: number;
  runs: number;
  earnedRuns: number;
  decision: PitchingDecision | null;
};

type NumberKey = Exclude<keyof PitchingRowState, "playerId" | "decision" | "outs">;
const FIELDS: { key: NumberKey; label: string }[] = [
  { key: "hits", label: "被安打" },
  { key: "strikeouts", label: "奪三振" },
  { key: "walks", label: "与四球" },
  { key: "hitByPitch", label: "与死球" },
  { key: "runs", label: "失点" },
  { key: "earnedRuns", label: "自責点" },
];

const empty = (playerId: string): PitchingRowState => ({
  playerId,
  outs: 0,
  hits: 0,
  strikeouts: 0,
  walks: 0,
  hitByPitch: 0,
  runs: 0,
  earnedRuns: 0,
  decision: null,
});

export function PitchingEditor({
  teamId,
  gameId,
  initialUpdatedAt,
  candidates,
  initialRows,
}: {
  teamId: string;
  gameId: string;
  initialUpdatedAt: string;
  candidates: { id: string; displayName: string }[];
  initialRows: PitchingRowState[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const nameOf = new Map(candidates.map((c) => [c.id, c.displayName]));

  function update(next: PitchingRowState[]) {
    setRows(next);
    setDirty(true);
    setMessage(null);
  }
  const patch = (i: number, p: Partial<PitchingRowState>) => update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  function save() {
    startTransition(async () => {
      const result = await savePitching({ teamId, gameId, expectedUpdatedAt: updatedAt, rows });
      if (result.ok) {
        setUpdatedAt(result.data.updatedAt);
        setDirty(false);
        setMessage({ ok: true, text: "保存しました" });
        router.refresh();
      } else if (result.code === "conflict") {
        if (window.confirm("他の人が先にこの試合を保存しています。最新を読み込みますか？（この画面の変更は消えます）")) {
          window.location.reload();
        }
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  if (candidates.length === 0) {
    return <EmptyState>先に打順（出場記録）を登録してください。投手は出場した選手から選びます</EmptyState>;
  }

  return (
    <>
      <div className="space-y-3">
        {rows.length === 0 && <EmptyState>まだ投手がいません。「投手を追加」から先発投手を選んでください</EmptyState>}
        {rows.map((r, i) => (
          <section key={r.playerId} className="panel space-y-2 rounded-2xl bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">{i === 0 ? "先発" : `${i + 1}番手`}</span>
              <span className="min-w-0 flex-1 truncate text-lg font-bold">{nameOf.get(r.playerId) ?? "?"}</span>
              {i > 0 && (
                <button
                  type="button"
                  aria-label="登板順を上げる"
                  onClick={() => update(rows.map((x, j) => (j === i - 1 ? rows[i]! : j === i ? rows[i - 1]! : x)))}
                  className="pop-sm size-10 rounded-full bg-white font-bold"
                >
                  ↑
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`${nameOf.get(r.playerId)} さんの記録を外しますか？`)) update(rows.filter((_, j) => j !== i));
                }}
                className="pop-sm min-h-10 rounded-full bg-white px-3 text-sm font-bold text-hit"
              >
                外す
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 py-1">
              <span className="font-bold">投球回</span>
              <div className="flex items-center gap-2">
                <button type="button" className="pop-sm size-12 rounded-xl bg-white text-sm font-bold disabled:opacity-40" disabled={r.outs <= 0} onClick={() => patch(i, { outs: r.outs - 1 })}>
                  −⅓
                </button>
                <span className="w-16 text-center text-xl font-bold tabular">{formatInnings(r.outs)}</span>
                <button type="button" className="pop-sm size-12 rounded-xl bg-white text-sm font-bold disabled:opacity-40" disabled={r.outs >= MAX_OUTS_PER_GAME} onClick={() => patch(i, { outs: r.outs + 1 })}>
                  +⅓
                </button>
                <button type="button" className="pop-sm size-12 rounded-xl bg-brand-600 text-sm font-bold text-white disabled:opacity-40" disabled={r.outs + 3 > MAX_OUTS_PER_GAME} onClick={() => patch(i, { outs: r.outs + 3 })}>
                  +1回
                </button>
              </div>
            </div>
            <div className="divide-y divide-ink/5">
              {FIELDS.map((f) => (
                <Stepper key={f.key} label={f.label} value={r[f.key]} max={99} onChange={(v) => patch(i, { [f.key]: v })} />
              ))}
            </div>
            <div>
              <span className="mb-1 block text-sm font-bold">勝敗</span>
              <div className="grid grid-cols-5 gap-2">
                {([null, "win", "loss", "save", "hold"] as const).map((d) => (
                  <button
                    key={d ?? "none"}
                    type="button"
                    onClick={() => patch(i, { decision: d })}
                    className={`pop-sm min-h-11 rounded-xl text-sm font-bold ${r.decision === d ? "bg-brand-600 text-white" : "bg-white"}`}
                  >
                    {d ? PITCHING_DECISION_LABELS[d] : "なし"}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ))}
        <button type="button" onClick={() => setPicking(true)} className={buttonClass("secondary", "lg", "w-full")}>
          ＋ 投手を追加
        </button>
      </div>

      <div className="h-24" aria-hidden />
      <div
        className="fixed inset-x-0 z-40 border-t border-ink/10 bg-white px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{ bottom: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {message && (
              <span role={message.ok ? "status" : "alert"} className={`font-bold ${message.ok ? "text-grass-dark" : "text-hit"}`}>
                {message.text}
              </span>
            )}
          </div>
          <button type="button" onClick={save} disabled={pending || !dirty} className={buttonClass("primary", "lg", "min-w-32")}>
            {pending ? "保存中…" : dirty ? "保存" : "保存済み"}
          </button>
        </div>
      </div>

      <BottomSheet open={picking} onClose={() => setPicking(false)} title="投手を選ぶ">
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {candidates
            .filter((c) => !rows.some((r) => r.playerId === c.id))
            .map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    update([...rows, empty(c.id)]);
                    setPicking(false);
                  }}
                  className="pop-sm flex min-h-12 w-full items-center rounded-xl bg-white px-3 text-left font-bold"
                >
                  <span className="truncate">{c.displayName}</span>
                </button>
              </li>
            ))}
        </ul>
      </BottomSheet>
    </>
  );
}
