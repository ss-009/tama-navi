import "server-only";
import { z } from "zod";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const uuid = z.uuid({ message: "不正なIDです" });

export const requiredText = (label: string, max = 50) =>
  z
    .string({ message: `${label}を入力してください` })
    .trim()
    .min(1, `${label}を入力してください`)
    .max(max, `${label}は${max}文字以内で入力してください`);

export const optionalText = (label: string, max = 50) =>
  z.preprocess(
    blankToNull,
    z.string().trim().max(max, `${label}は${max}文字以内で入力してください`).nullable().default(null),
  );

/** フォームのチェックボックス（未チェックだと送られない） */
export const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const optionalInt = (label: string, min: number, max: number) =>
  z.preprocess(
    blankToNull,
    z.coerce
      .number({ message: `${label}は数字で入力してください` })
      .int(`${label}は整数で入力してください`)
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`)
      .nullable()
      .default(null),
  );

export const int = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `${label}は数字で入力してください` })
    .int(`${label}は整数で入力してください`)
    .min(min, `${label}は${min}以上で入力してください`)
    .max(max, `${label}は${max}以下で入力してください`);

export const dateString = z
  .string({ message: "日付を入力してください" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください");

/** 空文字は null、それ以外は候補のどれか */
export const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess(blankToNull, z.enum(values, { message: `${label}を選んでください` }).nullable().default(null));
