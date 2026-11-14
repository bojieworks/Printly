"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Proof } from "@/components/Proof";
import { FilmStrip } from "@/components/FilmStrip";
import { ToastHost, toast } from "@/components/Toast";
import { store } from "@/lib/client-store";
import {
  CAPTION,
  PAPER_COLORS,
  defaultSpec,
  effectivePixels,
  recropForArea,
  resolutionLevel,
  type FrameStyle,
  type PrintSpec,
} from "@/lib/print-spec";
import type { PhotoView } from "@/lib/queries";

interface Props {
  code: string;
  photo: PhotoView;
  photos: PhotoView[];
  paperColors: Record<string, string> | null;
  finishEnabled: boolean;
  calibrated: boolean;
}

/** 編輯器：不是分步精靈，所有設定在同一頁，相紙即時更新。DESIGN_SYSTEM §3.12 */
export function EditorClient({ code, photo, photos, paperColors, finishEnabled, calibrated }: Props) {
  const router = useRouter();
  const original = useMemo(() => ({ w: photo.width, h: photo.height }), [photo.width, photo.height]);
  const [spec, setSpec] = useState<PrintSpec>(() => defaultSpec(original));
  const [restored, setRestored] = useState(false);
  const [width, setWidth] = useState(300);
  const [isMobile, setIsMobile] = useState(false);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specRef = useRef(spec);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  // 還原上次設定
  useEffect(() => {
    const saved = store.spec(code, photo.frameNo);
    if (saved) { setSpec(saved); setRestored(true); }
  }, [code, photo.frameNo]);

  // 相紙寬度：桌機 300/360，手機依視窗
  useEffect(() => {
    const calc = () => {
      const m = innerWidth < 640;
      setIsMobile(m);
      const land = specRef.current.orientation === "landscape";
      if (m) {
        const budget = innerHeight * 0.44 - 48; // 舞台 44vh 扣掉內距
        setWidth(Math.max(120, Math.min(innerWidth - 72, land ? budget * 1.48 : budget / 1.48, 320)));
      }
      else setWidth(land ? 380 : 300);
    };
    calc();
    addEventListener("resize", calc);
    return () => removeEventListener("resize", calc);
  }, [spec.orientation]);

  const save = (s: PrintSpec, quiet = false) => {
    store.setSpec(code, photo.frameNo, s);
    if (quiet) return;
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => toast("已記住這一張的設定"), 600);
  };
  const update = (patch: Partial<PrintSpec>) => {
    setSpec((prev) => {
      const next = { ...prev, ...patch };
      if (patch.orientation !== undefined || patch.frame !== undefined) {
        next.crop = recropForArea(original, prev.crop, next.orientation, next.frame);
      }
      if (next.frame !== "polaroid") next.caption = next.caption; // 保留文字，只是不顯示
      save(next);
      return next;
    });
  };

  const level = resolutionLevel(spec, original);
  const eff = effectivePixels(spec, original);
  const blocked = level === "block";
  const paperName = PAPER_COLORS.find((c) => c.key === spec.paper)?.name ?? "";

  const toConfirm = () => {
    if (blocked) return;
    store.setSpec(code, photo.frameNo, spec);
    router.push(`/a/${code}/f/${photo.frameNo}/confirm`);
  };

  const printed = store.printed(code).map((e) => e.frame);

  return (
    <>
      <div className="editor">
        <div className="stage">
          <div className="proof-wrap">
            <Proof
              src={photo.sizes["1440"] ?? photo.src}
              original={original}
              spec={spec}
              width={width}
              paperColors={paperColors}
              showSafe
              showMarks={!isMobile}
              interactive
              shadow={isMobile ? "sm" : "default"}
              captionAnimateLast
              onCrop={(crop) => setSpec((s) => ({ ...s, crop }))}
              onCropEnd={() => setSpec((s) => { save(s); return s; })}
            />
            <div aria-live="polite">
              {level === "warn" && (
                <div className="alert warn"><b>解析度偏低</b>裁切後約 {eff.w} × {eff.h} px，印出來可能偏軟。<small>建議 1200 × 1800 以上</small></div>
              )}
              {level === "block" && (
                <div className="alert err" role="alert"><b>這張照片無法列印</b>裁切後約 {eff.w} × {eff.h} px，低於 800 × 1200。請放寬裁切範圍或換一張。</div>
              )}
            </div>
            <div className="hint">{isMobile ? "拖曳移動，雙指縮放，雙擊重置" : "拖曳移動，滾輪縮放，雙擊重置"}{restored ? " · 上次的設定" : ""}</div>
          </div>
          {!calibrated && <span className="mono-sm uncal">尚未校正 · 安全區為預估</span>}
        </div>

        <div className="panel">
          {(level !== "ok" || restored) && (
            <div className="row hints" aria-live="polite">
              {level === "warn" && <div className="alert warn"><b>解析度偏低</b>裁切後約 {eff.w} × {eff.h} px，印出來可能偏軟。</div>}
              {level === "block" && <div className="alert err" role="alert"><b>這張照片無法列印</b>裁切後約 {eff.w} × {eff.h} px，低於 800 × 1200。請放寬裁切範圍或換一張。</div>}
              {level === "ok" && restored && <span className="hint" style={{ textAlign: "left" }}>上次的設定</span>}
            </div>
          )}
          <div className="row">
            <small>方向</small>
            <div className="seg-q" role="radiogroup" aria-label="方向">
              {(["portrait", "landscape"] as const).map((v) => (
                <button key={v} role="radio" aria-checked={spec.orientation === v} onClick={() => update({ orientation: v })}>{v === "portrait" ? "直式" : "橫式"}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <small>色調</small>
            <div className="seg-q" role="radiogroup" aria-label="色調">
              {(["color", "bw"] as const).map((v) => (
                <button key={v} role="radio" aria-checked={spec.tone === v} onClick={() => update({ tone: v })}>{v === "color" ? "彩色" : "黑白"}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <small>框</small>
            <div className="frames" role="radiogroup" aria-label="框">
              {([["none", "無", "none"], ["thin", "細框", "thin"], ["polaroid", "拍立得", "pola"]] as [FrameStyle, string, string][]).map(([v, name, cls]) => (
                <button key={v} role="radio" aria-checked={spec.frame === v} onClick={() => update({ frame: v })} aria-label={name}>
                  <span className={`f ${cls}`} aria-hidden><i /></span>
                  <span className="lb">{name}</span>
                </button>
              ))}
            </div>
          </div>
          {spec.frame !== "none" && (
            <div className="row">
              <small>紙色</small>
              <div className="dots" role="radiogroup" aria-label="紙色">
                {PAPER_COLORS.map((c) => (
                  <button key={c.key} role="radio" aria-checked={spec.paper === c.key} aria-label={c.name} style={{ background: paperColors?.[c.key] ?? c.hex }} onClick={() => update({ paper: c.key })} />
                ))}
              </div>
            </div>
          )}
          {spec.frame === "polaroid" && (
            <div className="row">
              <small>一句話</small>
              <div className="line">
                <input
                  id="caption"
                  value={spec.caption}
                  maxLength={CAPTION.maxChars}
                  placeholder="寫在相紙下面的一句話"
                  autoComplete="off"
                  onChange={(e) => update({ caption: e.target.value.slice(0, CAPTION.maxChars) })}
                  aria-label="一句話"
                />
                <span className="cnt">{spec.caption.length} / {CAPTION.maxChars}</span>
              </div>
            </div>
          )}
          {finishEnabled && (
            <div className="row">
              <small>表面</small>
              <div className="seg-q" role="radiogroup" aria-label="表面">
                {(["glossy", "matte"] as const).map((v) => (
                  <button key={v} role="radio" aria-checked={spec.finish === v} onClick={() => update({ finish: v })}>{v === "glossy" ? "光面" : "霧面"}</button>
                ))}
              </div>
            </div>
          )}
          <div className="row" style={{ borderBottom: 0 }}>
            <small>摘要</small>
            <span className="mono">{spec.orientation === "portrait" ? "直式" : "橫式"} · {spec.frame === "none" ? "無框" : `${spec.frame === "thin" ? "細框" : "拍立得"} ${paperName}`} · {eff.w} × {eff.h} px</span>
          </div>
          <div className="foot">
            <Link className="btn txt" href={`/a/${code}/f/${photo.frameNo}`}>換一張</Link>
            <button className="btn" onClick={toConfirm} disabled={blocked}>下一步 · 確認 →</button>
          </div>
        </div>
      </div>

      {!isMobile && photos.length > 1 && (
        <div style={{ marginTop: "var(--s5)" }}>
          <FilmStrip
            photos={photos}
            hrefFor={(p) => `/a/${code}/f/${p.frameNo}/edit`}
            currentId={photo.id}
            printedIds={photos.filter((p) => printed.includes(p.frameNo)).map((p) => p.id)}
            ariaLabel="換一張"
          />
        </div>
      )}

      <div className="mbar">
        <Link className="btn txt" href={`/a/${code}/f/${photo.frameNo}`}>換一張</Link>
        <button className="btn" onClick={toConfirm} disabled={blocked}>下一步 →</button>
      </div>
      <ToastHost />
    </>
  );
}
