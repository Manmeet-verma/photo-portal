"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { initFirebaseClient } from "@/lib/firebase-client";
import { setAuth, currentUser } from "@/lib/client-api";
import { toast, esc } from "@/lib/ui";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/config";

type Tab = "login" | "register";

async function parseJson(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text) {
    if (res.ok) throw new Error("Server returned an empty response — the API server may not be running or its config is incomplete.");
    return { error: `Server returned an empty response (HTTP ${res.status}) — the API server is not responding correctly. Check the server logs and that the latest build is deployed.` };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Server returned an invalid response (HTTP ${res.status}) — check that the server is running the latest build and has its Firebase Admin setup complete.` };
  }
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [flashMsg, setFlashMsg] = useState("");
  const [flashSub, setFlashSub] = useState("");
  const [adminReady, setAdminReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => parseJson(r))
      .then((d) => setAdminReady(Boolean(d.adminConfigured)))
      .catch(() => setAdminReady(false));
  }, []);

  useEffect(() => {
    const user = currentUser();
    if (user) {
      window.location.href = user.role === "admin" ? "/admin.html" : "/account.html";
    }
  }, []);

  async function authenticate(creds: { email: string; password: string; name?: string }) {
    if (!isFirebaseConfigured) {
      setErr("Firebase client config is missing. Add the NEXT_PUBLIC_FIREBASE_* keys to .env.local and restart the server.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const { auth } = initFirebaseClient();
      let userCred;
      if (creds.name) {
        userCred = await createUserWithEmailAndPassword(auth, creds.email, creds.password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, creds.email, creds.password);
      }
      const token = await userCred.user.getIdToken();
      const res = await fetch("/api/auth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: creds.name || "" }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        const msg: string = data.error || `Account setup failed (HTTP ${res.status})`;
        if (msg.includes("not configured")) {
          setErr("Sign-in works, but the server-side setup is missing: download the service-account key and save it as service-account.json in the project root, then restart the server.");
        } else {
          setErr(msg);
        }
        setBusy(false);
        return;
      }
      if (!data || !data.user) {
        setErr("Server responded without account data — the server is running an old or incompatible build. Redeploy the latest version and restart.");
        setBusy(false);
        return;
      }
      setAuth(token, data.user);
      setFlashMsg(creds.name ? "Account created!" : "Signed in!");
      setFlashSub(`Taking you to your ${data.user.role === "admin" ? "studio" : "gallery"} space…`);
      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "/admin.html" : "/account.html";
      }, 900);
    } catch (e: any) {
      const code: string = e?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
        if (adminReady === false) {
          setErr("This account doesn't exist yet — the demo accounts were never created. Save the service-account key as service-account.json in the project root, restart the server, then run `npm run seed`.");
        } else {
          setErr("Incorrect email or password.");
        }
      } else if (code === "auth/email-already-in-use") setErr("An account with this email already exists — try signing in.");
      else if (code === "auth/invalid-email") setErr("Please enter a valid email address.");
      else if (code === "auth/weak-password") setErr("Password must be at least 6 characters.");
      else setErr(e?.message?.replace("Firebase: ", "") || "Something went wrong.");
      setBusy(false);
      setTimeout(() => setErr(""), 6000);
    }
  }

  if (flashMsg) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "radial-gradient(900px 500px at 50% -10%, rgba(186,255,58,.12), transparent 60%), #07090f" }}>
        <div className="text-center text-white anim-fade-up">
          <div className="w-20 h-20 mx-auto rounded-full grid place-items-center text-4xl font-extrabold shadow-lg mb-5" style={{ background: "linear-gradient(135deg,#baff3a,#7fd40f)", color: "#0a1200", animation: "pop-in .6s cubic-bezier(.34,1.56,.64,1) both" }}>
            ✓
          </div>
          <h3 className="text-3xl font-extrabold mb-2">{flashMsg}</h3>
          <p className="text-gray-400">{flashSub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* visual panel */}
      <div className="auth-visual hidden lg:flex">
        <Link href="/" className="brand" style={{ color: "#fff" }}>
          <span className="brand-mark">
            <svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg>
          </span><span>LensLink</span>
        </Link>
        <div>
          <span className="eyebrow">Studio suite</span>
          <h2 className="text-4xl xl:text-5xl font-extrabold mt-5 leading-tight">One link.<br /><span style={{ background: "linear-gradient(90deg,#baff3a,#a8ff7a 45%,#7f6bff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Your best frames.</span></h2>
          <p className="text-gray-400 mt-5 max-w-md">Photographers curate galleries, and AI face recognition finds each guest their photos — delivered privately in seconds.</p>
          <div className="auth-montage mt-10">
            <div className="auth-card-f card-a"><img src="/assets/demo/wedding-2.jpg" alt="" /><span className="tag">💍 1,240 frames</span></div>
            <div className="auth-card-f card-b"><img src="/assets/demo/portrait-2.jpg" alt="" /><span className="tag">✨ AI-curated</span></div>
            <div className="auth-card-f card-c"><img src="/assets/demo/nature-1.jpg" alt="" /><span className="tag">⭐ 4.9 studio rating</span></div>
          </div>
        </div>
        <p className="text-xs text-gray-500">Trusted by 200K+ photographers & event studios worldwide</p>
      </div>

      {/* form panel */}
      <div className="grid place-items-center p-6" style={{ background: "radial-gradient(800px 500px at 100% 0%, rgba(127,107,255,.08), transparent 60%), #07090f" }}>
        <div className="w-full max-w-md">
          <div className="flex lg:hidden justify-center mb-8"><Link href="/" className="brand"><span className="brand-mark"><svg viewBox="0 0 96 96" width="22" height="22"><circle cx="30" cy="53" r="7" fill="#0a1200" /><circle cx="66" cy="53" r="7" fill="#0a1200" /><path d="M48 16 L72 28 L64 34 L48 26 L32 34 L24 28 Z" fill="#0a1200" /><path d="M48 82 C 40 82 36 77 37 71 L59 71 C 60 77 56 82 48 82 Z" fill="#0a1200" /></svg></span><span>LensLink</span></Link></div>
          <div className="tab-toggle">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setErr(""); }}
                className={tab === t ? "on" : ""}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {err && <div className="form-error show">{esc(err)}</div>}

          {tab === "login" ? (
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); authenticate({ email: String(fd.get("email")), password: String(fd.get("pass")) }); }}>
              <h2 className="text-3xl font-extrabold">Welcome back 👋</h2>
              <p className="text-gray-400 mt-2 mb-7">Sign in to your studio or customer account.</p>
              <div className="field"><label>Email address</label><input className="input" name="email" type="email" required autoComplete="email" placeholder="you@studio.com" /></div>
              <div className="field"><label>Password</label><input className="input" name="pass" type="password" required autoComplete="current-password" placeholder="••••••••" minLength={6} /></div>
              <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
              <p className="form-hint text-center mt-3">Demo studio account: <code className="text-[#c9f58a]">admin@lenslink.app / admin123</code></p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); authenticate({ name: String(fd.get("name")), email: String(fd.get("email")), password: String(fd.get("pass")) }); }}>
              <h2 className="text-3xl font-extrabold">Create account 🎉</h2>
              <p className="text-gray-400 mt-2 mb-7">Free to start — your guests' photos await.</p>
              <div className="field"><label>Full name</label><input className="input" name="name" type="text" required autoComplete="name" placeholder="Alex Carter" /></div>
              <div className="field"><label>Email address</label><input className="input" name="email" type="email" required autoComplete="email" placeholder="you@mail.com" /></div>
              <div className="field"><label>Password</label><input className="input" name="pass" type="password" required autoComplete="new-password" placeholder="At least 6 characters" minLength={6} /></div>
              <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? "Creating…" : "Create account →"}</button>
              <p className="form-hint text-center mt-3">This creates a customer account. Photographers manage team accounts from the studio dashboard.</p>
            </form>
          )}

          <div className="text-center mt-7 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#baff3a] font-semibold transition-colors">← Back to home</Link>
          </div>

          {!isFirebaseConfigured && (
            <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: "rgba(186,255,58,.08)", border: "1px solid rgba(186,255,58,.3)", color: "#c9f58a" }}>
              <b>Firebase client config missing.</b> Add the NEXT_PUBLIC_FIREBASE_* keys to <code className="bg-white/10 px-1.5 py-0.5 rounded">.env.local</code> and restart the server.
            </div>
          )}
          {isFirebaseConfigured && adminReady === false && (
            <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: "rgba(255,186,58,.08)", border: "1px solid rgba(255,186,58,.3)", color: "#ffd98a" }}>
              <b>Server-side setup pending.</b> Firebase Console → Project settings → Service accounts → <b>Generate new private key</b>, then save the downloaded file as <code className="bg-white/10 px-1.5 py-0.5 rounded">service-account.json</code> in the project root and restart the server. Then run <code className="bg-white/10 px-1.5 py-0.5 rounded">npm run seed</code> to create the demo accounts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}