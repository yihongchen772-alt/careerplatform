"use client";

import { useId } from "react";

/** Crisp in-app version of public/icon-source.svg. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId();

  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={className}
      role="presentation"
    >
      <defs>
        <linearGradient id={`${id}-canvas`} x1="42" y1="28" x2="476" y2="500" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24354D" />
          <stop offset="0.52" stopColor="#17243A" />
          <stop offset="1" stopColor="#0D1729" />
        </linearGradient>
        <linearGradient id={`${id}-needle`} x1="205" y1="117" x2="305" y2="370" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D8E9F9" />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="216" y1="276" x2="306" y2="391" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B6D7F2" />
          <stop offset="1" stopColor="#6DA4D4" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}-canvas)`} />
      <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke="#FFFFFF" strokeOpacity="0.13" strokeWidth="4" />
      <circle cx="256" cy="256" r="149" fill="none" stroke="#D5E9FB" strokeOpacity="0.28" strokeWidth="7" />
      <path d="M256 113 328 345 256 303 184 345 256 113Z" fill={`url(#${id}-needle)`} />
      <path d="m184 345 72-42 72 42-72 64-72-64Z" fill={`url(#${id}-tail)`} />
      <path d="m256 303 72 42-72 64V303Z" fill="#7AADD8" />
    </svg>
  );
}
