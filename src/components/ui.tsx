import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "blue";
type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "pop border-transparent bg-brand-600 text-white hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none",
  blue: "pop border-transparent bg-sun text-ink disabled:bg-gray-200 disabled:text-gray-400",
  secondary: "pop bg-white text-ink hover:bg-brand-50 disabled:text-gray-400",
  danger: "pop bg-white text-hit hover:bg-red-50 disabled:text-gray-400",
  ghost: "text-brand-700 active:bg-white/60",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-5 text-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-bold select-none ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`panel rounded-2xl bg-white p-4 sm:p-5 ${className}`} {...props} />;
}

/** 見出し。左に短い縦線 */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-10 items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden className="h-5 w-1.5 rounded-full bg-brand-600" />
        {children}
      </h2>
      {action}
    </div>
  );
}

/** 入力欄。カード（白）の上で見分けやすいよう薄いグレーで塗り、フォーカスで白 + 枠線 */
export const inputClass =
  "block w-full min-h-12 rounded-xl border border-ink/12 bg-[#f5f7fb] px-3.5 text-base text-ink placeholder:text-ink/35 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-ink/20 bg-white px-4 py-6 text-center font-bold text-ink/50">
      {children}
    </p>
  );
}

/** 画面の中身。スマホは全幅、PCは中央寄せ */
export function Main({ className = "", wide = false, ...props }: ComponentProps<"main"> & { wide?: boolean }) {
  return <main className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"} space-y-5 px-4 py-5 sm:px-6 sm:py-6 ${className}`} {...props} />;
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "green" | "amber" | "red" | "blue"; children: ReactNode }) {
  const tones = {
    gray: "bg-gray-100 text-ink",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-700",
    blue: "bg-brand-100 text-brand-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** 勝・負・分のまるいマーク */
export function OutcomeMark({ label, tone }: { label: string; tone: "red" | "blue" | "gray" }) {
  const bg = { red: "bg-hit", blue: "bg-brand-600", gray: "bg-gray-400" }[tone];
  return (
    <span className={`inline-flex size-8 items-center justify-center rounded-full font-bold text-sm text-white ${bg}`}>
      {label}
    </span>
  );
}

/** チェックボックス。説明はラベルの下に出す */
export function CheckboxField({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-ink/12 bg-[#f5f7fb] px-3.5 py-3 has-[:checked]:border-brand-500/40 has-[:checked]:bg-brand-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-brand-600" />
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink/50">{hint}</span>}
      </span>
    </label>
  );
}
