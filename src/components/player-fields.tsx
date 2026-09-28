import { AVATAR_KEYS, AVATARS } from "@/lib/avatars";
import { POSITION_LABELS } from "@/lib/player-profile";
import type { Player } from "@/server/db/schema";
import { CheckboxField, Field, inputClass } from "./ui";

export function PlayerFields({ player }: { player?: Player }) {
  return (
    <>
      <Field label="名前（本名）">
        <input name="name" required maxLength={30} defaultValue={player?.name} className={inputClass} placeholder="例: 田中 太郎" />
      </Field>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label="ニックネーム（任意）">
          <input name="nickname" maxLength={20} defaultValue={player?.nickname ?? ""} className={inputClass} placeholder="例: タナ" />
        </Field>
        <Field label="背番号">
          <input name="number" inputMode="numeric" pattern="\d{1,3}" maxLength={3} defaultValue={player?.number ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="ポジション">
        <select name="position" defaultValue={player?.position ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {Object.entries(POSITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="投げる手">
          <select name="throws" defaultValue={player?.throws ?? ""} className={inputClass}>
            <option value="">未設定</option>
            <option value="right">右投</option>
            <option value="left">左投</option>
          </select>
        </Field>
        <Field label="打席">
          <select name="bats" defaultValue={player?.bats ?? ""} className={inputClass}>
            <option value="">未設定</option>
            <option value="right">右打</option>
            <option value="left">左打</option>
            <option value="switch">両打</option>
          </select>
        </Field>
      </div>
      <Field label="ひとこと（任意）">
        <input name="comment" maxLength={100} defaultValue={player?.comment ?? ""} className={inputClass} placeholder="例: 声出し担当！" />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">アイコン</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          <label className="relative">
            <input type="radio" name="avatar" value="" defaultChecked={!player?.avatar} className="peer sr-only" />
            <span className="flex aspect-square items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white peer-checked:ring-4 peer-checked:ring-brand-500 peer-focus-visible:ring-4">
              {player?.number ?? "#"}
            </span>
          </label>
          {AVATAR_KEYS.map((key) => (
            <label key={key} className="relative">
              <input type="radio" name="avatar" value={key} defaultChecked={player?.avatar === key} className="peer sr-only" />
              <span
                className="flex aspect-square items-center justify-center rounded-full text-2xl peer-checked:ring-4 peer-checked:ring-brand-500 peer-focus-visible:ring-4"
                style={{ backgroundColor: AVATARS[key].bg }}
              >
                {AVATARS[key].emoji}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink/50">左端は背番号をそのまま表示します</p>
      </fieldset>

      <CheckboxField name="isGuest" label="助っ人" hint="選手名鑑には出ません" defaultChecked={player?.isGuest} />
      {player && <CheckboxField name="isActive" label="在籍中" hint="外すと打順の候補に出なくなります（成績は残ります）" defaultChecked={player.isActive} />}
    </>
  );
}
