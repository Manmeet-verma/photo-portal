"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { initReveal } from "@/lib/ui";

const BILLING = ["Month Plan", "Half Year Plan", "Annual Plan"] as const;

const PRICING: Record<(typeof BILLING)[number], { n: string; amt: string; per: string; tag?: string; f: string[]; pop: boolean }[]> = {
  "Month Plan": [
    { n: "RIDER", amt: "Free", per: "for Lifetime", f: ["1000 Images", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER SMALL", amt: "₹749", per: "Per Month", f: ["50GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER", amt: "₹1099", per: "Per Month", f: ["100GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "BIKER", amt: "₹1499", per: "Per Month", f: ["700GB", "AI Face Search", "Reelit", "Photo Selling"], pop: true },
    { n: "PILOT", amt: "₹2499", per: "Per Month", f: ["1.3TB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
  ],
  "Half Year Plan": [
    { n: "RIDER", amt: "Free", per: "for Lifetime", f: ["1000 Images", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER SMALL", amt: "₹629", per: "Per Month", f: ["50GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER", amt: "₹916", per: "Per Month", f: ["100GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "BIKER", amt: "₹1250", per: "Per Month", f: ["700GB", "AI Face Search", "Reelit", "Photo Selling"], pop: true },
    { n: "PILOT", amt: "₹2083", per: "Per Month", f: ["1.3TB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
  ],
  "Annual Plan": [
    { n: "RIDER", amt: "Free", per: "for Lifetime", f: ["1000 Images", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER SMALL", amt: "₹494", per: "Per Month", f: ["50GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "SKATER", amt: "₹749", per: "Per Month", f: ["100GB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
    { n: "BIKER", amt: "₹1041", per: "Per Month", f: ["700GB", "AI Face Search", "Reelit", "Photo Selling"], pop: true },
    { n: "PILOT", amt: "₹1736", per: "Per Month", f: ["1.3TB", "AI Face Search", "Reelit", "Photo Selling"], pop: false },
  ],
};

const FAQS: [string, string][] = [
  ["What is LensLink?", "LensLink is an AI photo gallery platform for event photographers and organisers. Guests find their photos in seconds with AI face search — no apps, no endless scrolling."],
  ["Who is LensLink built for?", "Professional event photographers, wedding studios, school photography teams, corporate event organisers and sports-day shooters who deliver photos to hundreds of guests."],
  ["Is LensLink free to use?", "Yes — the Rider plan is free forever with 1,000 images, AI face search, branded galleries and photo selling. No credit card required."],
  ["How does the AI face search work?", "Faces in every uploaded photo are detected and clustered automatically. Each guest scans the QR code, registers with a selfie, and instantly sees only the photos they appear in."],
  ["How is LensLink different from Google Drive or Dropbox?", "Drive and Dropbox are storage — LensLink is delivery. Guests get notified on WhatsApp, search by face, and buy their favourite shots right inside the branded gallery."],
  ["Can I sell photos to guests?", "Yes. Set your price per photo or sell full event access, enable checkout, and get paid directly from the gallery — no redirects, no extra storefront."],
  ["Who owns the photos I upload?", "You do. LensLink never claims ownership of your media, and galleries only share specific photos with the people in them."],
  ["How do guests get access to their photos?", "They scan the event QR code, register once, and LensLink notifies them the moment their photos are published — with a private link to their gallery."],
];

const BLOGS = [
  { img: "/assets/demo/wedding-2.jpg", cat: "Tips and Tricks", date: "Aug 6, 2026", title: "10 Best Photo Sharing Platforms for Event Photographers (2026)", author: "LensLink Team", ini: "LT" },
  { img: "/assets/demo/sports-1.jpg", cat: "Sports", date: "Aug 4, 2026", title: "Delivering Race Day Photos at Scale: The 2026 Photographers' Workflow", author: "LensLink Team", ini: "LT" },
  { img: "/assets/demo/event-1.jpg", cat: "AI & Storage", date: "Jul 30, 2026", title: "How AI Face Recognition Turns Event Galleries Into Income", author: "LensLink Team", ini: "LT" },
];

const TESTIMONIALS = [
  ["PS", "Priya Sharma", "@priyalens.weddings", "As a luxury wedding photographer in Mumbai, LensLink is a game-changer! It handles our high-volume shoots and the AI understanding of Indian wedding ceremonies helps me deliver faster than ever.", "Mar 15, 2026"],
  ["JM", "Jessica Martinez", "@jessicamweddings", "From engagement shoots to destination weddings, LensLink has streamlined my entire workflow. The smart selection feature understands exactly which moments matter most to my couples!", "Mar 10, 2026"],
  ["AM", "Arjun Mehta", "@arjun.events", "Managing multiple wedding events weekly is challenging, but LensLink helps our photography team stay organized. As an event planner, I love how quickly we can share previews with clients!", "Mar 02, 2026"],
  ["EP", "Emily Parker", "@eparkerevents", "Our agency handles 200+ events yearly. LensLink has become essential for our in-house photography team — the quick turnaround keeps our clients incredibly happy!", "Feb 28, 2026"],
];

function OwlMascot() {
  return (
    <svg viewBox="0 0 96 96" width="100%" height="100%" role="img" aria-label="LensLink mascot">
      <circle cx="48" cy="50" r="42" fill="#0f1622" stroke="#1d2637" strokeWidth="2.5" />
      <path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#baff3a" />
      <circle cx="24" cy="34" r="5" fill="#9fd92a" opacity=".6" />
      <circle cx="72" cy="34" r="5" fill="#9fd92a" opacity=".6" />
      <ellipse cx="27" cy="55" rx="17" ry="21" fill="#171f2e" stroke="#2a3448" strokeWidth="2" transform="rotate(-8 27 55)" />
      <ellipse cx="69" cy="55" rx="17" ry="21" fill="#171f2e" stroke="#2a3448" strokeWidth="2" transform="rotate(8 69 55)" />
      <circle cx="30" cy="53" r="6" fill="#fff" />
      <circle cx="30" cy="53" r="3" fill="#0a0f18" />
      <circle cx="66" cy="53" r="6" fill="#fff" />
      <circle cx="66" cy="53" r="3" fill="#0a0f18" />
      <path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#baff3a" />
      <path d="M42 71 L40 89 Q48 92 56 89 L54 71 Z" fill="#8fd61c" opacity=".85" />
      <circle cx="48" cy="62" r="5.5" fill="#f0c06a" stroke="#0a0f18" strokeWidth="1.5" />
      <circle cx="48" cy="71" r="1.8" fill="#fff" />
    </svg>
  );
}

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [billing, setBilling] = useState<(typeof BILLING)[number]>("Month Plan");
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    const nav = document.getElementById("site-nav");
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    initReveal();

    /* scroll progress bar */
    const bar = document.createElement("div");
    bar.className = "ll-progress";
    document.body.appendChild(bar);
    const onProgress = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = `${Math.min(100, p * 100).toFixed(1)}%`;
    };
    onProgress();
    window.addEventListener("scroll", onProgress, { passive: true });

    /* cursor spotlight */
    const spot = document.createElement("div");
    spot.className = "ll-spotlight";
    document.body.appendChild(spot);
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: MouseEvent) => {
      spot.style.setProperty("--sx", `${e.clientX}px`);
      spot.style.setProperty("--sy", `${e.clientY}px`);
      if (!spot.classList.contains("on")) spot.classList.add("on");
    };
    if (finePointer) window.addEventListener("mousemove", onMove, { passive: true });

    /* hero parallax (mouse) */
    const hero = document.querySelector(".hero") as HTMLElement | null;
    const layers = hero ? Array.from(hero.querySelectorAll<HTMLElement>(".catch-card, .mascot")) : [];
    const onHeroMove = (e: MouseEvent) => {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((el) => {
        const layer = Number(el.dataset.depth || 1);
        el.style.translate = `${-dx * 16 * layer}px ${-dy * 11 * layer}px`;
      });
    };
    if (hero && finePointer) hero.addEventListener("mousemove", onHeroMove, { passive: true });

    /* hero scroll parallax — collage drifts slower than the page */
    const collage = hero?.querySelector(".catch-grid") as HTMLElement | null;
    const onHeroScroll = () => {
      const y = window.scrollY;
      if (collage && y < window.innerHeight * 1.4) {
        collage.style.transform = `translateY(${y * 0.08}px)`;
      }
    };
    onHeroScroll();
    window.addEventListener("scroll", onHeroScroll, { passive: true });

    /* floating particles in hero */
    const ptWrap = document.createElement("div");
    ptWrap.className = "particles";
    hero?.appendChild(ptWrap);
    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("i");
      const size = 2 + Math.random() * 4;
      const drift = (Math.random() - 0.5) * 120;
      p.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;bottom:-${(Math.random() * 10 + 2).toFixed(1)}px;` +
        `width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` +
        `--px:${drift.toFixed(1)}px;--po:${(0.15 + Math.random() * 0.45).toFixed(2)};` +
        `animation-duration:${(9 + Math.random() * 16).toFixed(1)}s;animation-delay:-${(Math.random() * 20).toFixed(1)}s;`;
      ptWrap.appendChild(p);
    }

    /* magnetic buttons */
    document.querySelectorAll<HTMLElement>(".btn-magnetic").forEach((btn) => {
      if (!finePointer) return;
      const onLeave = () => { btn.style.translate = ""; };
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.translate = `${(dx * 0.16).toFixed(1)}px ${(dy * 0.16).toFixed(1)}px`;
      });
      btn.addEventListener("mouseleave", onLeave);
    });

    /* cursor-follow glow on cards */
    document.querySelectorAll<HTMLElement>(".glow-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });

    /* click ripple on buttons */
    document.querySelectorAll<HTMLElement>(".btn").forEach((b) => {
      b.addEventListener("click", (e) => {
        const r = b.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 1.4;
        const d = document.createElement("span");
        d.className = "ripple";
        d.style.cssText = `width:${size}px;height:${size}px;left:${(e.clientX - r.left - size / 2).toFixed(1)}px;top:${(e.clientY - r.top - size / 2).toFixed(1)}px`;
        b.appendChild(d);
        setTimeout(() => d.remove(), 700);
      });
    });

    /* use-case wall scroll parallax */
    const ucCards = Array.from(document.querySelectorAll<HTMLElement>(".uc-card"));
    ucCards.forEach((c) => {
      c.dataset.base = c.style.transform || "none";
    });
    const onUcScroll = () => {
      const mid = window.innerHeight / 2;
      ucCards.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const depth = Number(c.dataset.depth || 1);
        const y = r.top + r.height / 2 - mid;
        c.style.transform = `${c.dataset.base || "none"} translateY(${(y * 0.05 * (2 - depth * 0.25)).toFixed(1)}px)`;
      });
    };
    onUcScroll();
    window.addEventListener("scroll", onUcScroll, { passive: true });

    /* back to top */
    const toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.innerHTML = "&#8593;";
    toTop.setAttribute("aria-label", "Back to top");
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(toTop);
    const onToTop = () => toTop.classList.toggle("show", window.scrollY > 640);
    onToTop();
    window.addEventListener("scroll", onToTop, { passive: true });

    /* sidebar: close on escape */
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar) sidebar.classList.remove("open");
      }
    };
    document.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onProgress);
      window.removeEventListener("scroll", onHeroScroll);
      window.removeEventListener("scroll", onToTop);
      window.removeEventListener("scroll", onUcScroll);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("mousemove", onMove);
      hero?.removeEventListener("mousemove", onHeroMove);
      bar.remove();
      spot.remove();
      ptWrap.remove();
      toTop.remove();
    };
  }, []);

  const plans = PRICING[billing];

  return (
    <>
      {/* NAV */}
      <nav className="nav" id="site-nav">
        <div className="container-x flex items-center justify-between gap-6">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
            </span>
            <span>LensLink</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#use-cases">Use Cases</a>
            <a className="nav-link" href="#monetize">Products</a>
            <a className="nav-link" href="#pricing">Pricing</a>
            <a className="nav-link" href="#faq">Resources</a>
            <div className="dd-wrap">
              <button className="nav-link" style={{ background: "none", border: 0, cursor: "pointer" }}>
                Pages
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 5 }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              <div className="dd">
                <div className="dd-head">Site pages</div>
                <a href="/login"><span className="di">🔐</span>Login</a>
                <a href="/login?tab=register"><span className="di">✨</span>Create account</a>
                <a href="/admin.html"><span className="di">📊</span>Studio dashboard</a>
                <a href="/account.html"><span className="di">🖼️</span>Customer portal</a>
                <a href="/s/EXAMPLEGALLERY"><span className="di">📤</span>Shared gallery view</a>
                <div className="dd-head">On this page</div>
                <a href="#how"><span className="di">⚙️</span>How it works</a>
                <a href="#monetize"><span className="di">💰</span>Photo selling</a>
                <a href="#faq"><span className="di">💬</span>FAQ</a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link className="btn btn-ghost btn-sm hidden sm:inline-flex" href="/login">Login</Link>
            <Link className="btn btn-primary btn-sm hidden sm:inline-flex" href="/login?tab=register">Start Free Trial</Link>
            <button className="nav-burger" aria-label="Open menu" onClick={() => setSideOpen(true)}>☰</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-grid"></div>
        <div className="aurora"></div>
        <div className="hero-orb orb-1"></div>
        <div className="hero-orb orb-2"></div>
        <div className="container-x relative grid lg:grid-cols-[1.02fr_.98fr] gap-16 items-center">
          <div>
            <span className="hero-pill anim-fade-up"><span className="dot"></span>✨ AI POWERED TOOL FOR YOUR MEDIA ASSETS</span>
            <h1 className="anim-fade-up" style={{ animationDelay: ".1s" }}>
              AI Photo Gallery for <span className="hl-grad">Event Photographers</span>
            </h1>
            <p className="hero-sub anim-fade-up" style={{ animationDelay: ".2s" }}>
              Built for events. Engage with your clients by sharing photos via AI face recognition — create
              branded galleries, deliver via WhatsApp, and sell photos automatically. No apps. No waiting.
            </p>
            <div className="flex gap-4 mt-8 flex-wrap anim-fade-up" style={{ animationDelay: ".3s" }}>
              <Link href="/login?tab=register" className="btn btn-primary btn-lg btn-magnetic btn-pulse">Start Free Trial</Link>
              <span className="btn btn-ghost btn-lg btn-magnetic" style={{ cursor: "default" }}>No Credit Card Required</span>
            </div>
            <div className="hero-badges anim-fade-up" style={{ animationDelay: ".4s" }}>
              {["Weddings", "Sports", "Music Festivals", "Corporate Events", "Schools"].map((t) => (
                <span key={t} className="hero-badge">{t}</span>
              ))}
            </div>
            <div className="hero-stats anim-fade-up" style={{ animationDelay: ".5s" }}>
              <div><b><span className="ll-count" data-count={200} data-suffix="K+">0</span></b><span>Users</span></div>
              <div className="div"></div>
              <div><b><span className="ll-count" data-count={300} data-suffix="K+">0</span></b><span>Events</span></div>
              <div className="div"></div>
              <div><b><span className="ll-count" data-count={1} data-suffix="B+">0</span></b><span>Photos Shared</span></div>
              <div className="div"></div>
              <div><b><span className="ll-count" data-count={8} data-suffix="M+">0</span></b><span>Guests Served</span></div>
            </div>
          </div>

          <div className="catch-grid relative h-[560px] hidden md:block anim-pop" style={{ animationDelay: ".3s" }}>
            <div className="spin-badge" style={{ top: -8, right: -10, display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 100 100">
                <defs><path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
                <text><textPath href="#circ">AI POWERED • FACE SEARCH • INSTANT DELIVERY • </textPath></text>
              </svg>
              <span className="core">✦</span>
            </div>
            <div className="mascot" style={{ position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)", width: 230, height: 230, zIndex: 1 }} data-depth={1}>
              <div className="mascot-ring"></div>
              <OwlMascot />
              <span className="catch-note" style={{ top: -6, right: -58 }}>Catch Me!</span>
            </div>
            <div className="catch-card" data-depth={2} style={{ width: "44%", aspectRatio: "4/5", top: 0, right: 0, transform: "rotate(4deg)" }}>
              <img src="/assets/demo/wedding-1.jpg" alt="Wedding gallery" />
              <div className="cap">💍 Wedding · <span className="tag">2,480 photos</span></div>
            </div>
            <div className="catch-card" data-depth={3} style={{ width: "38%", aspectRatio: "1/1", top: 116, left: 0, transform: "rotate(-6deg)" }}>
              <img src="/assets/demo/sports-1.jpg" alt="Sports gallery" />
              <div className="cap">🏁 Sports · <span className="tag">Beam uploads</span></div>
            </div>
            <div className="catch-card" data-depth={2} style={{ width: "40%", aspectRatio: "1/1.15", right: 4, bottom: 0, transform: "rotate(3deg)" }}>
              <img src="/assets/demo/band-1.jpg" alt="Festival gallery" />
              <div className="cap">🎤 Festivals · <span className="tag">Face search</span></div>
            </div>
            <div className="catch-card" data-depth={4} style={{ width: "34%", aspectRatio: "1/1", left: 8, bottom: 30, transform: "rotate(-3deg)" }}>
              <img src="/assets/demo/event-2.jpg" alt="Corporate event" />
              <div className="cap">🏢 Corporate · <span className="tag">Branded</span></div>
            </div>
          </div>
        </div>
      </header>

      {/* TRUSTED MARQUEE */}
      <div className="marquee">
        <div className="marquee-track" style={{ width: "max-content" }}>
          {[...Array(2)].map((_, r) =>
            [
              ["✸", "Wedding Studios"], ["✦", "Corporate Events"], ["✸", "School Photography"], ["✦", "Sports Days"],
              ["✸", "Music Festivals"], ["✦", "Family Sessions"], ["✸", "Fashion Shoots"],
            ].map(([mk, t], i) => (
              <span key={`${r}-${i}`}><b>{mk}</b>{t}</span>
            ))
          )}
        </div>
      </div>

      {/* REVERSE MARQUEE */}
      <div className="marquee marquee-rev" style={{ borderTop: 0, padding: "18px 0" }}>
        <div className="marquee-track" style={{ width: "max-content" }}>
          {[...Array(2)].map((_, r) =>
            ["✦ Trusted by 75,000+ event studios worldwide", "✸ 1B+ photos delivered", "✦ AI face search on every gallery", "✸ WhatsApp-ready sharing", "✦ Free forever plan · Rider"].map((t, i) => (
              <span key={`${r}-${i}`}>{t}</span>
            ))
          )}
        </div>
      </div>

      {/* USE CASES */}
      <section className="section" id="use-cases">
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Built for events</span>
            <h2>One platform. Every kind of event.</h2>
            <p>From weddings to marathons — LensLink handles real-time uploads, AI face recognition and photo selling.</p>
          </div>
          <div className="uc-wall relative h-[560px] hidden md:block">
            <Link href="/login?tab=register" className="uc-card" data-depth={1} style={{ width: "30%", aspectRatio: "1/1.28", left: 0, top: 0, transform: "rotate(-4deg)", zIndex: 1 }}>
              <img src="/assets/demo/wedding-1.jpg" alt="Weddings" />
              <div className="cap"><b>Weddings</b><span>AI selection · WhatsApp delivery · branded galleries</span><span className="arrow">→</span></div>
            </Link>
            <Link href="/login?tab=register" className="uc-card" data-depth={2} style={{ width: "27%", aspectRatio: "1/1.28", left: "24%", top: 20, transform: "rotate(2deg)", zIndex: 2 }}>
              <img src="/assets/demo/sports-1.jpg" alt="Sports" />
              <div className="cap"><b>Sports</b><span>Real-time Beam uploads · AI face recognition · selling</span><span className="arrow">→</span></div>
            </Link>
            <div className="uc-card" data-depth={1} style={{ width: "26%", aspectRatio: "1/1.28", left: "47%", top: 0, transform: "rotate(-2deg)", zIndex: 3 }}>
              <img src="/assets/demo/band-1.jpg" alt="Music festivals" />
              <div className="cap"><b>Music Festivals</b><span>Spotlight advocacy · real-time Beam uploads</span></div>
            </div>
            <div className="uc-card" data-depth={2} style={{ width: "24%", aspectRatio: "1/1.28", left: "69%", top: 28, transform: "rotate(3deg)", zIndex: 4 }}>
              <img src="/assets/demo/event-2.jpg" alt="Corporate events" />
              <div className="cap"><b>Corporate Events</b><span>Branded galleries · cloud storage · analytics</span></div>
            </div>
            <div className="uc-card" data-depth={1} style={{ width: "26%", aspectRatio: "1/1.28", right: 0, bottom: 0, transform: "rotate(4deg)", zIndex: 2 }}>
              <img src="/assets/demo/portrait-2.jpg" alt="Schools" />
              <div className="cap"><b>Schools</b><span>WhatsApp distribution · selling · AI selection</span></div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 md:hidden stagger">
            {[
              ["Weddings", "AI selection · WhatsApp delivery", "/assets/demo/wedding-1.jpg"],
              ["Sports", "Real-time uploads · face search", "/assets/demo/sports-1.jpg"],
              ["Music Festivals", "Spotlight · Beam uploads", "/assets/demo/band-1.jpg"],
              ["Corporate Events", "Branded galleries · analytics", "/assets/demo/event-2.jpg"],
              ["Schools", "WhatsApp · photo selling", "/assets/demo/portrait-2.jpg"],
            ].map(([t, d, img]) => (
              <Link key={t} href="/login?tab=register" className="relative rounded-2xl overflow-hidden border border-white/10 group" style={{ aspectRatio: "1/1.1" }}>
                <img src={img} alt={t} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4"><b className="text-white text-lg">{t}</b><p className="text-white/60 text-xs mt-0.5">{d}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI FACE RECOGNITION */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Unlock the true potential of your media assets</span>
            <h2>AI Face Recognition <span className="hl-grad">Photo Sharing</span></h2>
            <p>Capture and distribute the precious moments. Our AI automatically detects and tags faces in your
              photos — guests find, organise and download the right images instantly and securely.</p>
          </div>
          <div className="feat-grid stagger">
            {[
              { i: "🎯", n: "01", t: "Automated Face Tagging & Organisation", d: "The AI instantly recognises faces in your photos and clusters them into albums — seamless organisation without manual effort." },
              { i: "🔐", n: "02", t: "Smart & Secure Sharing", d: "Photos find the people in them — no manual sorting. Private sharing with encryption and permission controls on every gallery." },
              { i: "🔍", n: "03", t: "Effortless Search & Retrieval", d: "Guests scan the QR code, register once, and instantly see only the photos they appear in. No endless scrolling." },
            ].map((f) => (
              <div key={f.n} className="feat-card tilt-card glow-card">
                <span className="num">{f.n}</span>
                <div className="ico">{f.i}</div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MONETIZE */}
      <section className="section" id="monetize" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Monetize</span>
            <h2>How you earn with LensLink</h2>
            <p>Turn every shoot into a revenue stream — sell individual photos or monetise the entire event.</p>
          </div>

          <div className="split mb-20">
            <div className="shots ll-reveal reveal-left">
              <img src="/assets/demo/wedding-3.jpg" alt="Photo selling checkout in gallery" />
              <div className="tile-pop"><span className="mini">💰</span><div>₹199<br /><span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>per photo · checkout</span></div></div>
            </div>
            <div className="ll-reveal d1 reveal-right">
              <h3><span className="hl">Per photo</span> — Photo Selling</h3>
              <p className="tx">Guests buy their favourite moments straight from the gallery. Set your price, enable checkout and get paid — no redirects, no extra storefronts.</p>
              <ul className="check-list">
                <li><span className="tick">✓</span>Set per-photo pricing in seconds</li>
                <li><span className="tick">✓</span>Watermark protection until purchase</li>
                <li><span className="tick">✓</span>Payments go straight to you</li>
              </ul>
              <Link href="/login?tab=register" className="btn btn-primary mt-8 btn-magnetic">Start selling photos</Link>
            </div>
          </div>

          <div className="split">
            <div className="ll-reveal d1 reveal-left">
              <h3><span className="hl">Per event</span> — Event Selling</h3>
              <p className="tx">Sell full event access to guests and organisers — package the whole gallery, set a markup and get paid while offloading storage. One link, recurring revenue.</p>
              <ul className="check-list">
                <li><span className="tick">✓</span>Paywall the whole gallery with one toggle</li>
                <li><span className="tick">✓</span>Set your markup per event</li>
                <li><span className="tick">✓</span>Less disk space on your end</li>
              </ul>
              <Link href="/login?tab=register" className="btn btn-primary mt-8 btn-magnetic">Monetise your events</Link>
            </div>
            <div className="shots ll-reveal reveal-right">
              <img src="/assets/demo/event-1.jpg" alt="Event gallery monetisation" />
              <div className="tile-pop"><span className="mini">🎟️</span><div>Full event pass<br /><span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>one link, recurring revenue</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="section" id="how" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">FROM CAMERA TO GUESTS WITHIN MINUTES</span>
            <h2>How it works</h2>
            <p>Four steps. No USB drives, no CDs, no waiting rooms.</p>
          </div>
          <div className="steps">
            {[
              { t: "Create Event and Get QR Code", d: "Set up your event and download a QR flyer — guests scan it at the venue or online." },
              { t: "Guests Scan QR Code and Register", d: "Each guest registers with a selfie (or email for the AI-free mode) in under 30 seconds." },
              { t: "Upload Photos and Publish Event", d: "Drag & drop, or Beam straight from camera. Send from any device — we handle the rest." },
              { t: "Guests Get Notified About Their Photos", d: "WhatsApp & email notifications with a private gallery link. AI finds their faces automatically." },
            ].map((s, i) => (
              <div key={s.t} className="step ll-reveal d" style={{ animationDelay: `${i * 0.1}s` }}>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLATFORM */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Platform</span>
            <h2>Everything you need to deliver</h2>
            <p>Gallery, selection, sharing and camera-to-cloud — the core toolkit for modern event photographers.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 staggering">
            {[
              { i: "🖼️", t: "Online Gallery", d: "Beautiful, customisable client galleries with themes and share-ready links — not a Drive dump." },
              { i: "⭐", t: "Photo Selection", d: "Clients like and comment to pick album shots. Faster proofing, fewer back-and-forths." },
              { i: "📤", t: "Beam — Camera to Cloud", d: "Upload straight from camera via FTP. Guests see new shots within seconds of the shutter." },
              { i: "💬", t: "WhatsApp Delivery", d: "One-tap share to WhatsApp or email with auto-filled messages. Notifications the moment photos publish." },
            ].map((c) => (
              <div key={c.t} className="feat-card ll-reveal glow-card" style={{ padding: "30px 28px" }}>
                <div className="ico">{c.i}</div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="wave-band"></div>
      <div className="stat-band">
        <div className="container-x stat-grid">
          {[["200", "K+", "Users"], ["300", "K+", "Events"], ["1", "B+", "Photos Shared"], ["10", "PB+", "Data"], ["8", "M+", "Guests Served"]].map(([n, s, l]) => (
            <div key={l}>
              <b><span className="ll-count" data-count={n} data-suffix={s}>0</span></b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="wave-band wave-flip"></div>

      {/* TESTIMONIALS */}
      <section className="section" id="stories">
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Top photographers love LensLink</span>
            <h2>From Mumbai to Sydney<br />— pro studios <span className="hl-grad">trust LensLink</span></h2>
          </div>
          <div className="testi-grid stagger">
            {TESTIMONIALS.map(([ini, name, handle, q, date]) => (
              <div key={ini} className="testi tilt-card glow-card">
                <div className="st">★★★★★</div>
                <p className="q">“{q}”</p>
                <div className="who">
                  <span className="avatar">{ini}</span>
                  <div><b>{name}</b><div className="role">{handle}</div></div>
                  <span className="date">{date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">Pricing</span>
            <h2>Choose the perfect plan for you</h2>
            <p>All plans come with our core features, dedicated support and AI face search.</p>
          </div>
          <div className="flex justify-center ll-reveal">
            <div className="toggle-band">
              {BILLING.map((b) => (
                <button key={b} className={billing === b ? "on" : ""} onClick={() => setBilling(b)}>{b}</button>
              ))}
            </div>
          </div>
          <div className="price-grid stagger">
            {plans.map((p) => (
              <div key={p.n} className={`price-card glow-card ${p.pop ? "pop" : ""}`}>
                {p.pop && <span className="pop-tag">BEST VALUE</span>}
                <h4><b>{p.n}</b></h4>
                <div className="amt">{p.amt} <small>{p.per}</small></div>
                <ul>{p.f.map((x) => <li key={x}>{x}</li>)}</ul>
                <Link href="/login?tab=register" className={`btn ${p.pop ? "btn-primary" : "btn-dim"} btn-sm btn-magnetic`}>Start Now</Link>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-8"><a className="btn btn-ghost btn-sm" href="#faq">Compare Plans in Detail</a></div>
          <p className="fine-print">* You can buy more credits at any point of time</p>
        </div>
      </section>

      {/* ENTERPRISE */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="ent-panel ll-reveal">
            <div className="ent-grid">
              <div>
                <span className="eyebrow">Need a more customised plan?</span>
                <h2 className="mt-4">LensLink <span className="hl">Enterprise Plan</span></h2>
                <p>Customised plans for all your events and 24×7 priority support.</p>
                <Link href="/login?tab=register" className="btn btn-primary btn-magnetic">Contact Us</Link>
              </div>
              <div className="ent-feats">
                {[
                  ["🤍", "Full White Label Solution"],
                  ["📣", "Custom WhatsApp & Email Notifications"],
                  ["🎞️", "Marquee Frames — 10× Sponsor Visibility"],
                  ["♾️", "Unlimited Photos"],
                  ["🎨", "Custom Landing Page for Every Event"],
                  ["📹", "In-Gallery Video with Dedicated CTA"],
                ].map(([ic, t], i) => (
                  <div key={t} className="ent-feat" style={{ animationDelay: `${i * 0.08}s`, animation: "badge-in .6s var(--ease) both" }}><span className="ic">{ic}</span>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq" style={{ paddingTop: 0 }}>
        <div className="container-x" style={{ maxWidth: 800 }}>
          <div className="section-head ll-reveal">
            <span className="eyebrow">FAQ</span>
            <h2>Frequently asked questions</h2>
            <p>Everything you need to know about LensLink.</p>
          </div>
          {FAQS.map(([q, a], i) => (
            <div key={q} className={`faq-item ll-reveal ${faqOpen === i ? "open" : ""}`}>
              <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                {q}<span className="chev">+</span>
              </button>
              <div className="faq-a" style={{ maxHeight: faqOpen === i ? 400 : 0 }}>
                <p>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="section-head ll-reveal">
            <span className="eyebrow">From the Blog</span>
            <h2>Latest articles</h2>
            <p>Compare photo sharing platforms, AI gallery workflows and delivery tips for wedding, sports and corporate photographers.</p>
          </div>
          <div className="blog-grid stagger">
            {BLOGS.map((b) => (
              <div key={b.title} className="blog-card glow-card">
                <div className="blog-cover"><img src={b.img} alt={b.title} /></div>
                <div className="blog-body">
                  <span className="cat">{b.cat}</span>
                  <h3>{b.title}</h3>
                  <div className="blog-meta"><span className="mavatar">{b.ini}</span><span>{b.author}</span><span>·</span><span>{b.date}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-x">
          <div className="cta-panel ll-reveal">
            <span className="cta-orb" style={{ width: 10, height: 10, top: "18%", left: "12%" }}></span>
            <span className="cta-orb" style={{ width: 7, height: 7, top: "30%", right: "16%", animationDelay: "-4s" }}></span>
            <span className="cta-orb" style={{ width: 12, height: 12, bottom: "22%", left: "22%", animationDelay: "-8s" }}></span>
            <span className="cta-orb" style={{ width: 8, height: 8, bottom: "16%", right: "10%", animationDelay: "-2s" }}></span>
            <span className="big-ico">
              <OwlMascot />
            </span>
            <h2>Try LensLink — the best tool for event organisers and professional photographers</h2>
            <p>Smart AI tools that reduce effort and increase productivity. Create your first gallery link in under a minute.</p>
            <Link href="/login?tab=register" className="btn btn-primary btn-lg btn-magnetic btn-pulse">Start Free Trial</Link>
            <p className="mt-5" style={{ fontSize: 13, color: "var(--muted-2)" }}>No credit card required · Free forever plan · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container-x">
          <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
            <div>
              <Link href="/" className="brand">
                <span className="brand-mark">
                  <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
                </span>
                <span>LensLink</span>
              </Link>
              <p className="f-desc">LensLink AI is fully committed to ensuring the privacy and security of your data, in compliance with global standards.</p>
              <div className="f-tag">🛡️ GDPR Compliant · ISO 27001 Ready</div>
            </div>
            <div><h4>Pages</h4><a href="/">Home</a><a href="/login">Login</a><a href="/login?tab=register">Create account</a><a href="/admin.html">Studio dashboard</a><a href="/account.html">Customer portal</a><a href="#use-cases">Use Cases</a><a href="#pricing">Pricing</a></div>
            <div><h4>General</h4><a href="#stories">Testimonials</a><a href="#how">How it works</a><a href="#monetize">Photo Selling</a><a href="#faq">FAQs</a><a href="#faq">Enterprise</a><a href="#">Privacy Policy</a><a href="#">Terms & Conditions</a></div>
            <div><h4>Connect with us</h4><a href="#">Instagram</a><a href="#">YouTube</a><a href="#">LinkedIn</a><a href="#">Facebook</a><a href="#">Support — +91 83298 67577</a><a href="#">Sales — +91 96840 09183</a></div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} LensLink — All rights reserved.</span>
            <span>Made for photographers, everywhere. ∿</span>
          </div>
        </div>
      </footer>

      {/* SITE SIDEBAR — links to all pages */}
      <div className={`side-overlay ${sideOpen ? "on" : ""}`} onClick={() => setSideOpen(false)} aria-hidden={!sideOpen}></div>
      <aside className={`site-side ${sideOpen ? "open" : ""}`} aria-hidden={!sideOpen} role="dialog" aria-label="Site menu">
        <div className="side-head">
          <Link href="/" className="brand" onClick={() => setSideOpen(false)}>
            <span className="brand-mark">
              <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
            </span>
            <span>LensLink</span>
          </Link>
          <button className="side-close" aria-label="Close menu" onClick={() => setSideOpen(false)}>✕</button>
        </div>

        <div className="side-scroll side-stagger">
          <div className="sg-label">Hosted pages</div>
          <a className="sitem" href="/" onClick={() => setSideOpen(false)}><span className="di hl">🏠</span>Home (landing)<span className="arr">→</span></a>
          <a className="sitem" href="/login" onClick={() => setSideOpen(false)}><span className="di">🔐</span>Login<span className="arr">→</span></a>
          <a className="sitem" href="/login?tab=register" onClick={() => setSideOpen(false)}><span className="di">✨</span>Create account<span className="arr">→</span></a>
          <a className="sitem" href="/admin.html" onClick={() => setSideOpen(false)}><span className="di hl">📊</span>Studio dashboard<span className="arr">→</span></a>
          <a className="sitem" href="/account.html" onClick={() => setSideOpen(false)}><span className="di">🖼️</span>Customer portal<span className="arr">→</span></a>
          <a className="sitem" href="/s/EXAMPLEGALLERY" onClick={() => setSideOpen(false)}><span className="di">📤</span>Shared gallery view<span className="arr">→</span></a>

          <div className="sg-label">On this page</div>
          <a className="sitem" href="#how" onClick={() => setSideOpen(false)}><span className="di">⚙️</span>How it works<span className="arr">→</span></a>
          <a className="sitem" href="#use-cases" onClick={() => setSideOpen(false)}><span className="di">🎯</span>Use cases<span className="arr">→</span></a>
          <a className="sitem" href="#monetize" onClick={() => setSideOpen(false)}><span className="di">💰</span>Photo selling<span className="arr">→</span></a>
          <a className="sitem" href="#pricing" onClick={() => setSideOpen(false)}><span className="di">💳</span>Pricing<span className="arr">→</span></a>
          <a className="sitem" href="#faq" onClick={() => setSideOpen(false)}><span className="di">💬</span>FAQ<span className="arr">→</span></a>
        </div>

        <div className="side-foot">
          <Link href="/login?tab=register" className="btn btn-primary" onClick={() => setSideOpen(false)}>Start Free Trial</Link>
          <Link href="/login" className="btn btn-ghost" onClick={() => setSideOpen(false)}>Sign in</Link>
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", textAlign: "center" }}>No credit card required · Free forever plan</p>
        </div>
      </aside>
    </>
  );
}