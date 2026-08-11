"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { isFirebaseConfigured, firebaseConfig } from "@/lib/config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function initFirebaseClient() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }
  if (!app) app = getApps()[0] || initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  return { app, auth };
}