'use client';

export default function MosquitoWatermark() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] pointer-events-none opacity-[0.08]"
      style={{ stroke: 'white', strokeWidth: 0.8 }}
    >
      <ellipse cx="200" cy="200" rx="12" ry="35" />
      <circle cx="200" cy="150" r="8" />
      <line x1="200" y1="142" x2="200" y2="118" />
      <path d="M195 148 Q180 130 170 135" />
      <path d="M205 148 Q220 130 230 135" />
      <path d="M190 190 Q140 160 120 200 Q140 240 185 210" />
      <path d="M188 200 Q130 180 110 210 Q135 250 182 220" />
      <path d="M210 190 Q260 160 280 200 Q260 240 215 210" />
      <path d="M212 200 Q270 180 290 210 Q265 250 218 220" />
      <path d="M192 220 Q170 250 160 280" />
      <path d="M208 220 Q230 250 240 280" />
      <path d="M190 235 Q165 260 150 290" />
      <path d="M210 235 Q235 260 250 290" />
      <path d="M188 250 Q160 280 145 310" />
      <path d="M212 250 Q240 280 255 310" />
    </svg>
  );
}
