"use client";
import { useId } from "react";

/**
 * 印章：手刻的朱文印。邊框有缺角與粗細不均，字用楷體，墨以 multiply 疊在紙上。
 * DESIGN_SYSTEM §3.18。動效（drop）由外層 class 控制。
 */
export function Stamp({ char, size = 56, className = "", blend = true }: { char: string; size?: number; className?: string; blend?: boolean }) {
  const id = useId().replace(/:/g, "");
  const seed = (char.codePointAt(0) ?? 7) % 11;
  return (
    <svg
      className={`stamp-svg ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ mixBlendMode: blend ? "multiply" : "normal" }}
    >
      <defs>
        {/* 刻痕：讓邊線與字的邊緣略微不平整 */}
        <filter id={`rough-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* 墨色不均：以細噪點削薄部分不透明度 */}
        <filter id={`ink-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed={seed + 3} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#ink-${id})`} opacity="0.92">
        <g filter={`url(#rough-${id})`} fill="none" stroke="#C4302B" strokeLinejoin="round" strokeLinecap="round">
          {/* 手刻的圓印：不是正圓，略有起伏，一側較厚 */}
          <path d="M50 9 C 72 8 92 27 91 50 C 92 72 73 91 50 91 C 28 92 9 73 9 50 C 8 28 27 10 50 9 Z" strokeWidth="5" />
          <path d="M50 17 C 68 16 83 32 83 50 C 84 68 68 83 50 83 C 32 84 17 68 17 50 C 16 32 32 18 50 17 Z" strokeWidth="1.4" opacity="0.5" />
        </g>
        <text
          x="50"
          y="53"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'LXGW WenKai TC', 'Kaiti TC', serif"
          fontSize="46"
          fontWeight="400"
          fill="#C4302B"
          filter={`url(#rough-${id})`}
        >
          {char}
        </text>
      </g>
    </svg>
  );
}
