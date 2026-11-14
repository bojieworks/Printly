import { customAlphabet, nanoid } from "nanoid";

// 沒有容易混淆的 0 o 1 l i
const codeAlphabet = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 10);

export const newId = () => nanoid(16);
export const newAlbumCode = () => codeAlphabet();

/** 格號：01A, 02A … 99A, 100A */
export const frameNo = (index1: number) => `${String(index1).padStart(2, "0")}A`;

/** 訂單短碼：2026-1114-07（當日第 n 筆） */
export const orderShortCode = (date: Date, seq: number) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}${d}-${String(seq).padStart(2, "0")}`;
};

export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);
