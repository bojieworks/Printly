"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Proof } from "@/components/Proof";
import { FilmStrip } from "@/components/FilmStrip";
import { ToastHost, toast } from "@/components/Toast";
import { store } from "@/lib/client-store";
import { autoCaptionInk } from "@/lib/caption-ink";
import {
  CAPTION,
  CAPTION_COLORS,
  CAPTION_FONTS,
  isHexColor,
  CAPTION_ROTATE,
  CAPTION_SIZE,
  captionMaxSizeMm,
  captionRotate,
  captionSizeMm,
  captionDefaultPos,
  captionPlace,
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
  stampChar: string;
}

/** 編輯器：不是分步精靈，所有設定在同一頁，相紙即時更新。DESIGN_SYSTEM §3.12 */
export function EditorClient({ code, photo, photos, paperColors, finishEnabled, calibrated, stampChar }: Props) {
  const router = useRouter();
  const original = useMemo(() => ({ w: photo.width, h: photo.height }), [photo.width, photo.height]);
  const [spec, setSpec] = useState<PrintSpec>(() => defaultSpec(original));
  const [restored, setRestored] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specRef = useRef(spec);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  // 還原上次設定
  useEffect(() => {
    const saved = store.spec(code, photo.frameNo);
    if (saved) { setSpec({ captionFont: "hand", ...saved }); setRestored(true); }
  }, [code, photo.frameNo]);

  useEffect(() => {
    const mq = matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // 文字壓在照片上時，依底色亮度決定墨色（防抖，結果存進 spec）
  const inkKey = `${spec.caption ? 1 : 0}|${captionPlace(spec)}|${spec.frame}|${spec.orientation}|${spec.tone}|${spec.captionSizeMm}|${spec.captionRotate}|${spec.captionFont}|${spec.crop.x.toFixed(3)},${spec.crop.y.toFixed(3)},${spec.crop.w.toFixed(3)}|${spec.captionPos?.x.toFixed(3)},${spec.captionPos?.y.toFixed(2)}`;
  useEffect(() => {
    if (!spec.caption || captionPlace(spec) !== "photo") return;
    let alive = true;
    const t = setTimeout(async () => {
      const ink = await autoCaptionInk(photo.sizes["480"] ?? photo.src, original, spec);
      if (!alive) return;
      setSpec((s) => (s.captionInk === ink ? s : { ...s, captionInk: ink }));
    }, 120);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inkKey]);

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
      if (patch.orientation !== undefined || patch.frame !== undefined) {
        next.captionPos = captionDefaultPos(next); // 換框或方向時回到該框的預設位置
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

  // 已印過的格要在 mount 後才讀 localStorage，避免 SSR 與 client 不一致
  const [printed, setPrinted] = useState<string[]>([]);
  useEffect(() => { setPrinted(store.printed(code).map((e) => e.frame)); }, [code]);

  return (
    <>
      <div className="editor">
        <div className="stage">
          <div className="proof-wrap">
            <Proof
              src={photo.sizes["1440"] ?? photo.src}
              original={original}
              spec={spec}
              className={`slot ${spec.orientation}`}
              paperColors={paperColors}
              showSafe
              showMarks={!isMobile}
              interactive
              shadow={isMobile ? "sm" : "default"}
              captionAnimateLast
              captionDraggable
              onCaptionMove={(captionPos) => setSpec((s) => ({ ...s, captionPos }))}
              onCaptionMoveEnd={() => setSpec((s) => { save(s); return s; })}
              onCaptionResize={(captionSizeMm) => setSpec((s) => ({ ...s, captionSizeMm }))}
              onCaptionRotate={(captionRotate) => setSpec((s) => ({ ...s, captionRotate }))}
              onCrop={(crop) => setSpec((s) => ({ ...s, crop }))}
              onCropEnd={() => setSpec((s) => { save(s); return s; })}
            />
            <div aria-live="polite" className="proof-hints">
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
          {(
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
                {spec.caption && <div className="row-hint">直接拖曳相紙上的字到想要的位置{spec.frame === "polaroid" ? "，拖到照片上也可以" : ""}；點字後可用方向鍵微調。</div>}
              </div>
            </div>
          )}
          {spec.caption && (
            <div className="row">
              <small>字體</small>
              <div>
                <div className="seg-q fonts" role="radiogroup" aria-label="一句話的字體">
                  {CAPTION_FONTS.map((f) => (
                    <button key={f.key} role="radio" aria-checked={(spec.captionFont ?? "hand") === f.key} onClick={() => update({ captionFont: f.key })} style={{ fontFamily: f.family, letterSpacing: 0 }}>{f.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {spec.caption && (
            <div className="row">
              <small>顏色</small>
              <div>
                <div className="inks" role="radiogroup" aria-label="一句話的顏色">
                  <button className="ink auto" role="radio" aria-checked={!isHexColor(spec.captionColor)} aria-label="自動" title="自動" onClick={() => update({ captionColor: undefined })} />
                  {CAPTION_COLORS.map((c) => (
                    <button key={c.key} className="ink" role="radio" aria-checked={(spec.captionColor ?? "").toLowerCase() === c.hex.toLowerCase()} aria-label={c.name} title={c.name} style={{ background: c.hex }} onClick={() => update({ captionColor: c.hex })} />
                  ))}
                  {(() => {
                    const custom = isHexColor(spec.captionColor) && !CAPTION_COLORS.some((c) => c.hex.toLowerCase() === spec.captionColor!.toLowerCase());
                    return (
                      <label className={`ink custom${custom ? " set" : ""}`} role="radio" aria-checked={custom} aria-label="自訂顏色" title="自訂顏色" style={custom ? ({ "--sw": spec.captionColor } as CSSProperties) : undefined}>
                        <input type="color" id="capColor" value={custom ? spec.captionColor! : "#C4302B"} onChange={(e) => update({ captionColor: e.target.value })} aria-label="自訂顏色" />
                      </label>
                    );
                  })()}
                  <span className="lb">{isHexColor(spec.captionColor) ? (CAPTION_COLORS.find((c) => c.hex.toLowerCase() === spec.captionColor!.toLowerCase())?.name ?? spec.captionColor!.toUpperCase()) : "自動"}</span>
                </div>
                <div className="row-hint">{isHexColor(spec.captionColor) ? "固定用這個顏色；壓在照片上時仍會加一層柔影。" : "自動：相紙下方用墨色，壓在照片上時依底色亮度選淺或深。"}</div>
              </div>
            </div>
          )}
          {spec.caption && (
            <div className="row">
              <small>大小</small>
              <div className="sizer">
                <input
                  type="range"
                  id="capSize"
                  min={CAPTION_SIZE.min}
                  max={captionMaxSizeMm(spec)}
                  step={0.1}
                  value={Math.min(captionMaxSizeMm(spec), spec.captionSizeMm ?? CAPTION_SIZE.default)}
                  onChange={(e) => update({ captionSizeMm: Number(e.target.value) })}
                  aria-label="一句話的字高"
                />
                <span className="mono">{captionSizeMm(spec).toFixed(1)} mm</span>
                <div className="row-hint">{captionMaxSizeMm(spec) < CAPTION_SIZE.max ? `這句話的長度最大放到 ${captionMaxSizeMm(spec).toFixed(1)} mm，想更大就寫短一點。` : ""}{isMobile ? "也可以在相紙上雙指縮放文字。" : "也可以把游標放在字上滾動滾輪，或拖曳字右下角的小點。"}</div>
              </div>
            </div>
          )}
          {spec.caption && (
            <div className="row">
              <small>旋轉</small>
              <div className="sizer">
                <input
                  type="range"
                  id="capRotate"
                  min={CAPTION_ROTATE.min}
                  max={CAPTION_ROTATE.max}
                  step={1}
                  value={captionRotate(spec)}
                  onChange={(e) => update({ captionRotate: Number(e.target.value) })}
                  aria-label="一句話的旋轉角度"
                />
                <span className="mono">{captionRotate(spec)}°{captionRotate(spec) !== 0 && <button className="btn txt" style={{ marginLeft: 12, fontSize: 11 }} onClick={() => update({ captionRotate: 0 })}>歸零</button>}</span>
                <div className="row-hint">{isMobile ? "整圈都可以轉；也可以在相紙上雙指扭轉文字。" : "整圈都可以轉；也可以拖曳字上方的小把手。"}</div>
              </div>
            </div>
          )}
          {finishEnabled && (
            <div className="row">
              <small>表面</small>
              <div>
                <div className="seg-q" role="radiogroup" aria-label="表面">
                  {(["glossy", "matte"] as const).map((v) => (
                    <button key={v} role="radio" aria-checked={spec.finish === v} onClick={() => update({ finish: v })}>{v === "glossy" ? "光面" : "霧面"}</button>
                  ))}
                </div>
                <div className="row-hint">{spec.finish === "glossy" ? "亮面相紙：顏色鮮、對比高，會反光，有指紋痕。" : "霧面相紙：不反光、顏色柔和，摸起來像舊照片。"}</div>
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
            stampChar={stampChar}
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
