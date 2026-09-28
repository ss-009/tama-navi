"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPlayer } from "@/server/actions/players";
import { saveLineup } from "@/server/actions/lineup";
import { BottomSheet } from "./bottom-sheet";
import { TAB_BAR_HEIGHT } from "./bottom-tabs";
import { Stepper } from "./stepper";
import { buttonClass, inputClass } from "./ui";

export type LineupPlayer = { id: string; displayName: string; number: string | null; isGuest: boolean };
export type LineupSlotState = {
  playerId: string;
  battingOrder: number | null;
  runs: number;
  stolenBases: number;
  caughtStealing: number;
};

type Picker = { battingOrder: number | null } | null;

export function LineupEditor({
  teamId,
  gameId,
  initialUpdatedAt,
  players: initialPlayers,
  initialSlots,
  previousSlots,
  scorebookHref,
}: {
  teamId: string;
  gameId: string;
  initialUpdatedAt: string;
  players: LineupPlayer[];
  initialSlots: LineupSlotState[];
  previousSlots: LineupSlotState[] | null;
  scorebookHref: string;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [slots, setSlots] = useState(initialSlots);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [orderCount, setOrderCount] = useState(() => Math.max(9, ...initialSlots.map((s) => s.battingOrder ?? 0)));
  const [picker, setPicker] = useState<Picker>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const used = new Set(slots.map((s) => s.playerId));
  const orders = Array.from({ length: orderCount }, (_, i) => i + 1);

  function update(next: LineupSlotState[]) {
    setSlots(next);
    setDirty(true);
    setMessage(null);
  }

  function addPlayer(playerId: string, battingOrder: number | null) {
    update([...slots, { playerId, battingOrder, runs: 0, stolenBases: 0, caughtStealing: 0 }]);
    setPicker(null);
  }

  function save() {
    startTransition(async () => {
      // 打順ごとに最初の選手が先発。守備のみ・代走は先発扱いにしない
      const seen = new Set<number>();
      const payload = slots.map((s) => {
        const isStarter = s.battingOrder !== null && !seen.has(s.battingOrder);
        if (s.battingOrder !== null) seen.add(s.battingOrder);
        return { ...s, isStarter };
      });
      const result = await saveLineup({ teamId, gameId, expectedUpdatedAt: updatedAt, slots: payload });
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

  const editingSlot = slots.find((s) => s.playerId === editing);

  function chip(slot: LineupSlotState, index: number) {
    const p = playerById.get(slot.playerId);
    const stats = [slot.runs && `得${slot.runs}`, slot.stolenBases && `盗${slot.stolenBases}`, slot.caughtStealing && `死${slot.caughtStealing}`]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        key={slot.playerId}
        type="button"
        onClick={() => setEditing(slot.playerId)}
        className="pop-sm flex min-h-12 w-full items-center gap-2 rounded-2xl bg-white px-3 text-left"
      >
        {index > 0 && <span className="rounded-md bg-amber-100 px-1.5 text-xs font-bold text-amber-900">代</span>}
        {p?.number && <span className="text-sm text-ink/50 tabular">#{p.number}</span>}
        <span className="min-w-0 flex-1 truncate font-bold">{p?.displayName ?? "?"}</span>
        {stats && <span className="rounded-full bg-green-100 px-2 text-xs font-bold text-green-800">{stats}</span>}
      </button>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {slots.length === 0 && previousSlots && previousSlots.length > 0 && (
          <button
            type="button"
            className={buttonClass("secondary", "md", "w-full")}
            onClick={() => {
              const copied = previousSlots
                .filter((s) => playerById.has(s.playerId))
                .map((s) => ({ ...s, runs: 0, stolenBases: 0, caughtStealing: 0 }));
              update(copied);
              setOrderCount(Math.max(9, ...copied.map((s) => s.battingOrder ?? 0)));
            }}
          >
            前の試合の打順をコピー
          </button>
        )}

        <ol className="space-y-2">
          {orders.map((order) => {
            const inOrder = slots.filter((s) => s.battingOrder === order);
            return (
              <li key={order} className="panel flex gap-2 rounded-2xl bg-white p-2">
                <span className="flex size-10 shrink-0 items-center justify-center self-start rounded-full bg-brand-600 font-bold text-lg text-white tabular">{order}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {inOrder.map((s, i) => chip(s, i))}
                  <button
                    type="button"
                    onClick={() => setPicker({ battingOrder: order })}
                    className="min-h-11 w-full rounded-2xl border-2 border-dashed border-ink/30 px-3 text-left text-sm font-bold text-ink/60 active:bg-sun/30"
                  >
                    {inOrder.length === 0 ? "＋ 選手を選ぶ" : "＋ 交代した選手"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        <button type="button" className={buttonClass("ghost", "md", "w-full")} onClick={() => setOrderCount((c) => Math.min(30, c + 1))}>
          ＋ 打順を追加（{orderCount + 1}番）
        </button>

        <section className="panel rounded-2xl bg-white p-3">
          <h2 className="mb-2 font-bold">守備のみ・代走</h2>
          <div className="space-y-1.5">
            {slots.filter((s) => s.battingOrder === null).map((s) => chip(s, 0))}
            <button
              type="button"
              onClick={() => setPicker({ battingOrder: null })}
              className="min-h-11 w-full rounded-2xl border-2 border-dashed border-ink/30 px-3 text-left text-sm font-bold text-ink/60 active:bg-sun/30"
            >
              ＋ 選手を追加
            </button>
          </div>
        </section>
      </div>

      {/* 下部の保存バー */}
      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 z-40 border-t border-ink/10 bg-white px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" style={{ bottom: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))` }}>
        <div className="mx-auto max-w-3xl space-y-2">
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-sm font-bold ${message.ok ? "text-grass-dark" : "text-hit"}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            {!dirty && slots.length > 0 ? (
              <Link href={scorebookHref} className={buttonClass("primary", "lg", "flex-1")}>
                打席入力へ →
              </Link>
            ) : (
              <button type="button" onClick={save} disabled={pending || !dirty} className={buttonClass("primary", "lg", "flex-1")}>
                {pending ? "保存中…" : dirty ? "打順を保存" : "保存済み"}
              </button>
            )}
          </div>
        </div>
      </div>

      <BottomSheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        title={picker?.battingOrder ? `${picker.battingOrder}番に入れる選手` : "守備のみ・代走の選手"}
      >
        {picker && (
          <PlayerPicker
            players={players.filter((p) => !used.has(p.id))}
            onPick={(id) => addPlayer(id, picker.battingOrder)}
            onCreateGuest={async (name) => {
              const result = await createPlayer({ teamId, name, isGuest: true });
              if (!result.ok) return result.error;
              setPlayers((ps) => [...ps, { id: result.data.id, displayName: name, number: null, isGuest: true }]);
              addPlayer(result.data.id, picker.battingOrder);
              return null;
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet open={editingSlot !== undefined} onClose={() => setEditing(null)} title={editingSlot ? playerById.get(editingSlot.playerId)?.displayName : ""}>
        {editingSlot && (
          <div className="space-y-2 pb-2">
            <Stepper label="得点" value={editingSlot.runs} onChange={(v) => update(slots.map((s) => (s === editingSlot ? { ...s, runs: v } : s)))} />
            <Stepper label="盗塁" value={editingSlot.stolenBases} onChange={(v) => update(slots.map((s) => (s === editingSlot ? { ...s, stolenBases: v } : s)))} />
            <Stepper label="盗塁死" value={editingSlot.caughtStealing} onChange={(v) => update(slots.map((s) => (s === editingSlot ? { ...s, caughtStealing: v } : s)))} />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                className={buttonClass("danger", "lg")}
                onClick={() => {
                  update(slots.filter((s) => s !== editingSlot));
                  setEditing(null);
                }}
              >
                外す
              </button>
              <button type="button" className={buttonClass("primary", "lg")} onClick={() => setEditing(null)}>
                OK
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function PlayerPicker({
  players,
  onPick,
  onCreateGuest,
}: {
  players: LineupPlayer[];
  onPick: (id: string) => void;
  onCreateGuest: (name: string) => Promise<string | null>;
}) {
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 pb-2">
      {players.length === 0 ? (
        <p className="text-ink/60">選べる選手がいません。</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="pop-sm flex min-h-12 w-full items-center gap-1.5 rounded-2xl bg-white px-3 text-left"
              >
                {p.number && <span className="text-xs text-ink/50 tabular">#{p.number}</span>}
                <span className="min-w-0 flex-1 truncate font-bold">{p.displayName}</span>
                {p.isGuest && <span className="rounded-md bg-gray-100 px-1 text-xs font-bold">助</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2 border-t-2 border-dashed border-ink/20 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const name = guestName.trim();
          if (!name) return;
          startTransition(async () => {
            const err = await onCreateGuest(name);
            setError(err);
            if (!err) setGuestName("");
          });
        }}
      >
        <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="助っ人の名前" maxLength={30} className={`${inputClass} flex-1`} />
        <button type="submit" disabled={pending || !guestName.trim()} className={buttonClass("secondary", "md", "shrink-0")}>
          追加
        </button>
      </form>
      {error && <p role="alert" className="text-sm font-bold text-hit">{error}</p>}
    </div>
  );
}
