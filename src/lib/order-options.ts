/** 訂單層級的選項（不影響列印檔）。真實相框：印好之後要不要連相框一起給對方。 */
export type PhysicalFrame = "none" | "white" | "wood";
export const PHYSICAL_FRAMES: { key: PhysicalFrame; name: string }[] = [
  { key: "none", name: "不需要" },
  { key: "white", name: "白色" },
  { key: "wood", name: "木紋" },
];
export const PHYSICAL_FRAME_NAME: Record<PhysicalFrame, string> = { none: "不需要", white: "白色", wood: "木紋" };
export const isPhysicalFrame = (v: unknown): v is PhysicalFrame => v === "none" || v === "white" || v === "wood";
