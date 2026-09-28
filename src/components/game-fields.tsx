import type { Game } from "@/server/db/schema";
import { GAME_STATUS_LABELS, todayJst } from "@/lib/format";
import { Field, inputClass } from "./ui";

function Segmented({ name, options, defaultValue }: { name: string; options: { value: string; label: string }[]; defaultValue: string }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
          <span className="pop-sm flex min-h-12 items-center justify-center rounded-2xl bg-white px-2 text-center font-bold peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** 試合の登録・編集フォームの項目（ActionForm の中で使う） */
export function GameFields({ game }: { game?: Game }) {
  const homeValue = game?.isHome === true ? "home" : game?.isHome === false ? "away" : "";
  return (
    <>
      <Field label="日付">
        <input type="date" name="gameDate" required defaultValue={game?.gameDate ?? todayJst()} className={inputClass} />
      </Field>
      <Field label="対戦相手">
        <input name="opponent" required maxLength={40} defaultValue={game?.opponent} className={inputClass} placeholder="例: 多摩ドラゴンズ" />
      </Field>
      <Field label="球場（任意）">
        <input name="venue" maxLength={40} defaultValue={game?.venue ?? ""} className={inputClass} />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-bold">先攻 / 後攻</span>
        <Segmented
          name="isHome"
          defaultValue={homeValue}
          options={[
            { value: "away", label: "先攻" },
            { value: "home", label: "後攻" },
            { value: "", label: "未定" },
          ]}
        />
      </div>
      <Field label="状態">
        <select name="status" defaultValue={game?.status ?? "scheduled"} className={inputClass}>
          {Object.entries(GAME_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <p className="-mt-2 text-sm text-ink/50">成績に数えるのは「試合終了」の試合だけです。</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="自チーム得点">
          <input type="number" inputMode="numeric" name="ourScore" min={0} max={99} defaultValue={game?.ourScore ?? ""} className={inputClass} />
        </Field>
        <Field label="相手得点">
          <input type="number" inputMode="numeric" name="opponentScore" min={0} max={99} defaultValue={game?.opponentScore ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="予定イニング">
          <select name="scheduledInnings" defaultValue={String(game?.scheduledInnings ?? 7)} className={inputClass}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}回
              </option>
            ))}
          </select>
        </Field>
        <Field label="実際のイニング">
          <input type="number" inputMode="numeric" name="actualInnings" min={1} max={20} defaultValue={game?.actualInnings ?? ""} className={inputClass} placeholder="任意" />
        </Field>
      </div>
      <Field label="メモ（任意）">
        <textarea name="note" maxLength={500} rows={3} defaultValue={game?.note ?? ""} className={`${inputClass} py-2`} />
      </Field>
    </>
  );
}
