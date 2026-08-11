"use client";

import { useEffect, useRef } from "react";

/* ---------------- toasts ---------------- */
export function toast(message: string, type: "" | "success" | "error" = "") {
  let wrap = document.querySelector(".ll-toasts") as HTMLElement | null;
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "ll-toasts";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `ll-toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "✕" : "•"}</span><span>${esc(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 400);
  }, 3300);
}

/* ---------------- modal ---------------- */
export function openModal(html: string, { wide = false }: { wide?: boolean } = {}) {
  const back = document.createElement("div");
  back.className = "ll-modal-back";
  back.innerHTML = `<div class="ll-modal ${wide ? "ll-modal-wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  back.addEventListener("mousedown", (e) => {
    if (e.target === back) closeModal(back);
  });
  return back;
}

export function closeModal(back: HTMLElement) {
  back.style.opacity = "0";
  back.style.transition = "opacity .25s";
  setTimeout(() => back.remove(), 250);
}

/* ---------------- scroll reveal + counters ---------------- */
export function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("ll-visible");
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".ll-reveal").forEach((el) => io.observe(el));

  document.querySelectorAll(".ll-count").forEach((el) => {
    const target = Number((el as HTMLElement).dataset.count || 0);
    const suffix = (el as HTMLElement).dataset.suffix || "";
    const io2 = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io2.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    io2.observe(el);
  });
}

/* ---------------- lightbox ---------------- */
export type LightboxPhoto = { id: string; name: string; src: string };

export function openLightbox(arr: LightboxPhoto[], startIndex: number, downloadName?: string) {
  if (!arr.length) return;
  let x = Math.max(0, Math.min(startIndex || 0, arr.length - 1));
  const box = document.createElement("div");
  box.className = "ll-lightbox";
  box.innerHTML = `
    <button class="ll-lb-close">✕</button>
    ${downloadName ? '<a class="ll-lb-download" href="#">⬇ Download</a>' : ""}
    ${arr.length > 1 ? '<button class="ll-lb-nav ll-lb-prev">‹</button><button class="ll-lb-nav ll-lb-next">›</button>' : ""}
    <img class="ll-lb-img" src="" alt="">
    <div class="ll-lb-name"></div>
    <div class="ll-lb-counter"></div>`;
  document.body.appendChild(box);
  document.body.style.overflow = "hidden";

  const img = box.querySelector(".ll-lb-img") as HTMLImageElement;
  const nameEl = box.querySelector(".ll-lb-name") as HTMLElement;
  const counter = box.querySelector(".ll-lb-counter") as HTMLElement;
  const dl = box.querySelector(".ll-lb-download") as HTMLAnchorElement | null;

  const render = () => {
    const p = arr[x];
    img.src = p.src;
    nameEl.textContent = p.name || "";
    counter.textContent = `${x + 1} / ${arr.length}`;
    img.classList.remove("ll-pop");
    void img.offsetWidth;
    img.classList.add("ll-pop");
    if (dl && p.id) dl.href = `${p.src}${p.src.includes("?") ? "&" : "?"}alt=media`;
  };
  render();

  const prev = box.querySelector(".ll-lb-prev"),
    next = box.querySelector(".ll-lb-next");
  if (prev) prev.addEventListener("click", (e) => { e.stopPropagation(); x = (x - 1 + arr.length) % arr.length; render(); });
  if (next) next.addEventListener("click", (e) => { e.stopPropagation(); x = (x + 1) % arr.length; render(); });
  box.querySelector(".ll-lb-close")!.addEventListener("click", close);
  box.addEventListener("click", (e) => {
    if (e.target === box) close();
    if (e.target === img) { x = (x + 1) % arr.length; render(); }
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") { x = (x - 1 + arr.length) % arr.length; render(); }
    if (e.key === "ArrowRight") { x = (x + 1) % arr.length; render(); }
  };
  document.addEventListener("keydown", onKey);
  function close() {
    document.removeEventListener("keydown", onKey);
    box.style.opacity = "0";
    box.style.transition = "opacity .3s";
    document.body.style.overflow = "";
    setTimeout(() => box.remove(), 300);
  }
}

/* ------------- misc helpers ------------- */
export function esc(s: unknown) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function initials(name: string) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function useRevealOnMount() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) initReveal();
  }, []);
  return ref;
}

export function sanitizeName(name: string) {
  const base = String(name || "photo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "photo").slice(0, 40);
}