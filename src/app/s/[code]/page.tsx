"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { esc, fmtDate, openLightbox, type LightboxPhoto } from "@/lib/ui";

type Gallery = {
  title: string;
  description: string;
  adminName: string;
  eventDate: string | null;
  code: string;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; gallery: Gallery; photos: LightboxPhoto[] };

export default function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    let alive = true;
    params.then(({ code: c }) => {
      setCode(c);
      fetch(`/api/share/${encodeURIComponent(c)}`)
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!alive) return;
          if (!r.ok) throw new Error(data.error || "Gallery not found");
          setState({ status: "ready", gallery: data.gallery, photos: data.photos || [] });
        })
        .catch((e: any) => {
          if (alive) setState({ status: "error", message: e?.message || "Something went wrong." });
        });
    });
    return () => {
      alive = false;
    };
  }, [params]);

  return (
    <>
      {/* NAV */}
      <nav className="nav scrolled">
        <div className="container-x flex items-center justify-between gap-6">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
            </span>
            <span>LensLink</span>
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm">← Back to home</Link>
        </div>
      </nav>

      {state.status === "loading" && (
        <div className="min-h-screen grid place-items-center" style={{ background: "var(--bg)" }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl border-2 border-[#baff3a]/30 border-t-[#baff3a] animate-spin mb-5"></div>
            <p className="text-gray-400 text-sm">Opening gallery…</p>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="min-h-screen grid place-items-center" style={{ background: "var(--bg)" }}>
          <div className="empty-state">
            <div className="big">🕊️</div>
            <h3>{esc(state.message)}</h3>
            <p>Double-check the link you received, or ask your photographer for a fresh one.</p>
            <Link href="/" className="btn btn-primary mt-8">Go to LensLink</Link>
          </div>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <header className="view-hero">
            <div className="container-x relative">
              <div className="flex items-center gap-4 flex-wrap anim-fade-up">
                <span className="view-hero mark">
                  <svg viewBox="0 0 96 96" width="26" height="26"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
                </span>
                <span className="owner-chip">◉ {esc(state.gallery.adminName)}</span>
              </div>
              <h1 style={{ animation: "fade-up .8s var(--ease) .1s both" }}>{esc(state.gallery.title)}</h1>
              {state.gallery.description && <p className="desc anim-fade-up" style={{ animationDelay: ".2s" }}>{esc(state.gallery.description)}</p>}
              <div className="meta-row anim-fade-up" style={{ animationDelay: ".3s" }}>
                <span className="mi"><span className="ic">📅</span>{state.gallery.eventDate ? fmtDate(state.gallery.eventDate) : "Event gallery"}</span>
                <span className="mi"><span className="ic">🖼️</span>{state.photos.length.toLocaleString()} photos</span>
                <span className="mi"><span className="ic">🔗</span>/{esc(state.gallery.code)}</span>
              </div>
            </div>
          </header>

          <section className="view-photos">
            <div className="container-x">
              {state.photos.length === 0 ? (
                <div className="empty-state">
                  <div className="big">📷</div>
                  <h3>No photos published yet</h3>
                  <p>Your photographer is still working on this gallery — check back soon!</p>
                </div>
              ) : (
                <>
                  <div className="view-toolbar">
                    <div>
                      <p className="crumb">Gallery</p>
                      <h2 className="text-2xl font-extrabold">All moments</h2>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        openLightbox(
                          state.photos.map((p) => ({ id: p.id, name: p.name, src: p.src })),
                          0,
                          state.photos[0]?.name || "photo"
                        )
                      }
                    >
                      ⬇ Download originals
                    </button>
                  </div>
                  <div className="tiles">
                    {state.photos.map((p, i) => (
                      <button
                        key={p.id}
                        className="tile"
                        onClick={() =>
                          openLightbox(
                            state.photos.map((x) => ({ id: x.id, name: x.name, src: x.src })),
                            i
                          )
                        }
                        style={{ animationDelay: `${Math.min(i * 0.03, 0.6)}s` }}
                      >
                        <img src={p.src} alt={esc(p.name) || "photo"} loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <footer className="footer" style={{ marginTop: 0 }}>
            <div className="container-x">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <Link href="/" className="brand">
                  <span className="brand-mark">
                    <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
                  </span><span>LensLink</span>
                </Link>
                <p style={{ fontSize: 13, color: "var(--muted-2)" }}>Photos are private to this link · © {new Date().getFullYear()} LensLink</p>
              </div>
            </div>
          </footer>
        </>
      )}
    </>
  );
}