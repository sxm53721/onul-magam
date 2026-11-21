import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "마감할인 — 영종도 동네 가게",
    short_name: "마감할인",
    description: "동네 가게의 오늘 마감할인을 알림으로 받아보세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#faf6ef",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
