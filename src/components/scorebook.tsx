"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BATTING_RESULT_DEFS,
  type BattingResult,
  type Fielder,
  formatBattingResult,
} from "@/domain/batting-result";
import { MAX_PA_INDEX, MAX_RBI, nextSlot, type ScorebookEntry, slotKey } from "@/domain/scorebook";
import { savePlateAppearances } from "@/server/actions/plate-appearances";
import { BottomSheet } from "./bottom-sheet";
import { TAB_BAR_HEIGHT } from "./bottom-tabs";
import { FieldPicker } from "./field-picker";
import { buttonClass } from "./ui";

export type ScorebookRow = {
  battingOrder: number;
  players: { id: string; displayName: string }[];
};

type Entries = Record<string, ScorebookEntry>;
type Draft = { base: string; entries: ScorebookEntry[]; savedAt: number };
type Step = "result" | "fielder" | "rbi";
type Composing = {
  battingOrder: number;
  paIndex: number;
  playerId: string;
  result: BattingResult | null;
  fielder: Fielder | null;
  inning: number | null;
  step: Step;
};

const RESULT_GROUPS: { label: string; tone: string; results: BattingResult[] }[] = [
  { label: "ヒット", tone: "bg-red-50 text-red-700", results: ["single", "double", "triple", "home_run"] },
  { label: "アウト", tone: "bg-brand-50 text-brand-800", results: ["groundout", "flyout", "lineout", "double_play", "strikeout", "strikeout_reached"] },
  { label: "四死球", tone: "bg-amber-50 text-amber-800", results: ["walk", "hit_by_pitch", "intentional_walk"] },
  { label: "その他", tone: "bg-white text-ink", results: ["sac_bunt", "sac_fly", "reached_on_error", "fielders_choice", "interference"] },
];


const toEntries = (list: readonly ScorebookEntry[]): Entries =>
  Object.fromEntries(list.map((e) => [slotKey(e.battingOrder, e.paIndex), e]));

const sameEntries = (a: Entries, b: Entries) => {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
};

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

export function Scorebook({
  teamId,
  gameId,
  initialUpdatedAt,
  rows,
  initialEntries,
  scheduledInnings,
  defaultMarkFinal,
  isFinal,
}: {
  teamId: string;
  gameId: string;
  initialUpdatedAt: string;
  rows: ScorebookRow[];
  initialEntries: ScorebookEntry[];
  scheduledInnings: number;
  defaultMarkFinal: boolean;
  isFinal: boolean;
}) {
  const router = useRouter();
  const draftKey = `tama-navi:scorebook-draft:${gameId}`;
  const [serverEntries, setServerEntries] = useState<Entries>(() => toEntries(initialEntries));
  const [entries, setEntries] = useState<Entries>(serverEntries);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [colCount, setColCount] = useState(() => Math.max(4, ...initialEntries.map((e) => e.paIndex)));
  const [composing, setComposing] = useState<Composing | null>(null);
  const [markFinal, setMarkFinal] = useState(defaultMarkFinal);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = !sameEntries(entries, serverEntries);
  const orders = useMemo(() => rows.map((r) => r.battingOrder), [rows]);
  const rowByOrder = useMemo(() => new Map(rows.map((r) => [r.battingOrder, r])), [rows]);
  const nameById = useMemo(
    () => new Map(rows.flatMap((r) => r.players.map((p) => [p.id, p.displayName] as const))),
    [rows],
  );

  // 下書きの復元（localStorage はブラウザでしか読めないのでマウント後に読む）
  useEffect(() => {
    let draft: Draft | null = null;
    try {
      const raw = localStorage.getItem(draftKey);
      draft = raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      draft = null;
    }
    if (!draft) return;
    const draftEntries = toEntries(draft.entries);
    if (sameEntries(draftEntries, serverEntries)) {
      localStorage.removeItem(draftKey);
      return;
    }
    const sameBase = draft.base === initialUpdatedAt;
    const restore =
      sameBase ||
      window.confirm(
        `保存していない下書き（${timeLabel(draft.savedAt)}）があります。復元しますか？\n※その後に他の人が保存した内容があります。復元して保存すると上書きされます`,
      );
    if (restore) {
      /* eslint-disable react-hooks/set-state-in-effect -- マウント時に一度だけ下書きを反映する */
      setEntries(draftEntries);
      setDraftSavedAt(draft.savedAt);
      setColCount((c) => Math.max(c, ...draft.entries.map((e) => e.paIndex)));
      setMessage({ ok: true, text: "保存前の下書きを復元しました" });
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      localStorage.removeItem(draftKey);
    }
    // マウント時だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 未保存のままページを離れようとしたら確認（下書きは残る）
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const writeEntries = useCallback(
    (next: Entries) => {
      setEntries(next);
      setMessage(null);
      const savedAt = Date.now();
      try {
        const draft: Draft = { base: updatedAt, entries: Object.values(next), savedAt };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
      } catch {
        // 容量不足やプライベートモードでも入力は続けられるようにする
      }
    },
    [draftKey, updatedAt],
  );

  /** そのマスの選手の初期値: 入力済みならその選手、なければ左の打席の選手、なければ先発 */
  function defaultPlayerFor(battingOrder: number, paIndex: number) {
    for (let pa = paIndex; pa >= 1; pa--) {
      const e = entries[slotKey(battingOrder, pa)];
      if (e) return e.playerId;
    }
    return rowByOrder.get(battingOrder)?.players[0]?.id ?? "";
  }

  function lastInning(): number | null {
    let latest: number | null = null;
    for (const e of Object.values(entries)) if (e.inning !== null && (latest === null || e.inning > latest)) latest = e.inning;
    return latest;
  }

  function openCell(battingOrder: number, paIndex: number) {
    const e = entries[slotKey(battingOrder, paIndex)];
    setComposing({
      battingOrder,
      paIndex,
      playerId: e?.playerId ?? defaultPlayerFor(battingOrder, paIndex),
      result: e?.result ?? null,
      fielder: e?.fielder ?? null,
      inning: e ? e.inning : lastInning(),
      step: "result",
    });
  }

  function commit(c: Composing, result: BattingResult, fielder: Fielder | null, rbi: number) {
    const key = slotKey(c.battingOrder, c.paIndex);
    const next: Entries = {
      ...entries,
      [key]: { battingOrder: c.battingOrder, paIndex: c.paIndex, playerId: c.playerId, result, fielder, rbi, inning: c.inning },
    };
    writeEntries(next);
    const target = nextSlot(c.battingOrder, orders, new Set(Object.keys(next)));
    if (!target) {
      setComposing(null);
      return;
    }
    if (target.paIndex > colCount) setColCount(target.paIndex);
    const e = next[slotKey(target.battingOrder, target.paIndex)];
    let playerId = rowByOrder.get(target.battingOrder)?.players[0]?.id ?? "";
    for (let pa = target.paIndex; pa >= 1; pa--) {
      const left = next[slotKey(target.battingOrder, pa)];
      if (left) {
        playerId = left.playerId;
        break;
      }
    }
    setComposing({
      battingOrder: target.battingOrder,
      paIndex: target.paIndex,
      playerId: e?.playerId ?? playerId,
      result: null,
      fielder: null,
      inning: c.inning,
      step: "result",
    });
  }

  function chooseResult(c: Composing, result: BattingResult) {
    const rule = BATTING_RESULT_DEFS[result].fielder;
    const fielder = rule === "none" ? null : c.result === result ? c.fielder : null;
    const nextC = { ...c, result, fielder };
    // 三振・振り逃げは打点がつかないので、その場で確定して次の打者へ
    if (result === "strikeout" || result === "strikeout_reached") {
      commit(nextC, result, null, 0);
      return;
    }
    setComposing({ ...nextC, step: rule === "none" ? "rbi" : "fielder" });
  }

  function clearCell(c: Composing) {
    const next = { ...entries };
    delete next[slotKey(c.battingOrder, c.paIndex)];
    writeEntries(next);
    setComposing(null);
  }

  function save() {
    startTransition(async () => {
      const result = await savePlateAppearances({
        teamId,
        gameId,
        expectedUpdatedAt: updatedAt,
        markFinal: !isFinal && markFinal,
        entries: Object.values(entries),
      });
      if (result.ok) {
        setUpdatedAt(result.data.updatedAt);
        setServerEntries(entries);
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        setDraftSavedAt(null);
        setMessage({ ok: true, text: "保存しました" });
        router.refresh();
      } else if (result.code === "conflict") {
        if (
          window.confirm(
            "他の人が先にこの試合を保存しています。最新を読み込みますか？\n（あなたの入力は破棄されます。キャンセルすると入力は下書きに残ります）",
          )
        ) {
          try {
            localStorage.removeItem(draftKey);
          } catch {}
          window.location.reload();
        }
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  if (rows.length === 0) {
    return <p className="panel rounded-2xl bg-white px-4 py-6 text-center font-bold">先に打順を登録してください</p>;
  }

  const cols = Array.from({ length: colCount }, (_, i) => i + 1);
  const current = composing;
  const currentRow = current ? rowByOrder.get(current.battingOrder) : undefined;

  return (
    <>
      <p className="text-sm font-bold text-ink/70">マスをタップして結果を選ぶと、次の打者へ自動で進みます</p>

      <div className="panel overflow-x-auto rounded-2xl bg-white">
        <table className="border-separate border-spacing-0 text-center">
          <thead>
            <tr className="bg-brand-600 text-sm text-white">
              <th className="sticky left-0 z-10 w-28 min-w-28 bg-brand-600 px-3 py-1.5 text-left font-bold sm:w-36">打順</th>
              {cols.map((pa) => (
                <th key={pa} className="w-16 min-w-16 py-1.5 font-bold tabular">
                  {pa}
                </th>
              ))}
              <th className="w-14 min-w-14" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.battingOrder}>
                <th className="sticky left-0 z-10 border-b border-r border-ink/10 bg-white px-2 py-1 text-left align-middle">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-sm text-white">
                      {row.battingOrder}
                    </span>
                    <div className="min-w-0 text-sm font-bold leading-tight">
                      {row.players.map((p, i) => (
                        <div key={p.id} className="truncate">
                          {i > 0 && <span className="mr-0.5 rounded bg-amber-100 px-1 text-[10px] text-amber-900">代</span>}
                          {p.displayName}
                        </div>
                      ))}
                    </div>
                  </div>
                </th>
                {cols.map((pa) => {
                  const e = entries[slotKey(row.battingOrder, pa)];
                  const isSub = e && row.players[0]?.id !== e.playerId;
                  const selected = current?.battingOrder === row.battingOrder && current.paIndex === pa;
                  return (
                    <td key={pa} className="border-b border-l border-ink/10 bg-white p-0">
                      <button
                        type="button"
                        onClick={() => openCell(row.battingOrder, pa)}
                        aria-label={`${row.battingOrder}番 ${pa}打席目${e ? ` ${formatBattingResult(e.result, e.fielder)}` : " 未入力"}`}
                        className={`relative flex h-14 w-16 flex-col items-center justify-center font-bold active:bg-brand-50 ${selected ? "bg-brand-50 outline-2 -outline-offset-2 outline-brand-600" : ""} ${isSub && !selected ? "bg-amber-50" : ""}`}
                      >
                        {e ? (
                          <>
                            <span key={`${e.result}${e.fielder}`} className={`animate-pop-in text-base leading-none ${BATTING_RESULT_DEFS[e.result].hit ? "text-hit" : ""}`}>
                              {formatBattingResult(e.result, e.fielder)}
                            </span>
                            {e.rbi > 0 && <span className="mt-1 rounded-full bg-grass px-1.5 text-[10px] leading-4 text-white">{e.rbi}点</span>}
                            {e.inning !== null && <span className="absolute left-1 top-0.5 text-[10px] text-ink/40 tabular">{e.inning}回</span>}
                          </>
                        ) : (
                          <span className="size-2 rounded-full bg-ink/15" />
                        )}
                      </button>
                    </td>
                  );
                })}
                <td className="border-b border-ink/10" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {colCount < MAX_PA_INDEX && (
        <button type="button" onClick={() => setColCount((c) => c + 1)} className={buttonClass("secondary", "sm")}>
          ＋ 列を追加
        </button>
      )}

      {/* 下部の保存バー */}
      <div className="h-32" aria-hidden />
      <div className="fixed inset-x-0 z-40 border-t border-ink/10 bg-white px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" style={{ bottom: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))` }}>
        <div className="mx-auto max-w-3xl space-y-2">
          {!isFinal && (
            <label className="flex min-h-10 items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={markFinal} onChange={(e) => setMarkFinal(e.target.checked)} className="size-5 accent-grass" />
              保存と同時に「試合終了」にする（成績に反映）
            </label>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              {message ? (
                <span role={message.ok ? "status" : "alert"} className={`font-bold ${message.ok ? "text-grass-dark" : "text-hit"}`}>
                  {message.text}
                </span>
              ) : dirty && draftSavedAt ? (
                <span className="font-bold text-ink/60">下書き保存済み {timeLabel(draftSavedAt)}</span>
              ) : !dirty ? (
                <span className="font-bold text-ink/40">保存済み</span>
              ) : null}
            </div>
            <button type="button" onClick={save} disabled={pending || (!dirty && (isFinal || !markFinal))} className={buttonClass("primary", "lg", "min-w-32")}>
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={current !== null}
        onClose={() => setComposing(null)}
        title={
          current && (
            <span>
              <span className="mr-2 inline-flex size-8 items-center justify-center rounded-full bg-brand-600 font-bold text-base text-white">
                {current.battingOrder}
              </span>
              {nameById.get(current.playerId)}
              <span className="ml-2 text-sm font-bold text-ink/50">{current.paIndex}打席目</span>
            </span>
          )
        }
      >
        {current && (
          <div className="space-y-3 pb-2">
            {currentRow && currentRow.players.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {currentRow.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setComposing({ ...current, playerId: p.id })}
                    className={`pop-sm min-h-10 rounded-full px-3 text-sm font-bold ${current.playerId === p.id ? "bg-ink text-sun" : "bg-white text-ink"}`}
                  >
                    {p.displayName}
                  </button>
                ))}
              </div>
            )}

            {current.step === "result" && (
              <>
                {RESULT_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 text-xs font-bold text-ink/60">{g.label}</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {g.results.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => chooseResult(current, r)}
                          className={`pop min-h-14 rounded-2xl px-1 text-base font-bold ${g.tone} ${current.result === r ? "outline-4 outline-offset-2 outline-sun" : ""}`}
                        >
                          {BATTING_RESULT_DEFS[r].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {entries[slotKey(current.battingOrder, current.paIndex)] && (
                  <button type="button" onClick={() => clearCell(current)} className={buttonClass("danger", "md", "w-full")}>
                    この打席を消す
                  </button>
                )}
              </>
            )}

            {current.step === "fielder" && current.result && (
              <>
                <StepHeader label={`${BATTING_RESULT_DEFS[current.result].label}の方向`} onBack={() => setComposing({ ...current, step: "result" })} />
                <FieldPicker selected={current.fielder} onPick={(f) => setComposing({ ...current, fielder: f, step: "rbi" })} />
                {BATTING_RESULT_DEFS[current.result].fielder === "optional" && (
                  <button type="button" onClick={() => setComposing({ ...current, fielder: null, step: "rbi" })} className={buttonClass("secondary", "md", "w-full")}>
                    方向なし
                  </button>
                )}
              </>
            )}

            {current.step === "rbi" && current.result && (
              <>
                <StepHeader
                  label={`${formatBattingResult(current.result, current.fielder)} の打点`}
                  onBack={() =>
                    setComposing({ ...current, step: BATTING_RESULT_DEFS[current.result!].fielder === "none" ? "result" : "fielder" })
                  }
                />
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: MAX_RBI + 1 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => commit(current, current.result!, current.fielder, n)}
                      className={buttonClass(n === 0 ? "primary" : "secondary", "lg", "px-0 font-bold text-2xl tabular")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs font-bold text-ink/50">打点を選ぶと確定して次の打者へ進みます</p>
                <div>
                  <div className="mb-1.5 text-xs font-bold text-ink/60">イニング（任意）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[null, ...Array.from({ length: Math.max(scheduledInnings, 9) }, (_, i) => i + 1)].map((n) => (
                      <button
                        key={n ?? "none"}
                        type="button"
                        onClick={() => setComposing({ ...current, inning: n })}
                        className={`pop-sm min-h-10 min-w-10 rounded-xl px-2 text-sm font-bold ${current.inning === n ? "bg-ink text-sun" : "bg-white text-ink"}`}
                      >
                        {n === null ? "なし" : n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function StepHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} className="pop-sm min-h-10 rounded-xl bg-white px-3 text-sm font-bold">
        ← 戻る
      </button>
      <span className="font-bold">{label}</span>
    </div>
  );
}
