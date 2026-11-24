import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the tile is full-bleed here.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1f1f21" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="16" fill="none" stroke="#3a3a3c" strokeWidth="8" />
          <path d="M32 16A16 16 0 1 1 18.68 40.85" fill="none" stroke="#f2b340" strokeWidth="8" />
        </svg>
      </div>
    ),
    size,
  );
}
