"use client";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { api } from "@/lib/client-store";
import type { Settings } from "@/lib/db/schema";
import { PAPER_COLORS, SAFE_INSET } from "@/lib/print-spec";

const CHECK = ["紙張：Postcard 100 × 148 mm", "無邊框列印：開", "縮放：無（100%）", "影像最佳化 / 自動修正：關", "日期戳記、美肌、紅眼：關"];

export function SettingsForm({ settings, storageKind }: { settings: Settings; storageKind: string }) {
  const [s, setS] = useState(settings);
  const [calib, setCalib] = useState<{ top: string; right: string; bottom: string; left: string }>({
    top: settings.calibration ? String(settings.calibration.top) : "",
    right: settings.calibration ? String(settings.calibration.right) : "",
    bottom: settings.calibration ? String(settings.calibration.bottom) : "",
    left: settings.calibration ? String(settings.calibration.left) : "",
  });
  const [busy, setBusy] = useState(false);
  const patch = async (p: Record<string, unknown>, msg = "已儲存") => {
    try { const row = await api<Settings>("/api/admin/settings", { method: "PATCH", json: p }); setS(row); toast(msg); } catch (e) { toast(e instanceof Error ? e.message : "儲存失敗", true); }
  };
  const colors = { ...Object.fromEntries(PAPER_COLORS.map((c) => [c.key, c.hex])), ...(s.paperColors ?? {}) };
  const nums = [calib.top, calib.right, calib.bottom, calib.left].map(Number);
  const calibOk = [calib.top, calib.right, calib.bottom, calib.left].every((v) => v !== "" && !isNaN(Number(v)));
  const c = calibOk ? nums : [3, 3, 3, 3];
  const saveCalib = () => calibOk && patch({ calibration: { top: nums[0], right: nums[1], bottom: nums[2], left: nums[3] } }, "校正數值已儲存");

  return (
    <div className="cols">
      <div className="sect">
        <h2>印表機檢查清單</h2>
        <div className="list">
          {CHECK.map((label, i) => (
            <label className="it chk" key={i}>
              <span>{label}</span>
              <span style={{ display: "inline-flex", alignItems: "center" }}><input type="checkbox" checked={!!s.checklist[i]} onChange={(e) => { const next = [...s.checklist]; while (next.length < CHECK.length) next.push(false); next[i] = e.target.checked; patch({ checklist: next }, "清單已更新"); }} /><i /></span>
            </label>
          ))}
        </div>
        <div className="mono-sm">Canon SELPHY CP1500 · Postcard 100 × 148 mm · 300 dpi · 儲存：{storageKind}</div>
      </div>

      <div className="sect">
        <h2>校正</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>印一張校正圖，量出四邊被裁掉的毫米數填回來。未填時訪客端的相紙會標示「尚未校正」。</p>
        <div className="acts"><a className="btn sec" href="/api/admin/calibration" download="calibration.png">下載校正圖</a></div>
        <div className="calib">
          {(["top", "right", "bottom", "left"] as const).map((k) => (
            <div className="box" key={k}><label htmlFor={`c-${k}`}>{{ top: "上", right: "右", bottom: "下", left: "左" }[k]} mm</label><input id={`c-${k}`} type="number" step="0.5" min="0" max="8" placeholder="3" value={calib[k]} onChange={(e) => setCalib({ ...calib, [k]: e.target.value })} onBlur={saveCalib} /></div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--s5)", alignItems: "center" }}>
          <div className="safe-preview"><i style={{ top: `${((c[0] + SAFE_INSET) / 148) * 100}%`, right: `${((c[1] + SAFE_INSET) / 100) * 100}%`, bottom: `${((c[2] + SAFE_INSET) / 148) * 100}%`, left: `${((c[3] + SAFE_INSET) / 100) * 100}%` }} /></div>
          <div className="mono-sm">{s.calibration ? <>已校正<br />安全區 = 出血 + {SAFE_INSET} mm</> : <><span style={{ color: "var(--warn)" }}>尚未校正</span><br />以預估 3 mm 計算</>}</div>
        </div>
      </div>

      <div className="sect">
        <h2>紙色</h2>
        <div className="swatches">
          {PAPER_COLORS.map((p) => (
            <div className="sw" key={p.key}>
              <i style={{ background: colors[p.key] }} />
              <span>{p.name}</span>
              <input className="inline" defaultValue={colors[p.key]} onBlur={(e) => { const v = e.target.value.trim().toUpperCase(); if (!/^#[0-9A-F]{6}$/.test(v)) { toast("色碼格式要像 #F3ECDD", true); return; } if (v !== colors[p.key]) patch({ paperColors: { ...colors, [p.key]: v } }, "紙色已更新，已送出的訂單可按「重新產生」套用"); }} aria-label={`${p.name} 色碼`} />
            </div>
          ))}
        </div>
        <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={s.finishEnabled} onChange={(e) => patch({ finishEnabled: e.target.checked }, e.target.checked ? "訪客可以選表面" : "表面固定為光面")} /><i />開放訪客選擇光面 / 霧面</label>
        <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={s.physicalFrameEnabled} onChange={(e) => patch({ physicalFrameEnabled: e.target.checked }, e.target.checked ? "訪客可以選相框" : "不提供相框")} /><i />開放訪客選擇真實相框（白色 / 木紋）</label>
      </div>

      <div className="sect">
        <h2>工作室</h2>
        <div className="box"><label htmlFor="st-name">名稱</label><input id="st-name" value={s.studioName} onChange={(e) => setS({ ...s, studioName: e.target.value })} /></div>
        <div className="box"><label htmlFor="st-stamp">印章字</label><input id="st-stamp" value={s.stampChar} maxLength={2} style={{ width: 80 }} onChange={(e) => setS({ ...s, stampChar: e.target.value })} /></div>
        <div className="box"><label htmlFor="st-story">成功頁的一段話</label><input id="st-story" value={s.successStory} onChange={(e) => setS({ ...s, successStory: e.target.value })} /></div>
        <div className="acts"><button className={`btn${busy ? " loading" : ""}`} disabled={busy} onClick={async () => { setBusy(true); await patch({ studioName: s.studioName.trim(), stampChar: s.stampChar.trim() || "傑", successStory: s.successStory.trim() }, "設定已儲存"); setBusy(false); }}>儲存</button></div>
        <div className="mono-sm">密碼在環境變數 ADMIN_PASSWORD 設定。</div>
      </div>
    </div>
  );
}
