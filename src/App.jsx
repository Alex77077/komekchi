import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Supabase ─────────────────────────────────────────────────
const SB_URL = "https://gilwqcqzzlxvdpqokpyh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHdxY3F6emx4dmRwcW9rcHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTI3MzksImV4cCI6MjA4OTgyODczOX0.recR9olpXA9h9bOAxHnlwl0ar2Y3TLW8iiXXUD6_iPs";
// Supabase API helper
async function sbFetch(path, method="GET", body=null) {
  const headers = {
    "apikey": SB_KEY,
    "Authorization": "Bearer " + SB_KEY,
    "Content-Type": "application/json",
  };

  // Diňe täze maglumat goşulanda (POST) ýa-da üýtgedilende (PATCH) 
  // bize täze maglumatyň nusgasyny gaýtaryp bermegini soraýarys.
  if (method === "POST" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }

  const res = await fetch(SB_URL + "/rest/v1/" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase Error:", err);
    throw new Error(err);
  }

  // Eger baza '204 No Content' (jogap boş) gaýtarsa, programma ýalňyşlyk bermez ýaly:
  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}


// ─── Supabase Storage — faýl ýüklemek ─────────────
const SB_STORAGE = SB_URL + "/storage/v1";

async function uploadFile(file, taskId) {
  const ext  = file.name.split(".").pop();
  const path = `tasks/${taskId}/${uid()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const res  = await fetch(`${SB_STORAGE}/object/task-files/${path}`, {
    method: "POST",
    headers: {
      "apikey":        SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Content-Type":  file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  return { name: file.name, path, size: file.size, type: file.type, ext };
}

function getFileUrl(path) {
  return `${SB_STORAGE}/object/public/task-files/${path}`;
}

function fileIcon(ext) {
  const e = (ext||"").toLowerCase();
  if (["doc","docx"].includes(e)) return "📄";
  if (["xls","xlsx"].includes(e)) return "📊";
  if (["pdf"].includes(e))        return "📕";
  if (["png","jpg","jpeg","gif","webp"].includes(e)) return "🖼️";
  if (["zip","rar"].includes(e))  return "🗜️";
  if (["txt"].includes(e))        return "📝";
  if (["ppt","pptx"].includes(e)) return "📋";
  return "📎";
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1048576)    return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1048576).toFixed(1) + " MB";
}
// ──────────────────────────────────────────────────

// Supabase real-time helper
function sbSubscribe(table, callback) {
  const ws = new WebSocket(
    SB_URL.replace("https","wss") + "/realtime/v1/websocket?apikey=" + SB_KEY + "&vsn=1.0.0"
  );
  ws.onopen = () => {
    ws.send(JSON.stringify({
      topic: "realtime:public:" + table,
      event: "phx_join",
      payload: {},
      ref: "1"
    }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === "INSERT" || msg.event === "UPDATE" || msg.event === "DELETE") {
      callback(msg.event, msg.payload?.record, msg.payload?.old_record);
    }
  };
  return () => ws.close();
}
// ──────────────────────────────────────────────────────────────

// ─── SVG Ikonlar — emoji çalşyrýar ───────────────────────────
const I = {
  handshake: (c="white",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 9V6.5A2.5 2.5 0 0 1 10.5 4h3A2.5 2.5 0 0 1 16 6.5V9"/><path d="M8 15v2.5A2.5 2.5 0 0 0 10.5 20h3a2.5 2.5 0 0 0 2.5-2.5V15"/></svg>,
  crown:     (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>,
  briefcase: (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  hardhat:   (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a8 8 0 0 1 16 0v3"/></svg>,
  home:      (c="currentColor",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  calendar:  (c="currentColor",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  kanban:    (c="currentColor",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="14" rx="1"/></svg>,
  settings:  (c="currentColor",s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  chart:     (c="currentColor",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  check:     (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  door:      (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m15 2 5 5-5 5"/><line x1="20" y1="7" x2="9" y2="7"/></svg>,
  robot:     (c="white",s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15" strokeWidth="3"/><line x1="16" y1="15" x2="16" y2="15" strokeWidth="3"/></svg>,
  lock:      (c="currentColor",s=44) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  bell:      (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  user:      (c="currentColor",s=15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  key:       (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>,
  download:  (c="currentColor",s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  save:      (c="white",s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  edit:      (c="currentColor",s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:     (c="#FF6B7A",s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  plus:      (c="white",s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevron:   (c="currentColor",s=16,up=false) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",transform:up?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}><polyline points="6 9 12 15 18 9"/></svg>,
  sun:       (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:      (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  send:      (c="white",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  eye:       (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:    (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  warning:   (c="currentColor",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clock:     (c="currentColor",s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  archive:   (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  chat:      (c="currentColor",s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  celebrate: (c="currentColor",s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  spinner:   (c="white",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" style={{animation:"kSp 1s linear infinite"}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  rocket:    (c="white",s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l3-3-6-6z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>,
  workers:   (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  tasks:     (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  time:      (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  history:   (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.44"/></svg>,
  profile:   (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  secure:    (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  alert:     (c="currentColor",s=17) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

// Logo gradient tekst — rerender-da ýitmesin diýip aýratyn komponent
const LogoText = ({ size=20, C, center=false }) => {
  const w = Math.round(size * 5.6);
  const h = Math.round(size * 1.4);
  const mid = Math.round(w / 2);
  const gid = "lg" + size;
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h}
      style={{ display:"block", overflow:"visible", flexShrink:0, margin: center ? "0 auto" : 0 }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.pu}/>
          <stop offset="100%" stopColor={C.ac}/>
        </linearGradient>
      </defs>
      <text
        x={center ? mid : 1}
        y={h * 0.84}
        textAnchor={center ? "middle" : "start"}
        fontSize={size} fontWeight="900"
        fontFamily="'Plus Jakarta Sans','Segoe UI',sans-serif"
        letterSpacing="-0.5"
        fill={"url(#" + gid + ")"}
      >Kömekçi</text>
    </svg>
  );
};

// Ulanyjy suraty — el gysyşma logo
const LOGO_IMG = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAsaUlEQVR42u29eZhdVZnv/3nX2nufsaaEhCQgMxEChoRERqWqFBGxHcBObL1qO+LvKvdptZ2uXq2K2K23HVrbp72t0ghiiyTONgISqAo4ICbMBAWEhCFAQoaqOvPea72/P/apyjxVqioJZj/PgSd1qs7Ze32/7/cd1rvWghfCpSosXmzp0wDVAFUzLt8x/PmL1aIqL4ShCw5i0A39/YZ1XYqIA9xW7z+gEeH6KTQaMzB6BOoPJwjaaDSmEIatJIkCKYgGBSMoFUSeQV0FlWew4dOof4aWZC0iVSDZ/h4wdOEBRUQPtmGUgxL07u6tgXhCc5TWnYy401Cdi+hsnB4DejhRJksmA8aCEdDdYCTN3/Ee6nWo12KQtYg8gTX3o3o3NroHWMnMwwa3+tu+voB1XcoC/MFChgOfAD09hq6u7UF/+PlZ4Lrw+grUzUfM0eQLKYBJDHEMSQLOKTQBUd39Ew/rgiKAwVghCCAMIWgKZq0GLn4G5C6QZQT2Fk6Ych8iyVZk6OryiPhDBBittYM05T29/vzMGSivR/VvUE6lpcXifQpIo04KgA4/l6AIIrKP9zEs7cMvULWEkZDNgrVQLgH6Z0RuwPBzBp7+LfPnxyPPsQRhobhDBNiTa7FaHkRZ1LScB54+itAuAN4MvJR8IZXmWhXQZAuQzQQTtKksKEpANgvZXHpvcbISIz/Cmx9w8pQ/jwSRYBA8HDju4cAhwOLFlgULNvvOlc+ejeV/4vUNFIutNOpQqYCQoJgm6HIAKZZH8Hi15PKpOpRKdYy5EdF/Z+a0m7f4XbuVsv1VE2A4ZRv2lQ8/dwGqH0LMa8hkUnn1bhh0w8FwqXrAY0xAoZgGlHHjt4h8jb4nf87758eoCkuWGBYudH+dBFAV+vvtSHD30DPdGD5NlH0lAKWhVGIZsfaDMldF8YCQLxjCEKqVFcA/8eJpPx1RA/Zf1rB/Bnax2pGg6L4nZ5ONerHBxYhAeSj1kSKWF9KVqoKSy1uCABr1fmLXwykzbtufbkEm3OpTi3bcc0+B7LRPAx8hl8swODBcTHlhAb8zIhSLljgBdVewqfYZzjz22aY7nNCC0sT51MWLLSJp1W7lk68lP305heL/xiUZBgccIuYFD34a66TPWSo56jUlX3wvHfkVPPTUOxEZrlfYF5YC9GlAtyT8YnmeE4/4EpnoAzgPtWoC2IPXx4+JIiSEUUA+D9XKj6iWPsicE9aOjNnBTQCVZvTuuOfxueTzV5EvzGbjBj9iDYcuUJ8GvG0dlnrtCarxe5l9xM0T4RLGD4AeNWlZVRwrn3wfheJvsMFsNm5ImjJ4CPwRMzSCGMvApgTVo8hFv2blms+MuITFi+3BpQCqppnXCw89/Q2KrR9kcBBc4jHmEPC7LSgJdEwyDA3+hGfW/z3dp5bGK0sYj3lzi4jnDysn8+dnf0VL2wcZ2JTgnR4Cfw+DRFXDhvUJheIlzJiyjOUPH4+Io68vOLAVYJild9x7JG1Tr6dYTCXfmOAQsqOKDRJaWgPq9TWUKxdx+nH30tcXbDczekAQYPjGVjx+Mi35mwjCF1EeSpBD4O/T5b0jm7MIQ5TKb2DusX2oBltNPe93Agxb/l0Pz6LYuhQbTqdSThA5BP7YjK8jyliMqTAw8Drmn3DrWCmBjD34wXTKZYcx9hByY6oEnkzGYGyFUulvmHts31iQYF+bJdJo/zcPzeCwjjsJwyMolw6BP54kiDIGYyps2vQyzph5975mB6OPynt6DCLK7fd1MLn9BqLoEPjjfRljaNQ9kKe97b/53SMnIOL2pQvajNLyhVNOEVRh2rTryOdnUy4lh8CfIBLUqw4bzGBK289RbaW3l9G2qY8WsIDLLnMn3n7Hv1fPetnfJYVCIvV6wKE0f2JKBd4bMpkkt/a5w497z7tnr//ud/4LJWDZMh13AnR2dgarr746OWnOvPfmSkOXF/pvjksvmRMmM45EalUOkWCcwU8StLWNzCN/Nkd/+kNxbv26kzqmHxk9f921Szs7O4PVq1fvVReyjIIwbubcubNDNX9QMaHUqsYXi/LEZ/6Z8uy5yKZNaHAo+xsX8F2CtrVTuO8eXvT5T2GHhtRns85C4OLktQ89cM+vWLDAsmSJGw8FkAULFki5PCWTiRq/NsZMV+eUTMaYWpW22/uoHHcijeNnItXKISUYc/Ad2tZB4c7fc/Tln8LUqvhsTsQ5EEHEvHrykTO+//zSpUPN2G6P3MEeo9TZ2WmXLFnicu2DXw2CYJZzLkHE4hwaZZA45ujLP0XrbbeibR2Ic4dQG1Pw22n5TR9HX/6/kbiRjnkKvvHee2PNYZLolYAuWLBAxlgBFtjVq3/lXjz79FeHNvi68y6RLat8qumqGe9pv/0WGodPo3bKS5DqoZhgTMBv76D9lhs56l8Wocamq5T8ZlcvKQmSIAxnTp4y9bllfbf8ccGCBXblypU6FgQQOEXOOqs120iS641IezPlkG1SQzAWFaHttluJW9upzjk9DQwPTf3vG/i/+BFHfu2L+DACG4BuH+eJiDQXq3ROmjHte7fdcsseuYLdIrNgwQIDS9xAtf7ZwIbHOefcTv9OPRiDz+Y48htfZsp130db2xHvd78o89C1lTGJ92h7B1MWf58jv/ElfCabqqn6XWSHXq0NWo3j63vqCnapAD09Peab3/ymzpw376RA5WrvvUjauLnrDxZBo4jW39+OeqV8xjnQaIy8d+jaNfgAtLQy5epvM+3K/8AXiptXLe9y2MV475y19tRJ06b/7rZblz66O1ewSwVYuXKlAGoT/yVjTCZVmD1IHZs3mrS0cvg132Hat/8NCoU9eoi/evBFoFBk2re/wbTvfYek2LI1MXbnNpoGJqpfnjVrVjRr1izdFWZ2F9pvVy5Z4k45bd65xpgvOuec7GXbtqjiszlaV9yJ3bSJobPPS4MX7w8pwQ7dp4VMlhnf/ApTfvJDktY2RHVPM7oRo/beuyAIp3vkkR8t/uG9uyoQ7RTQngULZNmyqWbKtA3fE5GjVVVlFI2coorL5yneexfhuucondOZ8rGZvx66SA2iuQfBEV/7ApP/+6ck7R1p7DSa4LE5rAqzp07u+O7y5csbe6kAncGyZVe7WbOz3cbazzrnvOzDog1RxefzFB68j+xTTzB4bme6rv4QCVLwwxBBOPpfPkf70htS8PepjiKiqi4IwsNUddW6tc+t2JkK7ATU1QB62OHTvmWMOQ71uq9t3CkJCuQeXkn20T8zdG4nGmXS3Tz+WtNE7yDKYJKEoz7/KVp/dxtJ+6QxKaINxwIqzGxvKV5x9913JzuKBcxOVMG/+NS5842xr/Lejdl6PXEJSVsHrcvv4Niej2ErJcjm/iqrhuIcZHLYaoVjej5Gy/I7SNo6EDdm/Z7Ge+cDG5wU5dpeD2hnZ6fdLQEWLFiQvmH4sBhBVf3YPnhC0tpG/oF7OebTH8Fu3IDmC39VJBDn0HwBu2kDx3z6IxTuvwfX2jaW4G+ZWCjiPgywbNkyv4Mq33b/1pPmzZtuEn1ERPJ7nPrt7Y3ZAFsapHb0sTzR839pTJuBlIdQG7zwwS8UiZ5dw1GLPkl29WO4Yuu4gD881CJGnPPz/3T/XSuaRu93qADDEmFi3mJtUPDeO8Zp9ZC4BFdsIfvEKo799IfJrH4cbRnXgTgAwE/QYguZ1Y9z7Kc/TPaJx3HFlnF9ZlV1xhgM+p4mxmaXCrAAzAOz5y631s7x3nvGeQm5WoupVEg6Onjis1+ketIsZHDgBacE4hK0pY3sww9x9KJPEm7cgMvnJ8L1qYiIV7+2pRyeeOejdw4OK/22CmAA/dNL5p1mjJnjvVcmYP8AcQ6fzxMMbOLYz3yUwr13oW0dW812vRBSPW3roHD/3Rz3mX8kGNg4UeBDOkfgAhtMLefjV22p9FsRYFganOglxlhU1U2cdTh8JotUKxzV+wkt/LbfE4b+BVE2VoUw9MXf9vujej6uUqmkzzqxQa8CqqJ/CzB16lTdkQsQwMw6be49xthTJ0L+dxgYDg3SOOUlPPyv34JSyZFuILHvJCPdORLSzf0mDHxwUizaEz90KdHK+3Etrfsj41EREfV+fS40x69YsWJg2A2YLeX/1FPnnQhy0kTJ/3YsdYmnWPQtxx1zcdbrT2XSZJtOgepeg21QguYrdXgGLwG+2ccSbEMDg2JVCdTv8GXQvQffGGTSZJvx+tPc8cderC2tXpzzwERLm3iv3lg7uRbrWc1834y4gGH599afb60NJlL+R8bLexeGkWmZNuXjK776pZ/Fx0++pLU0eLnJZEoYs9tBGwbcoiiCl5DEZEhMBsXQ7mucFG9gZrwBEBKTQ0WaRFC8BDibIQnyO3jl8CZMibNnZFCM8SaTKbWWBi+Pj598yb1f/dLP8tOnfTwII7M/xhfUixjU6IUAnWvXSmoIW/kE6d4/blKdDcIgyOd+fMdNN31l3qWXhive8hYtv3j6Z3MPrJ5cbm3/AIODCVtsbz9s5YKSjFi3BYWsr3FyvJ55jfWckaxnTryBY1yJyVpHgT8GHXw3eyKL88exKSiCJrwoHmBW7XmOb2zkyKREzscgwkaT5dGwnXtyU1mZmUISZEETxMcYVbzskA6OlpYgN7jpe+VTj/6s6+sL5l17rSy/4oqvzH1559neJW8azezqPkmAIKoelPMAWbZsmdvsGkGPPOusXGu18bCIHNms/k2UC/CCmCAbPXz0eSfP/8WXrix39vWZZd3dCY80zrEycBONej6dj5KR4XYYkCCdR/AxL042cXZjLa9oPMO5jXUc54ZAm/m1mOZ8Q/ORNAF1PB10sCR6EScPPcn8yhomuVq6le8OnMqQyfBgdgo3FI7lJy0zeSB3eDp96xtY71CRJh1TRlsjKplsJQkOezXHyO86+/qCZd3d/t0fe3fh7tsfWl6v1meSnnFgJ8zFpljXJDQzH1y+/EnAWBYssKxcqUdMmvYSY/hos/JnJuymVNWEQb3jsEkX/PrqJU/29PTYY975Tt9/Tin/hCncdFdu2jSNVRFvQFAToQTktcGZjbW8v7ySfxm6i0VDd3NJ7TFOS9bToTGIJWn6fBWLbOHxVSxeQtq0xlmNZzhB6kTGUMZQloCaCanZKP2/CambEINyTDzAK8qreMfAg3SWV4Mqq8N2qmEBlbRdy+JRMaISqQ+DzN+v/W3nPefplave8JG4C8zX/vlrtdPOeenvqqXqu1ySGJm4PY8lVdogcrH7zfPPPftQZ2enDTrXrpVlgIibY0wgSZJs3fE7vtKfhFEU2kL+g7fdcMP9nZ2dQW8XiIjv/fXnv3VlcucJl62613299TT7X9njmKR1XlF9nDfUn+ScxlqOHrZysSABTjIMR6/DMcGOg8S0ycJj8cZiBIJAaMnkSOIGjXoVlyRN6dyMTclEeBEC9VxQWcWrK4/zaDiJnxVP4Ecds1ieORxnsljf4E0DD5p/ePT37pxo8ISh4rT/XCTyd9rXY/r7O4ObFv/0rvndr/yf3vn/TOJ4wsYbUEEwyOnAT0qlksi8efPCFStWxCfPPv0bQRBcliQTc0OqmgRBGIS5zHfv+u3t7+7s7Az6e7uQ7kVJcuOiD9lJbf/qB6qJIQ5Qz0PBYUzRBoe55iEdTct2yEgsIGPkLFElSWIa9RpJHJPu1CbbOHkBEXI+JuNj6jbi/mgKf4omcUJjI2dVn8YZS4kgaWvNBYND1Q+3venLX9O+nqCrt59ly5Ylc84590pXi981UWOOqjM2sN67G1bee9dFgDUrVqxIgwHR01QVmQA5UlVvjA0kMPd0XjL/g4DtbYKvNy060+ayX6ZUdQZvvYQ4k+Fkt5HDtIIzGZzJ4MUiKAG+SYAxzd0Jwoh8sZVcsY0wyqS5whbpqEWx6qlLwMYgTx3DnPpzvG3wAebXn2VTkKUkIQK2XK65TBR8eeBn/3imdC9Kenu7AGz3my75oInsvcaYYKxnXXdC7uFA8OR58+aFgBOAWbNmRRpkHjHGHDUBAaCi+CAKq+2HH3b6bddf/0hPT0/QC56X1tsotC8nsMdRa/gtm1A8MnZWvreKANSdp1avIY3qTu/BI2gabm+VKnpVn40C47yudiY3v2UFG3rpN4sWLUvOf/ObT1772Ko743oj12y5k3Ede0RQX3OW4/98991rDEAchlMEpjYJLuNs/S6MQtva3nLpbddf/8iI31+0yPtMyzXkM8dRjZNtO5DM/gB/WBFUyVihrVAgm81vpQRsV0zavk5gREy9kST5XHS0JJWrZNEi39v7Qe3s7AyWXnfdQ61tLZdGmchOQH1AQFWMyVrvjxyJ9iORGWJMtql/Mo7gJ0EQBkEu+vpvli69dku/rzde/knTVngtg9UYcwAeZ6fppE6UzRFGmV0t0NiZ+gZDpVpcLGZfu+lHH/20yELX39tFZ2dn8JulS68NstHXgyAMVDUZZwP0xhjwctQIAVSC6cZaxtMPqaqzxgYS2t8vv+22j2zl929c1O1zmX+mVHHIAX6WoSrZXBFvo70uUSsE5VI1Keaiz29a8tELpHtR0tuVxgPLb7vtIxLa31sz7pVYxRh8GGxWADO0aYY4hxozXjVqLyIShHbT9GOOequI+J6eHunqWuRKN3xqOpnMtWYktN7Px9jI7sNgMUKUb8GJ2aubFRDn1cSJ00xov1f68aemd/Uucj09PSIifvoxR701CO2mZm1gXIxRjUGShGBw8IgRAmy68PWtSXsHQWkINWbMW7VV1QdhaIqHTXrXTdddt6qzZzjfR3NB/hqy0eE0Yo+MdwFKmgBv8xpO7bynkSQ0Er9bFcgFhiDfQqJ7F5uIiKnHic9mgsM9yTUiaG9XuvPKTdddt6p42KR3BWFoxlyNRVBjCEpDJO2TWP/GBa0MlyEHr73+jYPzzzwns+oxn3vqCaPGotY2V6WMkd/PZv75zltv+WZnZ2fQ/87hlO/zi6Sj5V0MVBPMOOfBInjvcEmMSxJc0iBu1InrNRqNOo16Nc376zVqSUwQZbG7QTYKLAkGlzT26sgDaQaFra25Ez7yhjNy2dd+4derrnqn6V+FuX3p0pUzjj8uEq+dzrlExmBXdTUGcY6gUqF02un6xD983Gw67fTVXPn/Fqd3fd/q7zDl8Pey6tFk8s2/Cqb+8ifYgQFcoZCSYJREaJYerQ2Cpff98Y5XqWrQ19dDd/eiRG/83N9QzP+Sepw0T8iQ8QQ/iRtUy0M7jeBT/NKCsVdFMgVa8vndBnteDIOVCrZe2uv1DQJJPhcFpUr99W1/+5Vfal9PIN2L1Fjj5px5Vl+j2ujap0kjEVQMtlLCFVtYe/GbWf/y7nTr2Q3P38JrXn7+8JFtjiSGQgvrL3w9j33ss5TmzicoDUEaG4zS7xsjxqw54uQj366q0tfTBH/Z5S8im7mKxClezXiDH9drVEqDI6XdHb2Gb0HTtA3fqFCN4926Q6OetlwOohx7q9oeNY048Zko+G7lF584SroXJX09PeKdl+NPOOFtNgyfayqAH43V4xxBaZDSS+by2Cd7Wd/1KqhW02N1beC2nPQRRNIGhkyW+owjWPX/fYg1f38pGmWw5XK6M8Wey5yqqreBlVxH69t/dfWSZ3s6O21X7ymq2mOI7Q/IhJOJk/H1+yLUqxWqldJeSbQCRpV6pUTN6W6fW1AK+SJkCnjdGwUQU4+dRoGd7J0u1uXfCrtOOUV7ejrtku997+lMW/GtNghEhw+a2mNfb7GVMhpFrHnH+1h12UepT56KDA2mewyk5W5hu4qfarrDV2s7qLK+85U89sleSnPmEZQG91gNVL0LwzCI8rnP3Hnzzbd2dnYGXb29iCx0jV9nvkpr/mUMVZPxPiSqVilRr1VGdySRCNYnVMqDNNzuVzMblJZ8gWAXhaId/p2IHSzXk0Ixc+bgqke/IgsXuq6uXjo7O4M7b7751qBY+EwQhnuUGm5l9bNP57FPLmJ99wVQr0HcQK3dwX1v45RQTRduTp2KNBrUOyaz6rJ/ZM073otGUcqsXaiBgrNhJggL+Rvv/u3tn++kM+jt7aK7uzt55IYvLYxag39gsJK48TpDoHlf1fIQjXpt386jEiFyMZXSALU42b0SCOgovs8YCQYGq0mhkPlfuuT9C7u7u5Pe3i46Ibjn9mWfDwv5G20YBZr2D+zc6stNq3/7e1l12T9Snzwltfptsp3tCbBtpKkKYtDDp6eSUS6z/hUX8tgneinNnpuqgd+BGoh4oxibxCvbzj37nd57Q18v3d2LklNuv+u0c3PnXfXxyrF+gxdrcWPfnCmCek+5NEAcN8bkMDIVIVBHvTTAULVGslUq2TQaEbwIpVqDuFbF7MXXKpAg5DSxtlry/1Wcc9Upt99/2iu6FyX09KDem/Zzz36nTeKVJj2Ay29n9X7Y6ufy2Cd6Wf/KC9MT1Xdi9cPloM0E8FreYQ1cBKYeni7gHNhIfcpUVl32Uda8/b1oOKwGZvOAJImXYlGG3vK2q2/9whee49JL7bKuLr10+dP5v8T+h2tNJvel+Ghmc64s0w4McbP2M0ZpnksoDw3gkmRMT6JTBCugtRKloQFK1Rrl2FFNPOVEKdcbDA0N4isDhLg9nrVIECxKh9ZZaTvktZnzeFvhZbm/xPUfvm/50/llXV1w6aX21i984bmht7ztaikWhSTxw+OtxqQYhBFr3vYeVv2vj1I/bCoyOLBLq2+St7x54ue+Jz/B5ElfZMP67Q95GN7W5fm1aQRpDBSKZNY8xfQl36flnhW4bA6NIoKBAZ5+x3v9xte8IWkf2PAvA+ef9RmA7K3Lf1DJ5d4iAwNJYAhiAibT4A65kxOkjCPA7kujrAguiamWhvDqx/kYQkW12Vre/B6jTS3bw+91zXSzTes8Z3J8OZrFv0czqUqIcfXEt7UHLfXqteWu+W8FaFt6x+Wb2iZ9vOOGnwdHXHOFSVrbkEYDW6sydNo8nln4NuozjoTy0OZi185vP6GtLWDjxu/wmnMvDZpPUN5prj+sBIdNTUlQqyGlQeqHpWowedktTP3Fj4nWPsuG81/Dhq5XGdavizZNPuz/5G6585R8YO7eEGbfwuCAUyNBDAQkrCfijXoav5E/0obDY/a+9Xo4x2/UqVZK7KhxYzyqiSLD3ak64ib2VO4dQpvGJCJcGZ3I5zKnstq0gjaw2sAZEzA04EqFlre0LFt+n3P+jE3Ftot1/To2dL+KwqrHmLT0BhpTp7Fmwf9gfecrwXlkaHDncr9j57+FAjz49BtpafkpA5vcTiPzLZWgVtvMsmILmdWPMfXWm1jzxoW4XB7SdipHLm/FCFou+23jjAAlIeR81vFrc1eTAHtZEBChUatSq5YP+MNHlbQFPa8xtweH89nMbPqDGaAJAQ43smxlizpKvmDUe6hW0ubRIMBWK8z42RLWdV9A7ZjjoDS0VfC7BzeS0N4eMLDpo1xw9leaLuCps8llfketumsT2pYExiA+3SqWMEx/tvUGUMNR6w5JlZIg4j08wRXmARJC7J56UBHq1TL1WnXCwd82zdvd93sgRBmQkM9nXsJ/RCfgMViN01nmnT/x1uPXXGxCNgtxjDTqaUa2d3fvaGmzDA29lQvOurbpAuRpGvUGxkR4v3MS7MAdqLFpZanR2Fxk2HzZ3QVBIQ3+k6OY7utcbh4mJiLcpStI1/lUy0PEjfp+sfwok8UGIeo9SdwgSeJd202zTnBJ7uXcEczAaBXbtPrdXHaHBlguj6R+o5AiQ6MB1q3enAUUGmvx/nmCkO2VaBckyGY3W/wo9wSOEQIafJ4T+LIeR0iDmJ1Hr6qeSmlwv4GfyxfJ5lsIowxRNke+2EYuX9zCy2//fK3a4N+iF3NHMI1IKyiyb9nPaGdsVRVjhHqtQRw+2SxgqeHYY2sITxCG7FHJcYQEUzaTYB+utAsk4WN6ElfoUTsmQXM2r1Ie3K3FjZfsB2FEMNwNNDJJpoSZHPmWtjTM2cI9OISiJjxgO7g8cypWY+LRhbpjlSorQQiqazmufW1KgP7hYpC5PyXAHp5U3SwWjQUJlOElMgnv01P4T78NCURwSUJlHHL8vRu/nXyveqwNyBfbkLSzqrk+QUHg0uxLKUmUTv/s71g0xfjPzJxZR7cs5amuGIVZNEkwdUxIkLYjO97LKXxHjyakjoohiRtUSgN47/eL5Q8HfS6J2VW6bKwlW2hLN8xuSv9nM7P5fTCdQMew6LUPJQysBeEuAL69whrWDS+2S+6lWt1+fmCP3cHYkEABi+NSncX/0ZNI6hXKzVRnfwV8mVyeIIxIkoTGrra/VyWwhmy+SKs2+GF4DP83cypW6/sf/C3xwt8NwMwhDVjQnGuOag9St2uJoqnE8d6tDRgmweSpsH5zijhaEqTt64Y1dYevDaVLvyZe8MkXWrBhNHJXSRxTr5Yw1hJE2R02i3hVojDgqcLhvNucgahnf2wIsJMA0FIuxdjMnQD09/sAEW2eADrEA08tJ5u7aK8JMJKjbp0ijoYEFsVJyMuSZ7iy/kdKEky47agq2Vw+BX8LkIMwxNo2apUSYgw2Dai2KbCBU+HwCC5wG/g509KTtvY3AUQ8UWSpVR/h/DMfR1UQ8SlCI4Gg7x/Njhw7VIJRuoNmdZ23xatQ9cRbreuduGAvCMPt7VYVMYZcoQWXxPid7HWsCKHGvFuehQNG+lGiDIi5vTmjuMVs4LolTeU1N1Mpe/ZlzfqWSrAPMcE6yWzey+yAqulqMzZIW8B21vzhOcBK04LgHRi5EYDeXtlscGknpLCCgMxTK8lmT6BW9fu0QbRIKp/Pr9srd2Cay7aP0jIryjeR04Qatrn1y+al3+Mh+2mQqXiv5AsthJnsHquh3wJ0BULq/A9/Gj/gSALitI9gf/p/awXnh8jFx3PeeeuaLqC5SZQ23e98iRG9nmxWd7JVxriniB7B4njCtPKhzOkUtMFkrdGuDTq0Rp6kuVB07CxaRMjlixRa2skX24gyWeq1yl65QoMnoEFATEid7+rRXMsMDMn+BX94WHM5RejnvPPWsXixRdJ6T7BdAO70x9Tr/4Bi9vm+dzB3sCdK4BCMNviv6FgGJOSi5BkiHM9LHvB8oPHwmGmAGEO+2Iqx4UgSmgsiGrUK1XKJXKG4W8IaEm7QqTxCAXAs9ZP4pUxF9n/hZ/gp0xKw6o8BmDJFto65NgMmPPhgiG95gFz+xH12A/voDgRFJWRkf2OJuKrSz983HmOTRPvWRDIc7ecLRJnc9tYuhiSu450jymR3+hkJQkDMtXoEb9XTgebOIiQHBviqig0E5wZw8YlctFn+ty/69GM59dQG1vyAbI59dgP76A4UwWpMoHUCbRD4Kif4Em4MxGkk2g/CnZZ3gzAiCMNmtL+5ULVt1uIxzJUhAmqExATEB1DwKo58HoT/5qKt5X97AnQ1Aff+GkqDDcTYMWTiqCaQHNL0oUIiITfaaVhiGs3tIvwoZtaGI/fd7s/UrJ0Ym24/J80wzzUtwzcVwJBwnU4lIRj52QGUtpj0VBauSB92wQ7S7q0fOu08vX/1f9PadhGDg35M+/d30FSy5/UBoZWEG8v9nOWepSYRAmTUMZhux7IHwbBFjG2uE0wotLQShJldBnzaFPb7fZHTzVDzX3bECSzVw7lI5+KamcqBY/3qyeaESvVBXn32aamobj3ZZ3Y+1uarOD/2y7VHWSwa3uV3gJDXFLr4anQqq0yR1VLgquh4njRFot0EXdlcgXxLO/liK4WWdrK5AvVatakIsstAL8SxSrKc41/Kj3U6qzXHXzTHv+pxvF5PI4EDDPyR4o9g7NcR8fT32x2DvSMVAHjgqd+Tz7+UatmPeUF+XwLD5iaROa2jWKZohftLN4zUCnZk+Zlsnky+sDXhxJA0anjv0kBwF+QTlIoGHKbnUiVLjjoJQkzYdAp6oBWtPGEgxPHT5P0szj231Bz33SoA9PenbkD1i4ShjMuT7UNgKChWG1Qx1LC0aEyA7jRiNcakkfy236GeIMoQhBn8Fu9tW8XzTXg3EhAAlpgqlhhp/lcPvIqlV0++KCj/xsteNkR/v90W/J0ToLvboWrI1n7FwKb7yOcN4zGfMeIOpuy1OxjurTckPGzauNe2U9SERrNOuPl3UsrstIVKFWMMxmyuLxqSkeAzBdkjeD6qJzBEpklDHQkID8BTDTyZyDA4+BxR9F1Uha4ut+MC1s7GuL/fMHNmHfynCUIZt8MbhjtdRzF3MCzNiVg+nplDXQyTtY5FyeBp1wYxFqce73a9tm84xviDtvIH7cCOVPUalBEu9afyQ2aMrGY64Pz9ttafKxjUf4Hu+c/vzPrZbYCnaugF3vTE7bS0nkNpyI3bil4R8DqqfgKD4iXk3GQt/1S/l5lukIYYfhwexQxf5W/jVVRtlmKxFdnJbOcwmTYSMse/lLMZ5JWynmc0wzXM4FGKWOIDp7FjV9YfRUK98QRR7VT6uyr0bh/97ykBLCKOe588i3zmdzTqHh3H3a1HGRhuSQLUM1WrVLCUTI47Szcw12+gpJYoCMgVW3f60K7p0y/w87iZGUDcFEm3p23cB0Llz9HSahkaeAuvPveHLFbLQnE7H7ddA+JYrJbTXnQHlep3aW1PE+jxu/lR9xh6BKMxgmet5ChJiFXHRgkJ1JGIJU5iqqXBkcUYfhvwDZ46IX+mQECdkISABgZ/8IBfKFoGB/pT8BfvEvzdK0D6oUIvwuvWTCLPSoJgMo0643rg77ASrFuXbm5g9nrvnaYiBMx2G7mx0sc0X6YsEbFCJozIFfKkLajpZ1sc4HmXP5WreBGG+MCb0999lctjrSOO53DB2Q+NFPV2qZy7B0M5BWH+Ec+T+I+Qy49qz5pRKcGU0TWVDGcAaMK9dhIvK7yK70UnMCgReVFcXOeP1ZDV5LA0sCQ8qjku9nMPTvDTh3a0tFhq9S80wbe7A3/PFGD46usL6O5OuH/1T2jruJhNGx3GjG+35ijLxtvFBlgQy1Rf4mhfpiQhD0kLHZLwap5nEwG3MYkK0cES6G0v/fmCpVpdwaTgbB6b51mA31ngt3cKsLk45FE1WPs+yqVnyGYN473F+Ri0nKfz9Q6rDdZKjj8GU3nItIPARkJ+yJHcyDQq2IMV/HS1T5JUQd/O/PkxLGFPwN87BQBGIsp7H30lhfalNOoJztlxb9gfAyXYMjbQZikn9f06EhQepMdUxrS0hgxseg8XnnvliFLvxZjsLeMCRBLuW/UZJk/9HBvXx0A47o85RiR4QV1eEzo6AjZuvIoLz3nX3oI/WgII/Vi6JeH+J39Ke/sb2bQhQUxwiAQTKf3eUWix1CrLsdWXs25dzIIFfk+lf/QE2DI1vPjeHJmpvyWXO43BwfEPCg+RYBh8TyZrcP5Z6u6lXHTWU3uS8u1bELhtatgLzJlTpt64mEZjDdmc3WpKbbwDw8lTx2Rp+sEHvvp0HwcpUy5fwkVnPdVs8xrVQOxL379nsVrmHPM4g6ULUcpkMmbCSGDGbn+Cg8jy09W9YWiolv6W13f9nr6+gIULR12d3Tf9XCiOvr6A+cffT6X8OoytTCgJxmhp+sER8HnFBkqUMZQr7+DC824cTdA3tgQA6O5O6OsLmHtsHwMDm0kwEQckj+HS9ANf9gMligzl8jt4zbnXjAX4ow8Cd5Ue3v14N8XiL1EtUKseCgzHIuCzgSGMoDL0Dl5z3jV8a3nI++fHY/HxZgxB2KwElfJ5qH+GllaL+mTClOCFFhiqd2RyBmOr1GoX8ZrzUssfI/DHVgGGrz4N6JaEe/4yk3zLErLZ2QxuikEOFYv2tshTLAYk8dOUy2/mtef9dqxkf3wJkFpk2khy8/I2XnTkNbS0vI4N630TJHOIBLscOwVxtLUFVCp3Utq4gNe/6onxAH/8CACkzQjN9GTlmn8ik/kUSQz1+kExi7ifwHdYa8kXoFa9kucfv4yFC6sjBjUeQzXOD5QuLBHx3P/U68hG3ybKTGNwIF1aM56TSAcTCdJ95RyFQoBLyjTqH+KCc64AoEcNi2TcgprxlmNFxNOnAS858pdsHDiDavV62jsCgkDGv73sIEgRVR3GCO3tAUn8B8pDZ3PBOVewWC2qMp7gj78C7CguAPjTmg9ggsvJZicxsGl8Y4MDVgnUoyiFoiVu1PH6RR696594//vj8fL3+5cAAD09ht7etIy84rGjKeS/SBT+HQpUSumOS+NBhAOJBOlCREcmExBGUK/fTCP5GBeedW/zfTPauv6BT4AdqcGDay4itIvI5edTrUK9lgBmzImwv0kwDHwYBuQLUK08gvOf4/wzvp+mz30B3d2OCV5vsn9MQcTR02NYrJZTZvyKp1eeTanybtT/iY5JAdnccCnZjSEAY7rB9V58r0fVEUZCW3sAPE21+hEGavM4/4zv09Nj6FHTlPwJb0ra/w1wWy5cuOeZAjl5G+ovI1c4FZdAuZzurq5jlDVMhBKk1u4BIZszRBFUyqsw4TdpVK7m1eeu3e7Z99N1oHRAStP3pYPxwAMR4eRL8HwAY15OLgfVCjQabkS59oUM40ECVR3ZFSoILLk8JDEkyd1g/oNa/EMuOmtwRO67utzedu+8kAmwuW7Q32+3ioAffvYslLfj9Q3kc0eApGSIY98ccNOsNcjek2B0y9CG77ZZtUt3rTPWksumU9TVygbEXI/z3+P8l94yAvQBBPyBSYCtC0jpApThwfrLhjZ8cgHOXYz6V5LJTSUMoVGHeh2cG96lQTavCt+Toz73QAnSXSTTZmJFQQVjLFEEUQacg1p1E5jbsPJTcDfSfeazI39/AAJ/YBNg68EftvDNvnL1pg6q9TMRXoX68/D+FPKFHNamYDQaqfw6t33Hd3O7gJGfjJBgHdSrIHYLkHT4eHFDEEAYpcfqeg+VcozInxD5HdbchLrfbwX64sVpuXvhwgNis/CDlwDbqwLb1cUf23A0ceN0nJuHMAeVk1A/gyjKkclubdneb58BDJNg/bqUPMPCoR4aMdRrDYw8C/IwcA82WIHICrpOf2Q7svb3mwPV2g9uAuyIDP39ssOKmWrAw08eTswREBwF/ijQaQRBK0l8GGJam0eBNDfEEkWs4BpV1q19BucqqD6DlSdx+iSBPoVpPEd3d22HNY0lsKdLsQ5d4+Um+voCVAMWqx3370m/yxy0BrTF9f8DimML/bC992cAAAAASUVORK5CYII=";
const LogoIcon = ({ size=36 }) => {
  const rx = Math.round(size * 0.26);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: rx,
      overflow: "hidden",
      flexShrink: 0,
      display: "inline-block",
      position: "relative",
      background: "#0ECAD4",
      boxShadow: `0 4px 18px rgba(14,202,212,0.45)`,
    }}>
      <img
        src={"data:image/png;base64," + LOGO_IMG}
        width={size} height={size}
        alt="logo"
        style={{ display:"block", width:size, height:size, objectFit:"cover" }}
      />
      <div style={{
        position:"absolute", inset:0, borderRadius:rx,
        background:"linear-gradient(135deg,rgba(255,255,255,0.15),transparent 55%)",
        pointerEvents:"none",
        boxShadow:"inset 0 0 0 1.5px rgba(255,255,255,0.2)",
      }}/>
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════
// KÖMEKÇI — EDARA DOLANDYRYŞ SISTÉMASY
// Wersiýa: 2.0  |  Ähli aýratynlyklar
// ═══════════════════════════════════════════════════════════════

// ─── Kömekçi funksiýalar ─────────────────────────────────────
const gNow = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
};

// Supabase DATE formaty: YYYY-MM-DD
const gToday = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`;
};

// Görkezmek üçin: YYYY-MM-DD -> DD.MM.YYYY
const fmtDate = (s) => {
  if (!s) return "";
  const p = s.split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s;
};

const uid    = () => Math.random().toString(36).slice(2, 9);
const tMin   = (t) => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const calcH  = (a, b) => { if (!a || !b) return null; const d = tMin(b) - tMin(a); return `${Math.floor(d / 60)}sa ${d % 60}min`; };

// Sene tapawudy: a - b gün (YYYY-MM-DD formaty)
const dDiff  = (a, b) => {
  if (!a || !b) return 0;
  return Math.floor((new Date(a) - new Date(b)) / 864e5);
};

// input type="date" YYYY-MM-DD berýär — görkemek üçin DD.MM.YYYY
const dlToTk = (dl) => fmtDate(dl);

// 3 aýyň içindemi? (YYYY-MM-DD formaty)
const in3M = (s) => {
  if (!s) return false;
  return dDiff(gToday(), s) <= 92;
};

// localStorage ─ try/catch bilen goraglanan
// localStorage diňe tema we dil üçin saklanýar (UI preference)
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// ═══════════════════════════ DİL ULGAMY ═══════════════════════
const TK = {
  appSub:"Edara Dolandyryş Sistémasy",appSubShort:"Edara Sistémasy",
  login:"Ulgama Giriş",loginSub:"Maglumatyňyzy giriziň",
  username:"Ulanyjy ady",password:"Parol",
  usernamePh:"ulanyjy adyňyz...",passwordPh:"parolyňyz...",
  loginBtn:"Giriş et",checking:"Barlanýar...",
  lightTheme:"Ýagty tema",darkTheme:"Garaňky tema",
  errFill:"Ulanyjy adyny we paroly dolduryň!",
  errWrong:"Ulanyjy ady ýa-da parol nädogry!",
  logout:"Çykyş",
  navHome:"Baş",navAttend:"Gatnaw",navTasks:"Tabşyryk",
  navAdmin:"Admin",navReport:"Hasabat",
  welcome:"Hoş geldiňiz",
  inOffice:"Işde",inProgress:"Dowam edýär",waiting:"Etmeli",done:"Tamamlandy",
  workers:"Işgärler",myTasks:"Meniň Tabşyryklam",
  recentActivity:"Soňky hereketler",noActivity:"Heniz hereket bellenilmedi",
  noWorkers:"Heniz işgär goşulmady",noTasks:"Tabşyryk ýok",
  workTime:"Iş wagty",overdueAlert:"tabşyrykda möhlet geçdi!",
  dueTodayAlert:"tabşyrygyň möhleti şu gün gutarýar",
  lateAlert:"Giç gelenler",taskStatus:"Tabşyryklar ýagdaýy",
  cameIn:"işe geldi",wentOut:"işden çykdy",
  myAttend:"Meniň gatnawy",attendTitle:"Gatnawyň hasaby",
  checkIn:"Işe geldim ✅",checkOut:"Işden gidýärin 👋",
  checkInHint:"Işe geleniňizde şu düwmä basyň",
  checkOutHint:"Gitmezden öň şu düwmä basyň",
  todayDone:"🎉 Şu günki iş üstünlikli tamamlandy!",
  entry:"Giriş",exit:"Çykyş",worked:"Işlän",
  noRecord:"Gatnawy ýazgylary ýok",atWork:"Işde",last7:"Soňky 7 günüm",
  archive:"3 Aýlyk Arhiw",allWorkers:"Ähli işgär",allMonths:"Ähli aý",
  csvDownload:"CSV ýükle",
  totalDays:"Jemi gün",totalHours:"Jemi sagat",edits:"Düzeltmeler",
  workerCol:"Işgär",dateCol:"Sene",entryCol:"Giriş",exitCol:"Çykyş",
  workedCol:"Işlän",noteCol:"Belgi",actionCol:"Hereket",
  late:"Giç",lateChip:"Giç",today:"Şu gün",edited:"Düzedilen",
  noData:"Maglumat tapylmady",
  attendNote:"Bu düzeltme arhiwde Düzedilen belgisi bilen saklanar",
  kanban:"Tabşyryklar Tagtasy",newTask:"Täze tabşyryk",
  editTask:"Tabşyrygy üýtget",createTask:"Täze tabşyryk",
  taskName:"Tabşyryk ady",taskNamePh:"Tabşyryk ady...",
  description:"Düşündiriş",descPh:"Gysgaça...",
  worker:"Işgär",priority:"Dereje",column:"Sütün",
  deadline:"Möhlet",color:"Reňk",
  high:"Ýokary",medium:"Orta",low:"Pes",
  col1:"Etmeli",col2:"Dowam edýär",col3:"Barlag",col4:"Tamamlandy",
  comments:"Bellikler",noComments:"Heniz bellik ýok",commentPh:"Bellik ýaz...",
  overdueTask:"Möhlet geçdi!",dueTodayTask:"Şu gün gutarýar",
  noTasksCol:"Tabşyryk ýok",onlyMyTasks:"Diňe size berlen tabşyryklar görkezilýär",
  adminPanel:"Admin Panel",fullAccess:"Doly ygtyýar",
  settings:"Sazlamalar",workersTab:"Işgärler",usersTab:"Ulanyjylar",
  addWorker:"Işgär goş",addUser:"Ulanyjy goş",
  editWorker:"Işgäri üýtget",newWorker:"Täze işgär",
  editUser:"Ulanyjy üýtget",newUser:"Täze ulanyjy",
  fullName:"Ady Soýady",position:"Wezipesi",
  initials:"Başlangyç harplar (mysal: MA)",
  roleLabel:"Roly",linkWorker:"Işgär bilen baglaň",selectWorker:"— Saýlaň —",
  noWorkersAdmin:"Heniz işgär ýok. Ilki işgär goşuň, soňra ulanyjy döredip oňa baglaň.",
  workStartLabel:"Başlanýar",workEndLabel:"Gutarýar",
  lateLimit:"Giç gelmek çägi (min)",
  lateLimitHint:"Iş başlangyjyndan şu minut geçenden soň Giç geldi hasaplanar",
  settingsTitle:"Edara sazlamalary",workTimeLabel:"Iş wagty",lateChipAdmin:"Giç gelmek çägi",
  profile:"Profil sazlamalary",saveProfile:"Sakla",
  changePass:"Paroly üýtget",changePassSub:"Bassaňyz parol üýtgedip bolýar",
  changePassOpen:"Täze parolyňyzy giriziň",
  currentPass:"Häzirki parol",newPass:"Täze parol",repeatPass:"Täze paroly gaýtala",
  errFillProfile:"Ady we ulanyjy adyny dolduryň!",
  errUserExists:"Bu ulanyjy ady eýýäm bar!",
  errWrongPass:"Häzirki parol ýalňyş!",errShortPass:"Täze parol azyndan 4 harp!",
  errPassMatch:"Täze parollar gabat gelmeýär!",
  saved:"Üstünlikli saklandy",profileUpdated:"Profil üstünlikli täzelendi",
  reports:"Hasabatlar",totalHoursS:"Jemi sagat",
  daysCount:"Gün hasaby",workerCount:"Işgärler",workerStats:"Işgär statistikasy",
  positionCol:"Wezipe",daysCol:"Gün",hoursCol:"Sagat",
  lateCol:"Giç",tasksCol:"Tabşyryklar",readyCol:"Taýýar",effCol:"Netijelilik",
  attendEdit:"Gatnawy düzelt",adminEdit:"Admin düzeltmesi",
  entryTime:"Giriş wagty",exitTime:"Çykyş wagty",
  errEntryFormat:"Giriş wagtyny dogry giriziň (HH:MM)",
  errExitFormat:"Çykyş wagtyny dogry giriziň (HH:MM)",
  errExitBefore:"Çykyş wagty giriş wagtyndan öň bolup bilmez!",
  aiTitle:"AI Kömekçi",aiActive:"Işjeň",
  aiQMyTasks:"Tabşyryklam?",aiQToday:"Şu gün näme etmeli?",
  aiQAdvice:"Maslahat ber",aiQEfficiency:"Nädip has netijeli?",
  aiQWho:"Işdä kim bar?",aiQOverdue:"Möhleti geçenler?",
  aiQPerf:"Netijelilik nähili?",aiQPlan:"Iş meýilnama düz",
  aiPh:"Sorag ýazyň...",
  aiGreet:"Salam",aiGreetMsg:"Men Kömekçiniň AI kömekçisi. Nähili kömek edip bilerin?",
  deny:"Rugsat ýok",denyMsg:"Siziň bu bölüme girişiňiz çäkli",
  cancel:"Ýatyr",create:"Döret",save:"Sakla",delete:"Poz",
  add:"Goş",edit:"Düzelt",close:"Ýap",
  toastWorkerAdded:"Işgär üstünlikli goşuldy",toastWorkerUpdated:"Işgär maglumaty täzelendi",
  toastWorkerDeleted:"Işgär pozuldy",toastUserAdded:"Ulanyjy üstünlikli goşuldy",
  toastUserUpdated:"Ulanyjy maglumaty täzelendi",toastUserDeleted:"Ulanyjy pozuldy",
  toastSettingsSaved:"Sazlamalar üstünlikli saklandy",
  toastEditDone:"Gatnawy düzeldildi",toastCsvDone:"CSV ýüklenildi",
  toastOverdue:"tabşyrykda möhlet geçdi",toastOverdueSub:"Tabşyryklar bölümine baryň",
  completedToast:"Üstünlikli tamamlandy! 🎉",taskCreated:"Tabşyryk üstünlikli döredildi",
  lateArrival:"giç geldi",onTime:"işe geldi",leftWork:"işden çykdy",
  workSchedule:"Iş:",
  dept:"Bölüm",depts:"Bölümler",addDept:"Bölüm goş",editDept:"Bölümi üýtget",
  newDept:"Täze bölüm",deptName:"Bölüm ady",deptNamePh:"mysal: Buhgalteriýa...",
  noDepts:"Heniz bölüm goşulmady",deptWorkers:"Bölümiň işgärleri",
  selectDept:"— Bölüm saýlaň —",deptAll:"Ähli bölümler",
  myDept:"Meniň bölümim",deptManager:"Bölüm başlygy",
  fileAttach:"Faýl goş",fileAttached:"Faýllar",noFiles:"Faýl goşulmady",
  fileUpload:"Ýüklenýär...",fileTooBig:"Faýl 10MB-dan uly bolup bilmez!",
  fileRemove:"Aýyr",fileDownload:"Ýükle",
  afterHours:"Iş wagty daşynda",afterHoursMsg:"Iş sagady tamamlandy, ýöne giriş bellenildi",
  beforeHours:"Iş başlamanka",beforeHoursMsg:"Iş sagady başlamanka giriş bellenildi",
};
const RU = {
  appSub:"Система Управления Офисом",appSubShort:"Система Управления",
  login:"Вход в систему",loginSub:"Введите ваши данные",
  username:"Имя пользователя",password:"Пароль",
  usernamePh:"ваш логин...",passwordPh:"ваш пароль...",
  loginBtn:"Войти",checking:"Проверка...",
  lightTheme:"Светлая тема",darkTheme:"Тёмная тема",
  errFill:"Введите имя пользователя и пароль!",
  errWrong:"Неверный логин или пароль!",logout:"Выход",
  navHome:"Главная",navAttend:"Посещаемость",navTasks:"Задачи",
  navAdmin:"Админ",navReport:"Отчёты",
  welcome:"Добро пожаловать",
  inOffice:"На работе",inProgress:"В процессе",waiting:"К выполнению",done:"Завершено",
  workers:"Сотрудники",myTasks:"Мои задачи",
  recentActivity:"Последние действия",noActivity:"Нет действий",
  noWorkers:"Сотрудников пока нет",noTasks:"Нет задач",
  workTime:"Рабочее время",overdueAlert:"задач просрочено!",
  dueTodayAlert:"задач истекает сегодня",lateAlert:"Опоздавшие",taskStatus:"Статус задач",
  cameIn:"пришёл на работу",wentOut:"ушёл с работы",
  myAttend:"Мои Записи Посещаемости",attendTitle:"Учёт посещаемости",
  checkIn:"Я пришёл",checkOut:"Ухожу с работы",
  checkInHint:"Нажмите когда пришли на работу",checkOutHint:"Нажмите перед уходом",
  todayDone:"Рабочий день завершён!",
  entry:"Приход",exit:"Уход",worked:"Отработано",
  noRecord:"Нет истории",atWork:"На работе",last7:"Последние 7 дней",
  archive:"Архив за 3 месяца",allWorkers:"Все сотрудники",allMonths:"Все месяцы",
  csvDownload:"Скачать CSV",
  totalDays:"Всего дней",totalHours:"Всего часов",edits:"Правки",
  workerCol:"Сотрудник",dateCol:"Дата",entryCol:"Приход",exitCol:"Уход",
  workedCol:"Отработано",noteCol:"Заметка",actionCol:"Действие",
  late:"Опоздал",lateChip:"Опозд.",today:"Сегодня",edited:"Исправлено",
  noData:"Нет данных",attendNote:"Исправление сохранится с пометкой Исправлено",
  kanban:"Канбан-доска",newTask:"Новая задача",
  editTask:"Редактировать задачу",createTask:"Новая задача",
  taskName:"Название задачи",taskNamePh:"Название задачи...",
  description:"Описание",descPh:"Кратко...",
  worker:"Сотрудник",priority:"Приоритет",column:"Колонка",
  deadline:"Срок выполнения",color:"Цвет",
  high:"Высокий",medium:"Средний",low:"Низкий",
  col1:"К выполнению",col2:"В процессе",col3:"На проверке",col4:"Готово",
  comments:"Комментарии",noComments:"Комментариев пока нет",commentPh:"Написать комментарий...",
  overdueTask:"Срок истёк!",dueTodayTask:"Истекает сегодня",
  noTasksCol:"Нет задач",onlyMyTasks:"Отображаются только ваши задачи",
  adminPanel:"Панель администратора",fullAccess:"Полный доступ",
  settings:"Настройки",workersTab:"Сотрудники",usersTab:"Пользователи",
  addWorker:"Добавить сотрудника",addUser:"Добавить пользователя",
  editWorker:"Редактировать сотрудника",newWorker:"Новый сотрудник",
  editUser:"Редактировать пользователя",newUser:"Новый пользователь",
  fullName:"Полное имя",position:"Должность",initials:"Инициалы (например: ОА)",
  roleLabel:"Роль",linkWorker:"Привязать сотрудника",selectWorker:"— Выберите —",
  noWorkersAdmin:"Сотрудников пока нет. Сначала добавьте сотрудника, затем создайте пользователя.",
  workStartLabel:"Начало",workEndLabel:"Конец",lateLimit:"Порог опоздания (мин)",
  lateLimitHint:"После этого количества минут от начала работы считается опозданием",
  settingsTitle:"Настройки офиса",workTimeLabel:"Рабочее время",lateChipAdmin:"Порог опозд.",
  profile:"Настройки профиля",saveProfile:"Сохранить",
  changePass:"Изменить пароль",changePassSub:"Нажмите чтобы изменить пароль",
  changePassOpen:"Введите новый пароль",
  currentPass:"Текущий пароль",newPass:"Новый пароль",repeatPass:"Повторите пароль",
  errFillProfile:"Заполните имя и логин!",errUserExists:"Этот логин уже занят!",
  errWrongPass:"Неверный текущий пароль!",errShortPass:"Пароль минимум 4 символа!",
  errPassMatch:"Пароли не совпадают!",saved:"Сохранено",profileUpdated:"Профиль обновлён",
  reports:"Отчёты",totalHoursS:"Всего часов",daysCount:"Дней",workerCount:"Сотрудников",
  workerStats:"Статистика сотрудников",
  positionCol:"Должность",daysCol:"Дни",hoursCol:"Часы",
  lateCol:"Опозд.",tasksCol:"Задачи",readyCol:"Готово",effCol:"Эффектив.",
  attendEdit:"Редактировать посещаемость",adminEdit:"Правка администратора",
  entryTime:"Время прихода",exitTime:"Время ухода",
  errEntryFormat:"Введите правильное время прихода (ЧЧ:ММ)",
  errExitFormat:"Введите правильное время ухода (ЧЧ:ММ)",
  errExitBefore:"Время ухода не может быть раньше прихода!",
  aiTitle:"ИИ-Помощник",aiActive:"Активен",
  aiQMyTasks:"Мои задачи?",aiQToday:"Что делать сегодня?",
  aiQAdvice:"Совет",aiQEfficiency:"Как быть эффективнее?",
  aiQWho:"Кто на работе?",aiQOverdue:"Просроченные?",
  aiQPerf:"Как продуктивность?",aiQPlan:"Составь план",aiPh:"Напишите вопрос...",
  aiGreet:"Привет",aiGreetMsg:"Я ИИ-помощник Komekchi. Как могу помочь?",
  deny:"Доступ запрещён",denyMsg:"Недостаточно прав",
  cancel:"Отмена",create:"Создать",save:"Сохранить",delete:"Удалить",
  add:"Добавить",edit:"Редактировать",close:"Закрыть",
  toastWorkerAdded:"Сотрудник добавлен",toastWorkerUpdated:"Сотрудник обновлён",
  toastWorkerDeleted:"Сотрудник удалён",toastUserAdded:"Пользователь добавлен",
  toastUserUpdated:"Пользователь обновлён",toastUserDeleted:"Пользователь удалён",
  toastSettingsSaved:"Настройки сохранены",
  toastEditDone:"Посещаемость исправлена",toastCsvDone:"CSV скачан",
  toastOverdue:"задач просрочено",toastOverdueSub:"Перейдите в раздел задач",
  completedToast:"Готово!",taskCreated:"Задача создана",
  lateArrival:"опоздал",onTime:"пришёл на работу",leftWork:"ушёл с работы",
  workSchedule:"Работа:",
  dept:"Отдел",depts:"Отделы",addDept:"Добавить отдел",editDept:"Редактировать отдел",
  newDept:"Новый отдел",deptName:"Название отдела",deptNamePh:"например: Бухгалтерия...",
  noDepts:"Отделов пока нет",deptWorkers:"Сотрудники отдела",
  selectDept:"— Выберите отдел —",deptAll:"Все отделы",
  myDept:"Мой отдел",deptManager:"Руководитель отдела",
  fileAttach:"Прикрепить файл",fileAttached:"Файлы",noFiles:"Файлы не прикреплены",
  fileUpload:"Загрузка...",fileTooBig:"Файл не может быть больше 10МБ!",
  fileRemove:"Удалить",fileDownload:"Скачать",
  afterHours:"Вне рабочего времени",afterHoursMsg:"Рабочее время завершено, но отмечен приход",
  beforeHours:"До начала работы",beforeHoursMsg:"Приход отмечен до начала рабочего времени",
};
const EN = {
  appSub:"Office Management System",appSubShort:"Management System",
  login:"Sign In",loginSub:"Enter your credentials",
  username:"Username",password:"Password",
  usernamePh:"your username...",passwordPh:"your password...",
  loginBtn:"Sign In",checking:"Checking...",
  lightTheme:"Light theme",darkTheme:"Dark theme",
  errFill:"Please enter username and password!",
  errWrong:"Invalid username or password!",logout:"Logout",
  navHome:"Home",navAttend:"Attendance",navTasks:"Tasks",
  navAdmin:"Admin",navReport:"Reports",
  welcome:"Welcome",
  inOffice:"At Work",inProgress:"In Progress",waiting:"Etmeli",done:"Done",
  workers:"Employees",myTasks:"My Tasks",
  recentActivity:"Recent Activity",noActivity:"No activity yet",
  noWorkers:"No employees yet",noTasks:"No tasks",
  workTime:"Work hours",overdueAlert:"tasks overdue!",
  dueTodayAlert:"tasks due today",lateAlert:"Late arrivals",taskStatus:"Task Status",
  cameIn:"arrived",wentOut:"left work",
  myAttend:"My Attendance",attendTitle:"Attendance Tracker",
  checkIn:"Check In",checkOut:"Check Out",
  checkInHint:"Press when you arrive at work",checkOutHint:"Press before you leave",
  todayDone:"Today work is complete!",
  entry:"Entry",exit:"Exit",worked:"Worked",
  noRecord:"No history",atWork:"At work",last7:"Last 7 Days",
  archive:"3-Month Archive",allWorkers:"All employees",allMonths:"All months",
  csvDownload:"Download CSV",
  totalDays:"Total days",totalHours:"Total hours",edits:"Edits",
  workerCol:"Employee",dateCol:"Date",entryCol:"Entry",exitCol:"Exit",
  workedCol:"Worked",noteCol:"Note",actionCol:"Action",
  late:"Late",lateChip:"Late",today:"Today",edited:"Edited",
  noData:"No data",attendNote:"This correction will be saved with an Edited mark",
  kanban:"Kanban Board",newTask:"New Task",
  editTask:"Edit Task",createTask:"New Task",
  taskName:"Task name",taskNamePh:"Task name...",
  description:"Description",descPh:"Brief description...",
  worker:"Employee",priority:"Priority",column:"Column",
  deadline:"Deadline",color:"Color",
  high:"High",medium:"Medium",low:"Low",
  col1:"Etmeli",col2:"In Progress",col3:"Review",col4:"Done",
  comments:"Comments",noComments:"No comments yet",commentPh:"Write a comment...",
  overdueTask:"Overdue!",dueTodayTask:"Due today",
  noTasksCol:"No tasks",onlyMyTasks:"Showing only your assigned tasks",
  adminPanel:"Admin Panel",fullAccess:"Full Access",
  settings:"Settings",workersTab:"Employees",usersTab:"Users",
  addWorker:"Add Employee",addUser:"Add User",
  editWorker:"Edit Employee",newWorker:"New Employee",
  editUser:"Edit User",newUser:"New User",
  fullName:"Full name",position:"Position",initials:"Initials (e.g. JD)",
  roleLabel:"Role",linkWorker:"Link to Employee",selectWorker:"— Select —",
  noWorkersAdmin:"No employees yet. Add an employee first, then create a user.",
  workStartLabel:"Start",workEndLabel:"End",lateLimit:"Late threshold (min)",
  lateLimitHint:"Minutes after work start before marking as late",
  settingsTitle:"Office Settings",workTimeLabel:"Work hours",lateChipAdmin:"Late threshold",
  profile:"Profile Settings",saveProfile:"Save",
  changePass:"Change Password",changePassSub:"Click to change password",
  changePassOpen:"Enter new password",
  currentPass:"Current password",newPass:"New password",repeatPass:"Repeat password",
  errFillProfile:"Please fill in name and username!",errUserExists:"This username is already taken!",
  errWrongPass:"Wrong current password!",errShortPass:"Password must be at least 4 characters!",
  errPassMatch:"Passwords do not match!",saved:"Saved",profileUpdated:"Profile updated",
  reports:"Reports",totalHoursS:"Total hours",daysCount:"Days",workerCount:"Employees",
  workerStats:"Employee Statistics",
  positionCol:"Position",daysCol:"Days",hoursCol:"Hours",
  lateCol:"Late",tasksCol:"Tasks",readyCol:"Done",effCol:"Efficiency",
  attendEdit:"Edit Attendance",adminEdit:"Admin Edit",
  entryTime:"Entry time",exitTime:"Exit time",
  errEntryFormat:"Enter valid entry time (HH:MM)",
  errExitFormat:"Enter valid exit time (HH:MM)",
  errExitBefore:"Exit time cannot be before entry time!",
  aiTitle:"AI Assistant",aiActive:"Active",
  aiQMyTasks:"My tasks?",aiQToday:"What to do today?",
  aiQAdvice:"Give advice",aiQEfficiency:"Be more efficient?",
  aiQWho:"Who is at work?",aiQOverdue:"Overdue tasks?",
  aiQPerf:"Performance?",aiQPlan:"Make a work plan",aiPh:"Type your question...",
  aiGreet:"Hello",aiGreetMsg:"I am Komekchi AI assistant. How can I help you?",
  deny:"Access Denied",denyMsg:"You do not have sufficient permissions",
  cancel:"Cancel",create:"Create",save:"Save",delete:"Delete",
  add:"Add",edit:"Edit",close:"Close",
  toastWorkerAdded:"Employee added",toastWorkerUpdated:"Employee updated",
  toastWorkerDeleted:"Employee deleted",toastUserAdded:"User added",
  toastUserUpdated:"User updated",toastUserDeleted:"User deleted",
  toastSettingsSaved:"Settings saved",
  toastEditDone:"Attendance corrected",toastCsvDone:"CSV downloaded",
  toastOverdue:"tasks overdue",toastOverdueSub:"Go to tasks section",
  completedToast:"Done!",taskCreated:"Task created",
  lateArrival:"arrived late",onTime:"arrived",leftWork:"left work",
  workSchedule:"Work:",
  dept:"Department",depts:"Departments",addDept:"Add Department",editDept:"Edit Department",
  newDept:"New Department",deptName:"Department Name",deptNamePh:"e.g. Accounting...",
  noDepts:"No departments yet",deptWorkers:"Department Employees",
  selectDept:"— Select Department —",deptAll:"All Departments",
  myDept:"My Department",deptManager:"Department Manager",
  fileAttach:"Attach File",fileAttached:"Files",noFiles:"No files attached",
  fileUpload:"Uploading...",fileTooBig:"File cannot exceed 10MB!",
  fileRemove:"Remove",fileDownload:"Download",
  afterHours:"Outside work hours",afterHoursMsg:"Work hours ended, but check-in recorded",
  beforeHours:"Before work hours",beforeHoursMsg:"Check-in recorded before work hours start",
};
const LANGS = {tk:TK, ru:RU, en:EN};

function useLang() {
  const [lang, setLang] = useState(() => LS.get("k_lang","tk"));
  const setL = (l) => { setLang(l); LS.set("k_lang",l); };
  const tl = LANGS[lang] || TK;
  return { lang, setL, tl };
}

function LangSwitcher({ lang, setL, C }) {
  const [open, setOpen] = useState(false);
  const flags = { tk:"🇹🇲", ru:"🇷🇺", en:"🇬🇧" };
  return (
    <div style={{ position:"relative" }}>
      {/* Kiçi düwme — diňe häzirki dil */}
      <button
        onClick={() => setOpen(o => !o)}
        className="kb"
        style={{
          display:"flex", alignItems:"center", gap:4,
          padding:"5px 9px", borderRadius:9,
          border:`1px solid ${C.bd}`, background:C.cd,
          cursor:"pointer", fontSize:13, fontWeight:800,
          color:C.tx, transition:"all .15s",
        }}>
        <span>{flags[lang]}</span>
        <span style={{fontSize:10, color:C.txS}}>{lang.toUpperCase()}</span>
        <span style={{fontSize:9, color:C.txM, marginLeft:1}}>{open?"▲":"▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:299 }}
          />
          <div style={{
            position:"absolute", top:"calc(100% + 6px)", left:0,
            background:C.cd, border:`1px solid ${C.bd}`,
            borderRadius:12, padding:6, zIndex:300,
            display:"flex", flexDirection:"column", gap:3,
            boxShadow:C.sh, minWidth:110, animation:"kPp .15s",
          }}>
            {[{c:"tk",f:"🇹🇲",l:"Türkmen"},{c:"ru",f:"🇷🇺",l:"Русский"},{c:"en",f:"🇬🇧",l:"English"}].map(o=>(
              <button key={o.c}
                onClick={() => { setL(o.c); setOpen(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"7px 10px", borderRadius:8,
                  border:"none", cursor:"pointer",
                  background: lang===o.c ? C.acG : "transparent",
                  color: lang===o.c ? C.ac : C.tx,
                  fontSize:13, fontWeight: lang===o.c ? 800 : 600,
                  transition:"all .12s", textAlign:"left",
                }}>
                <span style={{fontSize:18}}>{o.f}</span>
                <span>{o.l}</span>
                {lang===o.c && <span style={{marginLeft:"auto",color:C.ac}}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════


// ─── Reňk temalary ───────────────────────────────────────────
const DARK = {
  bg: "#07090F", sf: "#0D1120", cd: "#121828", cdH: "#182035",
  bd: "#1C2A42", bdS: "#131E30",
  ac: "#6B8FFF", acG: "#6B8FFF25", acD: "#3D5FDD",
  gn: "#2ECC8F", gnS: "#2ECC8F20",
  rd: "#FF6B7A", rdS: "#FF6B7A20",
  yw: "#FFB84D", ywS: "#FFB84D20",
  pu: "#B07EFF", puS: "#B07EFF20",
  tx: "#E8EEF8", txS: "#8898B8", txM: "#3D506A",
  sh: "0 8px 32px #00000070",
};
const LITE = {
  bg: "#F0F4FF", sf: "#FFFFFF", cd: "#FFFFFF", cdH: "#F5F7FF",
  bd: "#DDE3F0", bdS: "#EEF2FF",
  ac: "#4B6EF5", acG: "#4B6EF520", acD: "#2E4ED0",
  gn: "#0DBF7A", gnS: "#0DBF7A20",
  rd: "#F04F5F", rdS: "#F04F5F20",
  yw: "#F5A623", ywS: "#F5A62320",
  pu: "#7C4DFF", puS: "#7C4DFF20",
  tx: "#1A2540", txS: "#5060A0", txM: "#A0AABF",
  sh: "0 8px 32px #1428601A",
};

// ─── Sabit maglumatlar ────────────────────────────────────────
const AVC  = ["#6B8FFF", "#B07EFF", "#FF7DC6", "#2ECC8F", "#22DDEE"];
const TKC  = ["#6B8FFF", "#2ECC8F", "#FF6B7A", "#FFB84D", "#B07EFF", "#FF7DC6", "#22DDEE"];
const COLS = ["Etmeli", "Dowam edýär", "Barlag", "Tamamlandy"];

// Sütün adyny dile görä almak
function getColLabel(col, tl) {
  const map = {
    "Etmeli": tl.col1,
    "Dowam edýär": tl.col2,
    "Barlag": tl.col3,
    "Tamamlandy": tl.col4,
  };
  return map[col] || col;
}


const CM = {
  "Etmeli":        { c: "#8898B8" },
  "Dowam edýär":{ c: "#6B8FFF" },
  "Barlag":        { c: "#FFB84D" },
  "Tamamlandy":    { c: "#2ECC8F" },
};

const PM = {
  ýokary: { c: "#FF6B7A", l: "Ýokary" },
  orta:   { c: "#FFB84D", l: "Orta"   },
  pes:    { c: "#2ECC8F", l: "Pes"    },
};

const RL = {
  admin:   { l: "Admin",       ic: (c,s) => I.crown(c,s),     c: "#FF6B7A" },
  bashlik: { l: "Başlyk",  ic: (c,s) => I.briefcase(c,s), c: "#FFB84D" },
  ishgar:  { l: "Işgär",   ic: (c,s) => I.hardhat(c,s),   c: "#2ECC8F" },
};

// Başlangyç sazlamalar
const DEF_SETTINGS = { workStart: "08:00", workEnd: "18:00", lateLimit: 15 };

// Başlangyç ulanyjy — diňe admin
const INIT_USERS = [{ id: "u1", username: "admin", password: "admin123", role: "admin", name: "Admin", wid: null }];

// ─── React hooks ─────────────────────────────────────────────
function useMob() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function useCSS(C) {
  useEffect(() => {
    const id = "k-style";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { overflow-x: hidden; -webkit-font-smoothing: antialiased; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.bd}; border-radius: 9px; }
      input, textarea, select { font-family: inherit; outline: none; }
      input:focus, textarea:focus, select:focus {
        border-color: ${C.ac} !important;
        box-shadow: 0 0 0 3px ${C.ac}22 !important;
      }
      @keyframes kUp  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
      @keyframes kIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes kSl  { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
      @keyframes kGl  { 0%,100% { box-shadow:0 0 14px ${C.ac}55 } 50% { box-shadow:0 0 28px ${C.ac}99 } }
      @keyframes kBl  { 0%,80%,100% { transform:scale(1); opacity:.35 } 40% { transform:scale(1.4); opacity:1 } }
      @keyframes kSh  { 0%,100% { transform:translateX(0) } 20%,60% { transform:translateX(-7px) } 40%,80% { transform:translateX(7px) } }
      @keyframes kFl  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-7px) } }
      @keyframes kPp  { 0% { transform:scale(.88); opacity:0 } 100% { transform:scale(1); opacity:1 } }
      @keyframes kSp  { to { transform:rotate(360deg) } }
      .kc:hover  { background:${C.cdH} !important; transform:translateY(-2px); box-shadow:${C.sh}; }
      .kb:hover  { filter:brightness(1.12); transform:translateY(-1px); }
      .kn:hover  { background:${C.acG} !important; color:${C.ac} !important; }
      .ksk       { animation:kSh .4s ease; }
    `;
  }, [C]);
}

function useToast() {
  const [ts, setTs] = useState([]);
  const add = useCallback((title, msg = "", type = "info") => {
    const id = uid();
    setTs((p) => [...p, { id, title, msg, type }]);
    setTimeout(() => setTs((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const rm = useCallback((id) => setTs((p) => p.filter((t) => t.id !== id)), []);
  return { ts, add, rm };
}

// ═══════════════════════════════════════════════════════════════
// ATOM KOMPONENTLER
// ═══════════════════════════════════════════════════════════════

const Av = ({ a = "?", i = 0, z = 38 }) => {
  const bg = AVC[i % AVC.length];
  return (
    <div style={{
      width: z, height: z, borderRadius: z * 0.28, flexShrink: 0,
      background: `linear-gradient(135deg,${bg},${bg}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: z * 0.3, fontWeight: 800, color: "#fff",
      boxShadow: `0 3px 10px ${bg}44`,
    }}>{a}</div>
  );
};

const Chip = ({ children, color, sm = false }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: sm ? "2px 8px" : "3px 11px", borderRadius: 99,
    whiteSpace: "nowrap", fontSize: sm ? 10 : 11, fontWeight: 700,
    background: color + "1E", color, border: `1px solid ${color}44`,
  }}>{children}</span>
);

const RC = ({ role }) => {
  const r = RL[role];
  return r ? <Chip color={r.c}><span style={{display:"flex",alignItems:"center",gap:4}}>{r.ic(r.c, 12)} {r.l}</span></Chip> : null;
};

function Btn({ ch, onClick, v = "p", sz = "m", disabled = false, block = false, sx = {} }) {
  const styles = {
    p:  { bg: "linear-gradient(135deg,#6B8FFF,#4B6EF5)", c: "#fff", b: "none" },
    ok: { bg: "linear-gradient(135deg,#2ECC8F,#0DBF7A)", c: "#fff", b: "none" },
    dl: { bg: "transparent", c: "#FF6B7A", b: "1px solid #FF6B7A44" },
    gh: { bg: "transparent", c: "inherit", b: "1px solid transparent" },
    ot: { bg: "transparent", c: "#6B8FFF", b: "1px solid #6B8FFF55" },
    wn: { bg: "linear-gradient(135deg,#FFB84D,#F5A623)", c: "#fff", b: "none" },
  };
  const S = styles[v] || { bg: "transparent", c: "inherit", b: "none" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="kb"
      style={{
        padding: sz === "s" ? "5px 12px" : sz === "l" ? "13px 26px" : "8px 18px",
        borderRadius: 12, border: S.b, background: S.bg, color: S.c,
        fontSize: sz === "s" ? 12 : sz === "l" ? 15 : 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: 6,
        transition: "all .15s",
        width: block ? "100%" : undefined,
        justifyContent: block ? "center" : undefined,
        ...sx,
      }}
    >{ch}</button>
  );
}

const Lbl = ({ t, C }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: C.txS,
    textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6,
  }}>{t}</div>
);

const Inp = ({ C, pfx, ...p }) => (
  <div style={{ position: "relative" }}>
    {pfx && (
      <span style={{
        position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
        fontSize: 15, pointerEvents: "none", zIndex: 1,
      }}>{pfx}</span>
    )}
    <input
      style={{
        width: "100%",
        padding: pfx ? "10px 14px 10px 38px" : "10px 14px",
        borderRadius: 12, background: C.sf, border: `1.5px solid ${C.bd}`,
        color: C.tx, fontSize: 14, transition: "all .2s",
        ...(p.style || {}),
      }}
      {...p}
    />
  </div>
);

const Txta = ({ C, ...p }) => (
  <textarea
    style={{
      width: "100%", padding: "9px 13px", borderRadius: 12,
      background: C.sf, border: `1.5px solid ${C.bd}`,
      color: C.tx, fontSize: 13, resize: "vertical",
      minHeight: 70, lineHeight: 1.5, transition: "all .2s",
    }}
    {...p}
  />
);

const Sel = ({ C, kids, ...p }) => (
  <select
    style={{
      width: "100%", padding: "9px 13px", borderRadius: 12,
      background: C.sf, border: `1.5px solid ${C.bd}`,
      color: C.tx, fontSize: 13, cursor: "pointer",
    }}
    {...p}
  >{kids}</select>
);

const STit = ({ icon, t, C, mb = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: mb }}>
    <div style={{
      width: 36, height: 36, borderRadius: 11, background: C.acG,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
    }}>{icon}</div>
    <h2 style={{ fontSize: 18, fontWeight: 900, color: C.tx, letterSpacing: "-.4px" }}>{t}</h2>
  </div>
);

const Pop = ({ C, onClose, children, w = 480 }) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onClose()}
    style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 400, padding: 16, backdropFilter: "blur(8px)", animation: "kIn .2s",
    }}
  >
    <div style={{
      background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 22,
      padding: 24, width: "100%", maxWidth: w, maxHeight: "90vh",
      overflowY: "auto", boxShadow: C.sh, animation: "kPp .25s ease",
      margin: "0 8px",
    }}>{children}</div>
  </div>
);

const Deny = ({ C, tl }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: 300, gap: 16,
  }}>
    <div style={{ color: C.txM }}>{I.lock(C.txM, 52)}</div>
    <div style={{ fontSize: 20, fontWeight: 900, color: C.tx }}>{tl ? tl.deny : "Rugsat ýok"}</div>
    <Chip color="#FF6B7A">{tl ? tl.denyMsg : "Siziň bu bölüme girişiňiz çäkli"}</Chip>
  </div>
);

// ─── Toast bildirişler ────────────────────────────────────────
function Toast({ ts, rm, C }) {
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 8, maxWidth: 300,
    }}>
      {ts.map((t) => (
        <div
          key={t.id}
          onClick={() => rm(t.id)}
          style={{
            background: C.cd,
            border: `1px solid ${t.type === "ok" ? C.gn : t.type === "err" ? C.rd : C.ac}44`,
            borderLeft: `4px solid ${t.type === "ok" ? C.gn : t.type === "err" ? C.rd : C.ac}`,
            borderRadius: 14, padding: "12px 16px", boxShadow: C.sh,
            cursor: "pointer", display: "flex", gap: 10,
            animation: "kPp .25s", fontSize: 13, color: C.tx,
          }}
        >
          <span style={{ fontSize: 18 }}>
            {t.type === "ok" ? I.check(C.gn,18) : t.type === "err" ? I.warning(C.rd,18) : I.bell(C.ac,18)}
          </span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>
            {t.msg && <div style={{ color: C.txS, fontSize: 12 }}>{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Parol güýji ──────────────────────────────────────────────
function PwStrength({ pw, match, C }) {
  const score = [pw.length >= 6, /[A-Za-z]/.test(pw), /[0-9]/.test(pw), pw.length >= 10]
    .filter(Boolean).length;
  const meta = [
    { l: "Gysga",  c: "#FF6B7A" },
    { l: "Gowşak", c: "#FFB84D" },
    { l: "Orta",   c: "#6B8FFF" },
    { l: "Güýçli", c: "#2ECC8F" },
    { l: "Ajaýyp", c: "#B07EFF" },
  ][score];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: i < score ? meta.c : C.bd, transition: "background .4s",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: meta.c }}>{meta.l}</span>
        {match && pw && <span style={{ fontSize: 11, fontWeight: 700, color: C.gn }}>{tl.saved.replace("Üstünlikli saklandy","✓ Gabat gelýär")}</span>}
        {!match && pw && <span style={{ fontSize: 11, fontWeight: 700, color: C.rd }}>{tl.errPassMatch.slice(0,14)}</span>}
      </div>
    </div>
  );
}

function PwField({ label, val, set, C }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <Lbl t={label} C={C} />}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={val}
          onChange={(e) => set(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%", padding: "10px 44px 10px 14px",
            borderRadius: 12, background: C.bg,
            border: `1.5px solid ${C.bd}`, color: C.tx,
            fontSize: 14, fontFamily: "inherit", transition: "all .2s",
            letterSpacing: val ? "2px" : "normal",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute", right: 12, top: "50%",
            transform: "translateY(-50%)", background: "none",
            border: "none", cursor: "pointer", fontSize: 16, color: C.txS,
          }}
        >{show ? I.eyeOff(C.txS,16) : I.eye(C.txS,16)}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SAHYPASY
// ═══════════════════════════════════════════════════════════════
function Login({ users, onLogin, C, dark, setDark, tl, lang, setL }) {
  useCSS(C);
  const [un, setUn]       = useState("");
  const [pw, setPw]       = useState("");
  const [show, setShow]   = useState(false);
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);
  const [shake, setShake] = useState(false);

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const go = () => {
    if (!un.trim() || !pw.trim()) { setErr(tl.errFill); doShake(); return; }
    setBusy(true); setErr("");
    setTimeout(() => {
      const found = users.find((u) => u.username === un.trim() && u.password === pw.trim());
      if (found) { onLogin(found); }
      else { setErr(tl.errWrong); doShake(); }
      setBusy(false);
    }, 600);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
      position: "relative", overflow: "hidden",
      fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
    }}>
      {/* Fon bezegi */}
      <div style={{
        position: "absolute", top: "-18%", left: "-8%", width: "55%", paddingTop: "55%",
        borderRadius: "50%",
        background: `radial-gradient(circle,${C.ac}1A,transparent 70%)`,
        pointerEvents: "none", animation: "kFl 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "-12%", right: "-6%", width: "45%", paddingTop: "45%",
        borderRadius: "50%",
        background: `radial-gradient(circle,${C.pu}18,transparent 70%)`,
        pointerEvents: "none", animation: "kFl 5s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${C.bd}40 1px,transparent 1px),linear-gradient(90deg,${C.bd}40 1px,transparent 1px)`,
        backgroundSize: "52px 52px", opacity: 0.35,
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32, animation: "kUp .4s" }}>
          <div style={{ margin: "0 auto 16px", display:"flex", justifyContent:"center",
            animation: "kFl 3.2s ease-in-out infinite",
            filter: "drop-shadow(0 10px 28px rgba(14,202,212,0.5))",
          }}><LogoIcon size={80}/></div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><LogoText size={36} C={C} center={true}/></div>
          <div style={{ fontSize: 13, color: C.txS }}>{tl.appSub}</div>
        </div>

        {/* Giriş kartasy */}
        <div
          className={shake ? "ksk" : ""}
          style={{
            background: C.cd, border: `1px solid ${C.bd}`,
            borderRadius: 24, padding: "32px 28px",
            boxShadow: C.sh, animation: "kPp .3s ease",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.tx, marginBottom: 4 }}>{tl.login}</div>
            <div style={{ fontSize: 13, color: C.txS }}>{tl.loginSub}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Lbl t={tl.username} C={C} />
              <Inp
                C={C} pfx={I.user(C.txS,14)} value={un} autoComplete="off"
                onChange={(e) => { setUn(e.target.value); setErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && go()}
                placeholder={tl.usernamePh}
              />
            </div>
            <div>
              <Lbl t={tl.password} C={C} />
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  autoComplete="new-password"
                  onChange={(e) => { setPw(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                  placeholder={tl.passwordPh}
                  style={{
                    width: "100%", padding: "10px 44px 10px 14px",
                    borderRadius: 12, background: C.sf,
                    border: `1.5px solid ${C.bd}`, color: C.tx,
                    fontSize: 14, fontFamily: "inherit", transition: "all .2s",
                    letterSpacing: pw && !show ? "2px" : "normal",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", fontSize: 17, color: C.txS,
                  }}
                >{show ? I.eyeOff(C.txS,16) : I.eye(C.txS,16)}</button>
              </div>
            </div>

            {err && (
              <div style={{
                background: C.rdS, border: `1px solid ${C.rd}44`,
                borderRadius: 11, padding: "11px 15px", color: C.rd,
                fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
                animation: "kPp .2s",
              }}>⚠️ {err}</div>
            )}

            <button
              onClick={go}
              disabled={busy}
              className="kb"
              style={{
                padding: "13px 24px", borderRadius: 12, border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                background: `linear-gradient(135deg,${C.pu},${C.ac})`,
                color: "#fff", fontSize: 15, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 4, opacity: busy ? 0.7 : 1,
                boxShadow: `0 6px 20px ${C.ac}44`,
                animation: "kGl 2.5s infinite",
              }}
            >
              {busy ? (
                <span style={{display:"flex",alignItems:"center",gap:8}}>{I.spinner("white",16)} {tl.checking}</span>
              ) : <span style={{display:"flex",alignItems:"center",gap:8}}>{I.rocket("white",15)} {tl.loginBtn}</span>}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            onClick={() => setDark((d) => !d)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 13, color: C.txM, fontWeight: 600, padding: "6px 14px",
            }}
          ><span style={{display:"flex",alignItems:"center",gap:6}}>{dark ? I.sun(C.txM,14) : I.moon(C.txM,14)}{dark ? " " + tl.lightTheme : " " + tl.darkTheme}</span></button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFIL MODALY
// ═══════════════════════════════════════════════════════════════
function Profile({ cu, users, setUsers, setCu, C, onClose, toast, tl }) {
  const [name, setName] = useState(cu.name);
  const [unm,  setUnm]  = useState(cu.username);
  const [op,   setOp]   = useState("");
  const [np,   setNp]   = useState("");
  const [np2,  setNp2]  = useState("");
  const [err,  setErr]  = useState("");
  const [chPw, setChPw] = useState(false);

  const save = async () => {
    setErr("");
    if (!name.trim() || !unm.trim()) { setErr(tl.errFillProfile); return; }
    if (users.find((u) => u.username === unm.trim() && u.id !== cu.id)) { setErr(tl.errUserExists); return; }
    let upd = { ...cu, name: name.trim(), username: unm.trim() };
    if (chPw) {
      if (cu.password !== op) { setErr(tl.errWrongPass); return; }
      if (np.length < 4)      { setErr(tl.errShortPass); return; }
      if (np !== np2)          { setErr(tl.errPassMatch); return; }
      upd = { ...upd, password: np };
    }
    try {
      await sbFetch(`users?id=eq.${cu.id}`, "PATCH", {
        name: upd.name, username: upd.username,
        ...(upd.password !== cu.password ? { password: upd.password } : {}),
      });
      setUsers((p) => p.map((u) => u.id === cu.id ? upd : u));
      setCu(upd);
      toast(tl.saved, tl.profileUpdated, "ok");
      onClose();
    } catch(e) { setErr(tl.errWrong || e.message); }
  };

  const r = RL[cu.role];
  return (
    <Pop C={C} onClose={onClose} w={440}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, flexShrink: 0,
          background: r.c + "22", border: `2px solid ${r.c}44`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>{r.ic(r.c, 22)}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.tx }}>{tl.profile}</div>
          <RC role={cu.role} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          background: C.sf, border: `1px solid ${C.bd}`,
          borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div><Lbl t={tl.fullName} C={C} /><Inp C={C} pfx={I.user(C.txS,14)} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Lbl t={tl.username} C={C} /><Inp C={C} pfx={<span style={{fontSize:14,color:C.txS,fontWeight:700}}>@</span>} value={unm} onChange={(e) => setUnm(e.target.value)} /></div>
        </div>

        <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 14, overflow: "hidden" }}>
          <button
            onClick={() => { setChPw((s) => !s); setOp(""); setNp(""); setNp2(""); }}
            style={{
              width: "100%", padding: "13px 16px", background: "transparent",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
              borderBottom: chPw ? `1px solid ${C.bd}` : "none",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: chPw ? C.pu + "22" : C.acG,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>{I.key(chPw ? C.pu : C.acG.replace("25",""), 16)}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.tx }}>{tl.changePass}</div>
              <div style={{ fontSize: 11, color: C.txS }}>{chPw ? tl.changePassOpen : tl.changePassSub}</div>
            </div>
            <span style={{
              color: C.txM, display: "inline-block",
              transform: chPw ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s",
            }}>⌄</span>
          </button>
          {chPw && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, animation: "kUp .2s" }}>
              <PwField label={tl.currentPass} val={op} set={setOp} C={C} />
              <div style={{ height: 1, background: C.bd }} />
              <PwField label={tl.newPass} val={np} set={setNp} C={C} />
              <PwField label={tl.repeatPass} val={np2} set={setNp2} C={C} />
              {np.length > 0 && <PwStrength pw={np} match={np === np2 && np2.length > 0} C={C} />}
            </div>
          )}
        </div>

        {err && (
          <div style={{
            background: C.rdS, border: `1px solid ${C.rd}44`,
            borderRadius: 10, padding: "10px 14px", color: C.rd, fontSize: 13, fontWeight: 700,
          }}>⚠️ {err}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn ch={tl.cancel} v="gh" onClick={onClose} sx={{ color: C.txS, border: `1px solid ${C.bd}` }} />
          <Btn ch=<span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.saveProfile}</span> onClick={save} />
        </div>
      </div>
    </Pop>
  );
}

// ═══════════════════════════════════════════════════════════════
// SAZLAMALAR MODALY (iş wagty)
// ═══════════════════════════════════════════════════════════════
function SettingsModal({ settings, setSettings, C, onClose, toast, tl }) {
  const [f, setF] = useState({ ...settings });
  return (
    <Pop C={C} onClose={onClose} w={400}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, background: C.acG,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{I.settings(C.txS, 18)}</div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: C.tx }}>{tl.settingsTitle}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          background: C.sf, border: `1px solid ${C.bd}`,
          borderRadius: 13, padding: 14, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.txM, textTransform: "uppercase" }}>🕐 Iş wagty</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <Lbl t={tl.workStartLabel} C={C} />
              <input
                type="time" value={f.workStart}
                onChange={(e) => setF((x) => ({ ...x, workStart: e.target.value }))}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 11,
                  background: C.bg, border: `1.5px solid ${C.gn}44`,
                  color: C.tx, fontSize: 14, fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <Lbl t={tl.workEndLabel} C={C} />
              <input
                type="time" value={f.workEnd}
                onChange={(e) => setF((x) => ({ ...x, workEnd: e.target.value }))}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 11,
                  background: C.bg, border: `1.5px solid ${C.rd}44`,
                  color: C.tx, fontSize: 14, fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          <div>
            <Lbl t={tl.lateLimit} C={C} />
            <input
              type="number" min="0" max="60" value={f.lateLimit}
              onChange={(e) => setF((x) => ({ ...x, lateLimit: +e.target.value }))}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 11,
                background: C.bg, border: `1.5px solid ${C.yw}44`,
                color: C.tx, fontSize: 14, fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 11, color: C.txM, marginTop: 4 }}>
              {tl.lateLimitHint}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn ch={tl.cancel} v="gh" onClick={onClose} sx={{ color: C.txS, border: `1px solid ${C.bd}` }} />
          <Btn ch=<span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.saveProfile}</span> onClick={async () => {
  try {
    await sbFetch("settings?id=eq.1", "PATCH", {
      work_start: f.workStart, work_end: f.workEnd, late_limit: f.lateLimit
    });
    setSettings(f);
    toast(tl.toastSettingsSaved, `${tl.workSchedule} ${f.workStart}–${f.workEnd}`, "ok");
    onClose();
  } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
}} />
        </div>
      </div>
    </Pop>
  );
}

// ═══════════════════════════════════════════════════════════════
// GATNAWY DÜZETME MODALY (diňe admin)
// ═══════════════════════════════════════════════════════════════
function AttEditModal({ rec, workers, C, onSave, onDelete, onClose, tl }) {
  const w  = workers.find((x) => x.id === rec.wid);
  const wi = workers.findIndex((x) => x.id === rec.wid);
  
  // Bazadaky täze sütün atlaryna görä (check_in we check_out)
  const [inn, setInn] = useState(rec.check_in || ""); 
  const [out, setOut] = useState(rec.check_out || "");
  const [err, setErr] = useState("");

  const save = () => {
    // Wagtyň formatyny barlamak (00:00)
    if (!inn.match(/^\d{2}:\d{2}$/)) { setErr(tl.errEntryFormat); return; }
    if (out && !out.match(/^\d{2}:\d{2}$/)) { setErr(tl.errExitFormat); return; }
    
    // Çykyş wagty girişden öň bolmaly däl (tMin funksiýasy kodyňyzda bar diýip hasap edýärin)
    if (out && typeof tMin === 'function' && tMin(out) <= tMin(inn)) { 
      setErr(tl.errExitBefore); return; 
    }

    // Baza täze sütün atlary bilen ugradýarys
    onSave({ 
      ...rec, 
      check_in: inn, 
      check_out: out || null, 
      edited: true 
    });
    onClose();
  };

  return (
    <Pop C={C} onClose={onClose} w={400}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, background: C.ywS,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>✏️</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.tx }}>{tl.attendEdit}</div>
          <div style={{ fontSize: 12, color: C.txS }}>{tl.adminEdit}</div>
        </div>
      </div>

      <div style={{
        background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 13,
        padding: "10px 14px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Av a={w ? w.av : "?"} i={wi >= 0 ? wi : 0} z={38} />
        <div>
          <div style={{ fontWeight: 800, color: C.tx }}>{w ? w.name : "?"}</div>
          <div style={{ fontSize: 12, color: C.txS }}>{fmtDate(rec.date)}</div>
        </div>
        <Chip color={C.yw} sm>{tl.edits}</Chip>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Lbl t={tl.entryTime} C={C} />
            <input
              value={inn} onChange={(e) => setInn(e.target.value)} placeholder="08:30"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12, background: C.sf,
                border: `1.5px solid ${C.gn}44`, color: C.tx, fontSize: 16,
                fontFamily: "inherit", fontWeight: 700, textAlign: "center",
              }}
            />
          </div>
          <div>
            <Lbl t={tl.exitTime} C={C} />
            <input
              value={out} onChange={(e) => setOut(e.target.value)} placeholder="17:30"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12, background: C.sf,
                border: `1.5px solid ${C.rd}44`, color: C.tx, fontSize: 16,
                fontFamily: "inherit", fontWeight: 700, textAlign: "center",
              }}
            />
          </div>
        </div>

        <div style={{
          background: C.ywS, border: `1px solid ${C.yw}44`,
          borderRadius: 11, padding: "9px 13px",
          fontSize: 12, color: C.yw, fontWeight: 600,
        }}>{`⚠️ ${tl.attendNote}`}</div>

        {err && (
          <div style={{
            background: C.rdS, border: `1px solid ${C.rd}44`,
            borderRadius: 10, padding: "10px 14px", color: C.rd, fontSize: 13, fontWeight: 700,
          }}>⚠️ {err}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <Btn ch=<span style={{display:"flex",alignItems:"center",gap:5}}>{I.trash(C.rd,13)} {tl.delete}</span> v="dl" sz="s" onClick={() => { onDelete(rec.id); onClose(); }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn ch={tl.cancel} v="gh" onClick={onClose} sx={{ color: C.txS, border: `1px solid ${C.bd}` }} />
            <Btn ch={<span style={{display:"flex",alignItems:"center",gap:5}}>{I.check("white",13)} {tl.save}</span>} v="ok" onClick={save} />
          </div>
        </div>
      </div>
    </Pop>
  );
}

// ═══════════════════════════════════════════════════════════════
// BAŞ SAHYPA (DASHBOARD)
// ═══════════════════════════════════════════════════════════════
function Dash({ workers, tasks, attend, depts, C, mob, cu, settings, tl }) {
  const isI  = cu.role === "ishgar";
  const myT  = isI ? tasks.filter((t) => t.who === cu.wid) : tasks;
  const todA = attend.filter((a) => a.date === gToday());
  const myW  = workers.find((w) => w.id === cu.wid);

  const overdue  = tasks.filter((t) => t.dl && t.col !== "Tamamlandy" && dDiff(dlToTk(t.dl), gToday()) < 0);
  const dueToday = tasks.filter((t) => t.dl && dlToTk(t.dl) === gToday() && t.col !== "Tamamlandy");
  const lateW    = !isI ? workers.filter((w) => {
    const r = todA.find((a) => a.wid === w.id);
    return r && !r.edited && tMin(r.check_in) > tMin(settings.workStart) + settings.lateLimit;
  }) : [];

  const stats = [
    ...(!isI ? [{ l: tl.inOffice, v: workers.filter((w) => w.status === "işde").length, tot: workers.length, ic: I.workers(C.gn,22), c: C.gn }] : []),
    { l: tl.inProgress, v: myT.filter((t) => t.col === "Dowam edýär").length, tot: myT.length, ic: I.alert(C.ac,22), c: C.ac },
    { l: tl.waiting,  v: myT.filter((t) => t.col === "Etmeli").length,          tot: myT.length, ic: I.tasks(C.yw,22), c: C.yw },
    { l: tl.done,  v: myT.filter((t) => t.col === "Tamamlandy").length,       tot: myT.length, ic: I.check(C.pu,22), c: C.pu },
  ];

  const act = [
    ...todA.filter((a) => a.check_out).map((a) => { const w = workers.find((x) => x.id === a.wid); return { t: `${w ? w.name : "?"} ${tl.leftWork}`, time: a.check_out, ic: "🚪" }; }),
    ...todA.filter((a) => a.check_in).map((a) => { const w = workers.find((x) => x.id === a.wid); return { t: `${w ? w.name : "?"} ${tl.cameIn}`,   time: a.check_in, ic: I.check(C.pu,22) }; }),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "kUp .35s" }}>
      {/* Duýduryşlar */}
      {(overdue.length > 0 || dueToday.length > 0 || lateW.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {overdue.length > 0 && (
            <div style={{ background: C.rdS, border: `1px solid ${C.rd}44`, borderRadius: 13, padding: "11px 16px", color: C.rd, fontSize: 13, fontWeight: 700 }}>
              {`⚠️ ${overdue.length} ${tl.overdueAlert}`}
            </div>
          )}
          {dueToday.length > 0 && (
            <div style={{ background: C.ywS, border: `1px solid ${C.yw}44`, borderRadius: 13, padding: "11px 16px", color: C.yw, fontSize: 13, fontWeight: 700 }}>
              {`⏰ ${dueToday.length} ${tl.dueTodayAlert}`}
            </div>
          )}
          {lateW.length > 0 && (
            <div style={{ background: C.ywS, border: `1px solid ${C.yw}44`, borderRadius: 13, padding: "11px 16px", color: C.yw, fontSize: 13, fontWeight: 700 }}>
              {`🕐 ${tl.lateAlert}: ${lateW.map((w) => w.name.split(" ")[0]).join(", ")}`}
            </div>
          )}
        </div>
      )}

      {/* Garşy alyş banner */}
      <div style={{
        borderRadius: 22, padding: mob ? "16px" : "22px 30px",
        background: `linear-gradient(135deg,${C.ac}18,${C.pu}0C)`,
        border: `1px solid ${C.bd}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
      }}>
        <div>
          <div style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: C.tx }}>
            {tl.welcome}, {cu.name.split(" ")[0]}! 👋
          </div>
          <div style={{ fontSize: 13, color: C.txS, marginTop: 5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {fmtDate(gToday())} <RC role={cu.role} />
          </div>
          {!isI && (
            <div style={{ fontSize: 12, color: C.txS, marginTop: 4 }}>
              {`🕐 ${tl.workTime}: ${settings.workStart} – ${settings.workEnd}`}
            </div>
          )}
        </div>

        {isI && myW ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 13, padding: "10px 16px" }}>
            <Av a={myW.av} i={workers.findIndex((w) => w.id === myW.id)} z={42} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.tx }}>{myW.name}</div>
              <div style={{ fontSize: 12, color: C.txS }}>{myW.pos}</div>
              <Chip color={myW.status === "işde" ? C.gn : C.txM} sm>
                {myW.status === "işde" ? `● ${tl.inOffice}` : "○ Ýok"}
              </Chip>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {workers.filter((w) => w.status === "işde").slice(0, 4).map((w, i) => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 11, padding: "6px 11px" }}>
                <Av a={w.av} i={i} z={26} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.tx }}>{w.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 10, color: C.gn, fontWeight: 700 }}>{`● ${tl.inOffice}`}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistika kartalar */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${mob ? 2 : stats.length},1fr)`, fontSize: mob ? 11 : 14, gap: 12 }}>
        {stats.map((s) => (
          <div key={s.l} className="kc" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderTop: `3px solid ${s.c}`, borderRadius: 17, padding: 16, transition: "all .2s" }}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>{s.ic}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: C.txS, marginTop: 5 }}>{s.l}</div>
            <div style={{ height: 4, background: C.bd, borderRadius: 2, marginTop: 11 }}>
              <div style={{ height: "100%", borderRadius: 2, background: s.c, width: `${s.tot ? Math.round(s.v / s.tot * 100) : 0}%`, transition: "width .9s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Alt bölüm */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : (!isI ? "1fr 1fr" : "1fr"), gap: 16 }}>
        {!isI && (
          <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
            <STit icon={I.workers(C.txS,17)} t={tl.workers} C={C} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {workers.length === 0 && <div style={{ color: C.txM, fontSize: 13, textAlign: "center" }}>{tl.noWorkers}</div>}
              {workers.map((w, i) => {
                const rec  = attend.find((a) => a.wid === w.id && a.date === gToday());
                const late = rec && !rec.edited && tMin(rec.check_in) > tMin(settings.workStart) + settings.lateLimit;
                return (
                  <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", background: C.sf, borderRadius: 12, border: `1px solid ${C.bdS}` }}>
                    <Av a={w.av} i={i} z={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: C.txS }}>{w.pos}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {late && <Chip color={C.yw} sm><span style={{display:"flex",alignItems:"center",gap:4}}>{I.warning(C.yw,11)} Giç geldi</span></Chip>}
                      <Chip color={w.status === "işde" ? C.gn : C.txM} sm>{w.status === "işde" ? `● ${tl.inOffice}` : "○ Ýok"}</Chip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isI ? (
            <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
              <STit icon={I.tasks(C.txS,17)} t={tl.myTasks} C={C} mb={12} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myT.length === 0 && <div style={{ color: C.txM, fontSize: 13 }}>{tl.noTasksCol}</div>}
                {myT.slice(0, 5).map((t) => {
                  const ov = t.dl && dDiff(dlToTk(t.dl), gToday()) < 0 && t.col !== "Tamamlandy";
                  const du = t.dl && dlToTk(t.dl) === gToday() && t.col !== "Tamamlandy";
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: C.sf, borderRadius: 11, borderLeft: `3px solid ${ov ? C.rd : du ? C.yw : t.clr}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: mob ? 12 : 13, color: C.tx }}>{t.title}</div>
                        {t.dl && <div style={{ fontSize: 11, color: ov ? C.rd : du ? C.yw : C.txS, marginTop: 1 }}>{ov ? tl.overdueTask : du ? tl.dueTodayTask : "📅 " + dlToTk(t.dl)}</div>}
                      </div>
                      <Chip color={CM[t.col].c} sm>{getColLabel(t.col,tl).split(" ")[0]}</Chip>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.tx, marginBottom: 14 }}>{tl.taskStatus}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 4px" }}>
                {COLS.map((col) => {
                  const cnt  = tasks.filter((t) => t.col === col).length;
                  const total= tasks.length || 1;
                  const pct  = cnt / total;
                  const h    = Math.max(12, Math.round(pct * 60));
                  const clr  = CM[col].c;
                  const lbl  = getColLabel(col, tl);
                  return (
                    <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: clr, lineHeight: 1 }}>{cnt}</span>
                      <div style={{ width: "80%", height: h, borderRadius: "4px 4px 0 0", background: `linear-gradient(180deg,${clr},${clr}55)`, transition: "height .6s ease" }} />
                      <span style={{ fontSize: 9, color: C.txM, textAlign: "center", width: "100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lbl.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18, flex: 1 }}>
            <STit icon={I.time(C.txS,17)} t={tl.recentActivity} C={C} mb={12} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {act.length === 0 && <div style={{ color: C.txM, fontSize: 13 }}>{tl.noActivity}</div>}
              {act.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 11px", background: C.sf, borderRadius: 10 }}>
                  <span style={{display:"flex",alignItems:"center"}}>{a.ic==="out" ? I.door(C.rd,16) : a.ic==="in" ? I.check(C.gn,16) : I.bell(C.ac,16)}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.tx }}>{a.t}</span>
                  <span style={{ fontSize: 11, color: C.txM, fontVariantNumeric: "tabular-nums" }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GATNAWY BÖLÜMI
// ═══════════════════════════════════════════════════════════════
function Attend({ workers, attend, setAttend, setWorkers, C, mob, cu, settings, toast, tl }) {
  const isAdmin = cu.role === "admin";
  const isI     = cu.role === "ishgar";

  const [editRec,    setEditRec]    = useState(null);
  const [filterWid,  setFilterWid]  = useState("all");
  const [filterMonth,setFilterMonth]= useState("all");

  const todR   = attend.filter((a) => a.date === gToday());
  const getRec = (wid) => todR.find((a) => a.wid === wid);

  const doIn = async (wid) => {
    if (getRec(wid)) return;
    const now     = gNow();
    const nowMin  = tMin(now);
    const startMin= tMin(settings.workStart);
    const endMin  = tMin(settings.workEnd);
    const late    = nowMin > startMin + settings.lateLimit;
    const afterWH = nowMin > endMin;
    const beforeWH= nowMin < startMin;
    const w  = workers.find((x) => x.id === wid);
    const nm = w ? w.name : "?";
    try {
      const newA = { id: uid(), wid, date: gToday(), check_in: now, check_out: null, edited: false };
      await sbFetch("attend", "POST", newA);
      await sbFetch(`workers?id=eq.${wid}`, "PATCH", { status: "işde" });
      setAttend((p) => [...p, newA]);
      setWorkers((p) => p.map((w) => w.id === wid ? { ...w, status: "işde" } : w));
      if (afterWH)       toast(`${nm} — ${tl.afterHours}`,  `${tl.entry}: ${now} (${tl.workSchedule} ${settings.workStart}–${settings.workEnd})`, "info");
      else if (beforeWH) toast(`${nm} — ${tl.beforeHours}`, `${tl.entry}: ${now} (${tl.workSchedule} ${settings.workStart}–${settings.workEnd})`, "info");
      else if (late)     toast(`${nm} ${tl.lateArrival}`,   `${tl.entry}: ${now} (${tl.workSchedule} ${settings.workStart})`, "info");
      else               toast(`${nm} ${tl.onTime}`,        `${tl.entry}: ${now}`, "ok");
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
  };

  const doOut = async (wid) => {
    const now = gNow();
    try {
      const rec = attend.find(a => a.wid === wid && a.date === gToday() && !a.check_out);
      if (rec) await sbFetch(`attend?id=eq.${rec.id}`, "PATCH", { check_out: now });
      await sbFetch(`workers?id=eq.${wid}`, "PATCH", { status: "öýde" });
      setAttend((p) => p.map((a) => a.wid === wid && a.date === gToday() && !a.check_out ? { ...a, check_out: now } : a));
      setWorkers((p) => p.map((w) => w.id === wid ? { ...w, status: "öýde" } : w));
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
    const w = workers.find((x) => x.id === wid);
    toast(`${w ? w.name : "?"} ${tl.leftWork}`, `${tl.exit}: ${now}`, "info");
  };

  const saveEdit = async (upd) => {
    try {
      await sbFetch(`attend?id=eq.${upd.id}`, "PATCH", { check_in: upd.check_in, check_out: upd.check_out, edited: true });
      setAttend((p) => p.map((a) => a.id === upd.id ? upd : a));
      if (upd.date === gToday()) {
        await sbFetch(`workers?id=eq.${upd.wid}`, "PATCH", { status: upd.check_out ? "öýde" : "işde" });
        setWorkers((p) => p.map((w) => w.id === upd.wid ? { ...w, status: upd.check_out ? "öýde" : "işde" } : w));
      }
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
    toast(tl.toastEditDone, "", "ok");
  };

  const delRec = (id) => {
    const rec = attend.find((a) => a.id === id);
    if (rec && rec.date === gToday()) {
      setWorkers((p) => p.map((w) => w.id === rec.wid ? { ...w, status: "öýde" } : w));
    }
    setAttend((p) => p.filter((a) => a.id !== id));
  };

  // ── Işgär görnüşi ─────────────────────────────────────────
  if (isI) {
    const myWid = cu.wid;
    const myW   = workers.find((w) => w.id === myWid);
    const rec   = getRec(myWid);
    const isIn  = !!rec && !rec.check_out;
    const isDone= !!(rec && rec.check_out);
    const myHist= attend.filter((a) => a.wid === myWid).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "kUp .35s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <STit icon={I.calendar(C.txS,17)} t={tl.myAttend} C={C} mb={0} />
          <Chip color={C.ac}>{fmtDate(gToday())}</Chip>
        </div>

        <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 22, padding: mob ? "18px" : "26px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, marginBottom: 22 }}>
            <Av a={myW ? myW.av : "?"} i={workers.findIndex((w) => w.id === myWid)} z={54} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: C.tx }}>{myW ? myW.name : "Işgär"}</div>
              <div style={{ fontSize: 13, color: C.txS }}>{myW ? myW.pos : ""}</div>
              <Chip color={myW && myW.status === "işde" ? C.gn : C.txM} sm>
                {myW && myW.status === "işde" ? `● ${tl.atWork}` : "○ Ýok"}
              </Chip>
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.txS, marginBottom: 16 }}>
            {`🕐 ${tl.workTime}: ${settings.workStart} – ${settings.workEnd}`}
          </div>

          {/* Giriş/Çykyş wagtlary */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign:"center", background:C.sf, borderRadius:14, padding:"12px 20px", border:`1px solid ${C.gn}44`, minWidth:90 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.txM, textTransform:"uppercase", marginBottom:6, letterSpacing:".06em" }}>{tl.entry}</div>
              <div style={{ fontSize:28, fontWeight:900, color: rec?.check_in ? C.gn : C.txM, fontVariantNumeric:"tabular-nums" }}>{rec?.check_in || "—:—"}</div>
            </div>
            <div style={{ textAlign:"center", background:C.sf, borderRadius:14, padding:"12px 20px", border:`1px solid ${C.rd}44`, minWidth:90 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.txM, textTransform:"uppercase", marginBottom:6, letterSpacing:".06em" }}>{tl.exit}</div>
              <div style={{ fontSize:28, fontWeight:900, color: rec?.check_out ? C.rd : C.txM, fontVariantNumeric:"tabular-nums" }}>{rec?.check_out || "—:—"}</div>
            </div>
            {isDone && (
              <div style={{ textAlign:"center", background:C.sf, borderRadius:14, padding:"12px 20px", border:`1px solid ${C.pu}44`, minWidth:90 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.txM, textTransform:"uppercase", marginBottom:6, letterSpacing:".06em" }}>⏱ Işlän</div>
                <div style={{ fontSize:24, fontWeight:900, color:C.pu }}>{calcH(rec.check_in, rec.check_out)}</div>
              </div>
            )}
          </div>

          {!rec && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <button onClick={() => doIn(myWid)} className="kb" style={{ padding: "17px 46px", borderRadius: 18, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gn},#0DBF7A)`, color: "#fff", fontSize: 17, fontWeight: 900, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 24px ${C.gn}44`, transition: "all .2s" }}>
                Işe geldim ✅
              </button>
              <div style={{ fontSize: 12, color: C.txM }}>{tl.checkInHint}</div>
            </div>
          )}
          {isIn && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ background: C.gnS, border: `1px solid ${C.gn}44`, borderRadius: 13, padding: "11px 22px", marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: C.gn, fontWeight: 700 }}>{`✅ ${rec.check_in} — ${tl.atWork}`}</div>
              </div>
              <button onClick={() => doOut(myWid)} className="kb" style={{ padding: "17px 46px", borderRadius: 18, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.rd},#e04050)`, color: "#fff", fontSize: 17, fontWeight: 900, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 24px ${C.rd}44`, transition: "all .2s" }}>
                {tl.checkOut}
              </button>
              <div style={{ fontSize: 12, color: C.txM }}>{tl.checkOutHint}</div>
            </div>
          )}
          {isDone && (
            <div style={{ background: C.acG, border: `1px solid ${C.ac}44`, borderRadius: 13, padding: "14px 22px", display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span>{I.celebrate(C.ac, 22)}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.tx }}>{tl.todayDone}</div>
                <div style={{ fontSize: 12, color: C.txS, marginTop: 2 }}>{rec.check_in} — {rec.check_out} · {calcH(rec.check_in, rec.check_out)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Soňky 7 günüň taryhy */}
        <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
          <STit icon={I.tasks(C.txS,17)} t={tl.last7} C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myHist.length === 0 && <div style={{ color: C.txM, fontSize: 13, textAlign: "center" }}>{tl.noRecord}</div>}
            {myHist.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", background: C.sf, borderRadius: 11, borderLeft: `3px solid ${a.check_out ? C.ac : C.gn}` }}>
                <div style={{ fontSize: 12, color: C.txS, minWidth: 86, fontWeight: 600 }}>
                  {a.date === gToday() ? "🔵 Şu gün" : fmtDate(a.date)}
                </div>
                <Chip color={C.gn} sm>{a.check_in}</Chip>
                <span style={{ color: C.txM, fontSize: 12 }}>→</span>
                {a.check_out ? <Chip color={C.rd} sm>{a.check_out}</Chip> : <span style={{ fontSize: 12, color: C.gn, fontWeight: 700 }}>{tl.atWork}</span>}
                {a.check_out && <Chip color={C.pu} sm>{calcH(a.check_in, a.check_out)}</Chip>}
                {a.edited && <Chip color={C.yw} sm>{I.edit(C.yw,11)}</Chip>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Admin / Başlyk görnüşi ────────────────────────────────
  const hist = attend
    .filter((a) => in3M(a.date))
    .filter((a) => filterWid === "all" || a.wid === filterWid)
    .filter((a) => {
      if (filterMonth === "all") return true;
      // a.date = YYYY-MM-DD formatynda
      return a.date && a.date.slice(0, 7) === filterMonth;
    })
    .sort((a, b) => { const dd = b.date.localeCompare(a.date); return dd !== 0 ? dd : (b.check_in||"").localeCompare(a.check_in||""); });

  const months = [...new Set(
    attend.filter((a) => in3M(a.date) && a.date).map((a) => a.date.slice(0, 7))
  )].sort().reverse();

  const exportCSV = () => {
    const rows = hist.slice(0, 500).map((a) => {
      const w = workers.find((x) => x.id === a.wid);
      return `${w ? w.name : "?"}|${a.date}|${a.check_in}|${a.check_out || tl.inOffice}|${calcH(a.check_in, a.check_out) || "—"}|${a.edited ? tl.edited : ""}`;
    }).join("\n");
    const csv  = `${tl.workerCol}|${tl.dateCol}|${tl.entryCol}|${tl.exitCol}|${tl.workedCol}|${tl.noteCol}\n` + rows;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = `gatnawy_${gToday()}.csv`; el.click();
    URL.revokeObjectURL(url);
    toast(tl.toastCsvDone, "Faýl saklandi", "ok");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "kUp .35s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <STit icon={I.calendar(C.txS,17)} t={tl.attendTitle} C={C} mb={0} />
        <Chip color={C.ac}>{fmtDate(gToday())}</Chip>
      </div>

      {/* Şu günki kartalar */}
      <div style={{ display: "grid", gap: 11 }}>
        {workers.length === 0 && (
          <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 22, textAlign: "center", color: C.txM }}>
            {tl.noWorkersAdmin}
          </div>
        )}
        {workers.map((w, i) => {
          const rec  = getRec(w.id);
          const isIn = !!rec && !rec.check_out;
          const done = !!(rec && rec.check_out);
          const late = rec && !rec.edited && tMin(rec.check_in) > tMin(settings.workStart) + settings.lateLimit;
          return (
            <div key={w.id} className="kc" style={{
              background: C.cd, border: `1px solid ${C.bd}`,
              borderLeft: `5px solid ${isIn ? C.gn : done ? C.ac : C.bd}`,
              borderRadius: 17, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 10,
              transition: "all .2s"
            }}>
              {/* Ýokarky setir — işgär maglumaty */}
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Av a={w.av} i={i} z={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.tx, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: C.txS }}>{w.pos}</div>
                </div>
                {late && <Chip color={C.yw} sm><span style={{display:"flex",alignItems:"center",gap:3}}>{I.warning(C.yw,10)} Giç</span></Chip>}
              </div>
              {/* Aşaky setir — wagt + düwmeler */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Giriş */}
                <div style={{ display:"flex", alignItems:"center", gap:5, background:C.sf, borderRadius:9, padding:"5px 10px", border:`1px solid ${C.gn}33` }}>
                  <span style={{ fontSize:10, color:C.txM, fontWeight:700 }}>{tl.entry}</span>
                  <span style={{ fontSize:15, fontWeight:900, color: rec?.check_in ? C.gn : C.txM, fontVariantNumeric:"tabular-nums" }}>{rec?.check_in || "—:—"}</span>
                </div>
                {/* Çykyş */}
                <div style={{ display:"flex", alignItems:"center", gap:5, background:C.sf, borderRadius:9, padding:"5px 10px", border:`1px solid ${C.rd}33` }}>
                  <span style={{ fontSize:10, color:C.txM, fontWeight:700 }}>{tl.exit}</span>
                  <span style={{ fontSize:15, fontWeight:900, color: rec?.check_out ? C.rd : C.txM, fontVariantNumeric:"tabular-nums" }}>{rec?.check_out || "—:—"}</span>
                </div>
                {/* Işlän wagt */}
                {done && <Chip color={C.pu} sm>{calcH(rec.check_in, rec.check_out)}</Chip>}
                {/* Düwmeler — sagda */}
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  {!rec   && <Btn ch={<span style={{display:"flex",alignItems:"center",gap:4}}>{I.check(C.gn,13)} Geldi</span>} v="ok" sz="s" onClick={() => doIn(w.id)} />}
                  {isIn   && <Btn ch={<span style={{display:"flex",alignItems:"center",gap:4}}>{I.door(C.rd,13)} Gitdi</span>} v="dl" sz="s" onClick={() => doOut(w.id)} />}
                  {done && !isAdmin && <Chip color={C.ac} sm>✓ Tamam</Chip>}
                  {isAdmin && rec  && <Btn ch={I.edit(C.txS,13)} v="wn" sz="s" onClick={() => setEditRec(rec)} />}
                  {isAdmin && !rec && <Btn ch={I.plus(C.ac,14)} v="ot" sz="s" onClick={() => setEditRec({ id: uid(), wid: w.id, date: gToday(), check_in: "", check_out: null, edited: false, _new: true })} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Aýlyk arhiw — diňe admin */}
      {isAdmin && (
        <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <STit icon={I.archive(C.txS,17)} t={tl.archive} C={C} mb={0} />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <select value={filterWid} onChange={(e) => setFilterWid(e.target.value)} style={{ padding: "6px 11px", borderRadius: 9, background: C.sf, border: `1px solid ${C.bd}`, color: C.tx, fontSize: 12, cursor: "pointer" }}>
                <option value="all">{tl.allWorkers}</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: "6px 11px", borderRadius: 9, background: C.sf, border: `1px solid ${C.bd}`, color: C.tx, fontSize: 12, cursor: "pointer" }}>
                <option value="all">{tl.allMonths}</option>
                {months.map((m) => {
                  const [y, mo] = m.split("-");
                  const mn = ["Ýanwar","Fewral","Mart","Aprel","Maý","Iýun","Iýul","Awgust","Sentýabr","Oktýabr","Noýabr","Dekabr"][+mo - 1];
                  return <option key={m} value={m}>{mn} {y}</option>;
                })}
              </select>
              <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.download(C.ac,14)} {tl.csvDownload}</span>} v="ot" sz="s" onClick={exportCSV} />
            </div>
          </div>

          {/* Jemi san */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 14 }}>
            {[
              { l: tl.totalDays,  v: hist.filter((a) => a.check_out).length, c: C.ac },
              { l: tl.totalHours,v: (hist.filter((a) => a.check_out).reduce((s, a) => s + (tMin(a.check_out) - tMin(a.check_in)), 0) / 60).toFixed(1) + " sa", c: C.gn },
              { l: tl.edits,  v: hist.filter((a) => a.edited).length, c: C.yw },
            ].map((s) => (
              <div key={s.l} style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 11, padding: "9px 13px", textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: C.txS, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
              <thead>
                <tr>{[tl.workerCol,tl.dateCol,tl.entryCol,tl.exitCol,tl.workedCol,tl.noteCol,tl.actionCol].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: C.txS, fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${C.bd}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {hist.slice(0, 200).map((a) => {
                  const w    = workers.find((x) => x.id === a.wid);
                  const wi   = workers.findIndex((x) => x.id === a.wid);
                  const h    = calcH(a.check_in, a.check_out);
                  const tod  = a.date === gToday();
                  const late = !a.edited && tMin(a.check_in) > tMin(settings.workStart) + settings.lateLimit;
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${C.bdS}`, background: tod ? C.acG : "transparent" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Av a={w ? w.av : "?"} i={wi >= 0 ? wi : 0} z={26} />
                          <span style={{ fontWeight: 700, color: C.tx }}>{w ? w.name : "?"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: C.txS, whiteSpace: "nowrap" }}>{fmtDate(a.date)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Chip color={late ? C.yw : C.gn} sm>{a.check_in}</Chip>
                          {late && <Chip color={C.yw} sm>Giç</Chip>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{a.check_out ? <Chip color={C.rd} sm>{a.check_out}</Chip> : <span style={{ color: C.txM }}>{tl.atWork}</span>}</td>
                      <td style={{ padding: "10px 12px" }}>{h ? <Chip color={C.pu} sm>{h}</Chip> : <span style={{ color:C.txM, fontSize:12 }}>—</span>}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {a.edited && <Chip color={C.yw} sm>✏️ {tl.edited}</Chip>}
                        {tod && !a.edited && <Chip color={C.gn} sm>✓ {tl.today}</Chip>}
                        {!a.edited && !tod && <span style={{color:C.txM, fontSize:11}}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => setEditRec(a)} style={{ padding: "2px 9px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${C.yw}44`, background: C.ywS, color: C.yw }}>{I.edit(C.txS,13)}</button>
                      </td>
                    </tr>
                  );
                })}
                {hist.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "22px", textAlign: "center", color: C.txM }}>{tl.noData}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editRec && (
        <AttEditModal
          rec={editRec}
          workers={workers}
          C={C} tl={tl}
          onSave={async (r) => {
            if (r._new) {
              const { _new, ...clean } = r;
              try {
                await sbFetch("attend", "POST", clean);
                await sbFetch(`workers?id=eq.${clean.wid}`, "PATCH", { status: clean.check_out ? "öýde" : "işde" });
                setAttend((p) => [...p, clean]);
                setWorkers((p) => p.map((w) => w.id === clean.wid && clean.date === gToday() ? { ...w, status: clean.check_out ? "öýde" : "işde" } : w));
              } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
            } else {
              saveEdit(r);
            }
          }}
          onDelete={delRec}
          onClose={() => setEditRec(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// KANBAN TABŞYRYKLAR
// ═══════════════════════════════════════════════════════════════
function TaskForm({ task, workers, onSave, onClose, C, cu, tl }) {
  const isI = cu.role === "ishgar";
  const [f, setF] = useState(task || {
    title: "", desc: "", who: isI ? cu.wid : (workers[0] ? workers[0].id : ""),
    pri: "orta", col: "Etmeli", clr: TKC[0], dl: "", comments: [], files: [],
  });
  const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef(null);

  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadErr("");
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { setUploadErr(tl.fileTooBig); return; }
    }
    setUploading(true);
    try {
      const taskId = f.id || uid();
      if (!f.id) s("id", taskId);
      const uploaded = await Promise.all(picked.map(file => uploadFile(file, taskId)));
      s("files", [...(f.files || []), ...uploaded]);
    } catch(e) { setUploadErr(e.message); }
    setUploading(false);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    s("files", (f.files || []).filter((_,i) => i !== idx));
  };

  return (
    <Pop C={C} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: C.acG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
          {task ? "✏️" : "➕"}
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: C.tx }}>{task ? tl.editTask : tl.createTask}</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div><Lbl t="Tabşyryk ady" C={C} /><Inp C={C} value={f.title} onChange={(e) => s("title", e.target.value)} placeholder={tl.taskNamePh} /></div>
        <div><Lbl t="Düşündiriş" C={C} /><Txta C={C} value={f.desc} onChange={(e) => s("desc", e.target.value)} placeholder={tl.descPh} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
          <div>
            <Lbl t={tl.worker} C={C} />
            {isI ? (
              <div style={{ padding: "9px 13px", background: C.sf, border: `1.5px solid ${C.bd}`, borderRadius: 11, fontSize: 13, color: C.tx }}>
                {workers.find((w) => w.id === cu.wid) ? workers.find((w) => w.id === cu.wid).name : "Siz"}
              </div>
            ) : (
              <Sel C={C} value={f.who} onChange={(e) => s("who", e.target.value)} kids={workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)} />
            )}
          </div>
          <div>
            <Lbl t="Dereje" C={C} />
            <Sel C={C} value={f.pri} onChange={(e) => s("pri", e.target.value)} kids={[
              <option key="y" value="ýokary">🔴 {tl.high}</option>,
              <option key="o" value="orta">🟡 {tl.medium}</option>,
              <option key="p" value="pes">🟢 {tl.low}</option>,
            ]} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
          <div>
            <Lbl t="Sütün" C={C} />
            <Sel C={C} value={f.col} onChange={(e) => s("col", e.target.value)} kids={COLS.map((c) => <option key={c} value={c}>{getColLabel(c,tl)}</option>)} />
          </div>
          <div>
            <Lbl t={tl.deadline} C={C} />
            <input
              type="date" value={f.dl || ""}
              onChange={(e) => s("dl", e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 11, background: C.sf, border: `1.5px solid ${C.bd}`, color: C.tx, fontSize: 13, fontFamily: "inherit" }}
            />
            {f.dl && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const dl = new Date(f.dl); dl.setHours(0,0,0,0);
              return dl < today ? (
                <div style={{ fontSize: 11, color: C.yw, marginTop: 4, fontWeight: 700 }}>⚠️ Saýlanan sene geçdi!</div>
              ) : null;
            })()}
          </div>
        </div>

        <div>
          <Lbl t="Reňk" C={C} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
            {TKC.map((c) => (
              <div key={c} onClick={() => s("clr", c)} style={{ width: 25, height: 25, borderRadius: 7, background: c, cursor: "pointer", transition: "all .15s", border: f.clr === c ? "3px solid white" : "2px solid transparent", transform: f.clr === c ? "scale(1.25)" : "scale(1)", boxShadow: f.clr === c ? `0 0 10px ${c}88` : "none" }} />
            ))}
          </div>
        </div>

        {/* Faýl goşmak */}
        <div>
          <Lbl t={tl.fileAttach} C={C} />
          <input ref={fileRef} type="file" multiple accept=".doc,.docx,.xls,.xlsx,.pdf,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar" onChange={handleFiles} style={{ display: "none" }} />
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}
            style={{ width:"100%", padding:"10px 14px", borderRadius:11, background:C.sf, border:`1.5px dashed ${C.bd}`, color:C.txS, cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {uploading ? <>⏳ {tl.fileUpload}</> : <>📎 {tl.fileAttach}</>}
          </button>
          {uploadErr && <div style={{ fontSize:11, color:C.rd, marginTop:4 }}>⚠️ {uploadErr}</div>}
          {(f.files||[]).length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:8 }}>
              {(f.files||[]).map((fl,idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 11px", background:C.sf, border:`1px solid ${C.bd}`, borderRadius:9 }}>
                  <span style={{ fontSize:18 }}>{fileIcon(fl.ext)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.tx, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fl.name}</div>
                    <div style={{ fontSize:10, color:C.txM }}>{fmtSize(fl.size)}</div>
                  </div>
                  <a href={getFileUrl(fl.path)} target="_blank" rel="noreferrer" style={{ color:C.ac, fontSize:11, fontWeight:700, textDecoration:"none" }}>⬇</a>
                  <button type="button" onClick={() => removeFile(idx)} style={{ background:"none", border:"none", cursor:"pointer", color:C.rd, fontSize:14, fontWeight:700 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn ch={tl.cancel} v="gh" onClick={onClose} sx={{ color: C.txS, border: `1px solid ${C.bd}` }} />
          <Btn ch={task ? <span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.save}</span> : <span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",13)} {tl.create}</span>} onClick={() => {
            if (f.title.trim()) {
              onSave({ ...f, id: f.id || (task ? task.id : uid()), comments: f.comments || [], files: f.files || [] });
              onClose();
            }
          }} />
        </div>
      </div>
    </Pop>
  );
}

function TaskDetail({ task, workers, cu, C, onSave, onClose, tl }) {
  const [cmt, setCmt] = useState("");
  const w    = workers.find((x) => x.id === task.who);
  const wi   = workers.findIndex((x) => x.id === task.who);
  const pm   = PM[task.pri] || PM.orta;
  const cmts = task.comments || [];
  const isOv = task.dl && dDiff(dlToTk(task.dl), gToday()) < 0 && task.col !== "Tamamlandy";
  const isDu = task.dl && dlToTk(task.dl) === gToday() && task.col !== "Tamamlandy";

  const addCmt = () => {
    if (!cmt.trim()) return;
    const nc = { id: uid(), author: cu.name, role: cu.role, text: cmt.trim(), time: gNow(), date: gToday() };
    onSave({ ...task, comments: [...cmts, nc] });
    setCmt("");
  };

  return (
    <Pop C={C} onClose={onClose} w={500}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.tx, lineHeight: 1.3 }}>{task.title}</div>
          <div style={{ display: "flex", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
            <Chip color={pm.c} sm>{pm.l}</Chip>
            <Chip color={CM[task.col].c} sm>{task.col}</Chip>
            {task.dl && (
              <Chip color={isOv ? C.rd : isDu ? C.yw : C.txS} sm>
                📅 {dlToTk(task.dl)}{isOv ? " ⚠️" : isDu ? " ⏰" : ""}
              </Chip>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${C.bd}`, background: C.sf, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.txS, flexShrink: 0 }}><span style={{fontWeight:700}}>✕</span></button>
      </div>

      {task.desc && (
        <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "11px 15px", fontSize: 13, color: C.tx, lineHeight: 1.6, marginBottom: 14 }}>{task.desc}</div>
      )}

      {/* Faýllar */}
      {(task.files||[]).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.txS, marginBottom:7 }}>📎 {tl.fileAttached} ({task.files.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {task.files.map((fl,idx) => (
              <a key={idx} href={getFileUrl(fl.path)} target="_blank" rel="noreferrer"
                style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 12px", background:C.sf, border:`1px solid ${C.bd}`, borderRadius:10, textDecoration:"none" }}>
                <span style={{ fontSize:20 }}>{fileIcon(fl.ext)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.tx, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fl.name}</div>
                  <div style={{ fontSize:10, color:C.txM }}>{fmtSize(fl.size)}</div>
                </div>
                <span style={{ fontSize:12, color:C.ac, fontWeight:700 }}>⬇ {tl.fileDownload}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {w && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "9px 13px", background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 12 }}>
          <Av a={w.av} i={wi >= 0 ? wi : 0} z={34} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.tx }}>{w.name}</div>
            <div style={{ fontSize: 12, color: C.txS }}>{w.pos}</div>
          </div>
        </div>
      )}

      {/* Bellikler */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.txS, marginBottom: 9 }}>💬 Bellikler ({cmts.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 180, overflowY: "auto" }}>
          {cmts.length === 0 && <div style={{ color: C.txM, fontSize: 13, textAlign: "center", padding: "10px 0" }}>{tl.noComments}</div>}
          {cmts.map((c) => {
            const r = RL[c.role];
            return (
              <div key={c.id} style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 11, padding: "9px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{r ? r.ic(r.c, 20) : "?"}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: C.tx }}>{c.author}</span>
                  <span style={{ fontSize: 10, color: C.txM, marginLeft: "auto" }}>{fmtDate(c.date)} {c.time}</span>
                </div>
                <div style={{ fontSize: 13, color: C.tx, lineHeight: 1.5 }}>{c.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7 }}>
        <Txta C={C} value={cmt} onChange={(e) => setCmt(e.target.value)} placeholder={tl.commentPh} style={{ minHeight: 48, flex: 1 }} />
        <Btn ch="➤" onClick={addCmt} disabled={!cmt.trim()} sx={{ alignSelf: "flex-end", padding: "10px 13px" }} />
      </div>
    </Pop>
  );
}

function KanbanCard({ task, workers, onEdit, onDelete, onMove, onDetail, C, cu, tl }) {
  const isI    = cu.role === "ishgar";
  const own    = task.who === cu.wid;
  const canEdit= !isI || own;
  const w      = workers.find((x) => x.id === task.who);
  const wi     = workers.findIndex((x) => x.id === task.who);
  const pm     = PM[task.pri] || PM.orta;
  const isOv   = task.dl && dDiff(dlToTk(task.dl), gToday()) < 0 && task.col !== "Tamamlandy";
  const isDu   = task.dl && dlToTk(task.dl) === gToday() && task.col !== "Tamamlandy";
  const cmts   = (task.comments || []).length;

  return (
    <div className="kc" style={{ background: C.sf, border: `1px solid ${isOv ? C.rd + "66" : C.bd}`, borderRadius: 14, padding: 13, borderTop: `3px solid ${isOv ? C.rd : isDu ? C.yw : task.clr}`, transition: "all .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7, marginBottom: 7 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.tx, lineHeight: 1.4, cursor: "pointer" }} onClick={() => onDetail(task)}>{task.title}</div>
        {canEdit && (
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            <button onClick={() => onEdit(task)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.bd}`, background: C.cd, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.txS }}>{I.edit(C.txS,13)}</button>
            {!isI && <button onClick={() => onDelete(task.id)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.rd}44`, background: C.rdS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.rd }}>🗑</button>}
          </div>
        )}
      </div>
      {task.desc && <div style={{ fontSize: 11, color: C.txS, marginBottom: 7, lineHeight: 1.5 }}>{task.desc.slice(0, 60)}{task.desc.length > 60 ? "..." : ""}</div>}
      {task.dl && (
        <div style={{ fontSize: 11, color: isOv ? C.rd : isDu ? C.yw : C.txS, marginBottom: 7, fontWeight: isOv || isDu ? 700 : 400 }}>
          {isOv ? tl.overdueTask : isDu ? tl.dueTodayTask : "📅 " + dlToTk(task.dl)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Av a={w ? w.av : "?"} i={wi >= 0 ? wi : 0} z={20} />
          <span style={{ fontSize: 11, color: C.txS }}>{w ? w.name.split(" ")[0] : "?"}</span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap:"wrap" }}>
          {cmts > 0 && <Chip color={C.txS} sm>💬{cmts}</Chip>}
          {(task.files||[]).length > 0 && <Chip color={C.ac} sm>📎{task.files.length}</Chip>}
          <Chip color={pm.c} sm>{pm.l}</Chip>
        </div>
      </div>
      {canEdit && (
        <div style={{ display: "flex", gap: 3, marginTop: 9, flexWrap: "wrap" }}>
          {COLS.filter((c) => c !== task.col).map((c) => (
            <button key={c} onClick={() => onMove(task.id, c)} style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", border: `1px solid ${CM[c].c}44`, background: CM[c].c + "11", color: CM[c].c }}>
              → {c.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Kanban({ tasks, setTasks, workers, C, mob, cu, toast, tl }) {
  const isI = cu.role === "ishgar";
  const [modal,  setModal]  = useState(false);
  const [editT,  setEditT]  = useState(null);
  const [detailT,setDetailT]= useState(null);
  const [dragOver,setDragOver]= useState(null);
  const [dragId, setDragId] = useState(null);

  const vis = isI ? tasks.filter((t) => t.who === cu.wid) : tasks;

  const saveTask = async (t) => {
    try {
      // JS 'desc' -> DB 'description' mapping
      const dbT = { id: t.id, title: t.title, description: t.desc || t.description || "", who: t.who, pri: t.pri, col: t.col, clr: t.clr, dl: t.dl || null, comments: t.comments || [], files: t.files || [] };
      const exists = tasks.find((x) => x.id === t.id);
      if (exists) {
        await sbFetch(`tasks?id=eq.${t.id}`, "PATCH", dbT);
      } else {
        await sbFetch("tasks", "POST", dbT);
        toast(tl.taskCreated, t.title, "ok");
      }
      setTasks((p) => { const e = p.find((x) => x.id === t.id); return e ? p.map((x) => x.id === t.id ? t : x) : [...p, t]; });
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
  };

  const deleteTask = async (id) => {
    try {
      await sbFetch(`tasks?id=eq.${id}`, "DELETE");
      setTasks((p) => p.filter((t) => t.id !== id));
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
  };

  const moveTask = async (id, col) => {
    try {
      await sbFetch(`tasks?id=eq.${id}`, "PATCH", { col });
      setTasks((p) => p.map((t) => t.id === id ? { ...t, col } : t));
      const t = tasks.find((x) => x.id === id);
      if (col === "Tamamlandy") toast(tl.completedToast, t ? t.title : "", "ok");
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
  };

  const overdue = vis.filter((t) => t.dl && dDiff(dlToTk(t.dl), gToday()) < 0 && t.col !== "Tamamlandy").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "kUp .35s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <STit icon={I.tasks(C.txS,17)} t={tl.kanban} C={C} mb={0} />
        <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",14)} {tl.newTask}</span>} onClick={() => { setEditT(null); setModal(true); }} />
      </div>

      {overdue > 0 && (
        <div style={{ background: C.rdS, border: `1px solid ${C.rd}44`, borderRadius: 11, padding: "9px 14px", fontSize: 13, color: C.rd, fontWeight: 700 }}>
          {`⚠️ ${overdue} ${tl.overdueAlert}`}
        </div>
      )}
      {isI && (
        <div style={{ background: C.acG, border: `1px solid ${C.ac}33`, borderRadius: 11, padding: "9px 14px", fontSize: 13, color: C.ac, fontWeight: 600 }}>
          {`ℹ️ ${tl.onlyMyTasks}`}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(4,1fr)", gap: 13, alignItems: "start" }}>
        {COLS.map((col) => {
          const ct   = vis.filter((t) => t.col === col);
          const meta = CM[col];
          const over = dragOver === col;
          return (
            <div
              key={col}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { const id = e.dataTransfer.getData("tid"); if (id) moveTask(id, col); setDragOver(null); }}
              style={{ background: over ? C.acG : C.cd, border: `1.5px solid ${over ? C.ac : C.bd}`, borderRadius: 17, padding: 13, transition: "all .2s", minHeight: 170 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.c, boxShadow: `0 0 6px ${meta.c}` }} />
                  <span style={{ fontWeight: 800, fontSize: 12, color: C.tx }}>{getColLabel(col,tl)}</span>
                </div>
                <Chip color={meta.c} sm>{ct.length}</Chip>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {ct.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("tid", t.id); setDragId(t.id); }}
                    onDragEnd={() => setDragId(null)}
                    style={{ opacity: dragId === t.id ? 0.4 : 1, transition: "opacity .15s" }}
                  >
                    <KanbanCard task={t} workers={workers} C={C} cu={cu} tl={tl} onEdit={(x) => { setEditT(x); setModal(true); }} onDelete={deleteTask} onMove={moveTask} onDetail={(t) => setDetailT(t)} />
                  </div>
                ))}
                {ct.length === 0 && <div style={{ textAlign: "center", padding: "18px 0", color: C.txM, fontSize: 12, borderRadius: 11, border: `2px dashed ${C.bd}` }}>{tl.noTasksCol}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {modal && <TaskForm task={editT} workers={workers} C={C} cu={cu} tl={tl} onSave={saveTask} onClose={() => { setModal(false); setEditT(null); }} />}
      {detailT && (
        <TaskDetail
          task={tasks.find((t) => t.id === detailT.id) || detailT}
          workers={workers} cu={cu} C={C} tl={tl}
          onSave={async (t) => {
        try {
          await sbFetch(`tasks?id=eq.${t.id}`, "PATCH", { comments: t.comments||[] });
          setTasks((p) => p.map((x) => x.id === t.id ? t : x)); setDetailT(t);
        } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
      }}
          onClose={() => setDetailT(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PANELI
// ═══════════════════════════════════════════════════════════════
function Admin({ workers, setWorkers, users, setUsers, depts, setDepts, C, mob, cu, settings, setSettings, toast, tl }) {
  if (cu.role !== "admin") return <Deny C={C} tl={tl} />;

  const [sub,  setSub]  = useState("workers");
  const [wMod, setWMod] = useState(false);
  const [uMod, setUMod] = useState(false);
  const [sMod, setSMod] = useState(false);
  const [dMod, setDMod] = useState(false);
  const [eW,   setEW]   = useState(null);
  const [eU,   setEU]   = useState(null);
  const [eD,   setED]   = useState(null);
  const [wF,   setWF]   = useState({ name: "", pos: "", av: "", dept_id: "" });
  const [uF,   setUF]   = useState({ username: "", password: "", role: "ishgar", name: "", wid: "" });
  const [dF,   setDF]   = useState({ name: "" });

  const openW = (w = null) => { setEW(w); setWF(w ? { name: w.name, pos: w.pos, av: w.av, dept_id: w.dept_id || "" } : { name: "", pos: "", av: "", dept_id: "" }); setWMod(true); };
  const saveW = async () => {
    if (!wF.name.trim()) return;
    const ini = wF.av || wF.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    const deptId = wF.dept_id || null;
    try {
      if (eW) {
        await sbFetch(`workers?id=eq.${eW.id}`, "PATCH", { name: wF.name, pos: wF.pos, av: ini, dept_id: deptId });
        setWorkers((p) => p.map((w) => w.id === eW.id ? { ...w, name: wF.name, pos: wF.pos, av: ini, dept_id: deptId } : w));
        toast(tl.toastWorkerUpdated, wF.name, "ok");
      } else {
        const nw = { id: "w" + Date.now(), name: wF.name, pos: wF.pos, av: ini, status: "öýde", dept_id: deptId };
        await sbFetch("workers", "POST", nw);
        setWorkers((p) => [...p, nw]);
        toast(tl.toastWorkerAdded, wF.name, "ok");
      }
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
    setWMod(false);
  };

  const openU = (u = null) => {
    setEU(u);
    setUF(u ? { username: u.username, password: u.password, role: u.role, name: u.name, wid: u.wid || "" }
             : { username: "", password: "", role: "ishgar", name: "", wid: "" });
    setUMod(true);
  };
  const saveU = async () => {
    if (!uF.username.trim() || !uF.password.trim()) return;
    try {
      if (eU) {
        await sbFetch(`users?id=eq.${eU.id}`, "PATCH", { ...uF, wid: uF.wid || null });
        setUsers((p) => p.map((u) => u.id === eU.id ? { ...u, ...uF, wid: uF.wid || null } : u));
        toast(tl.toastUserUpdated, uF.name, "ok");
      } else {
        const newU = { id: "u" + Date.now(), ...uF, wid: uF.wid || null };
        await sbFetch("users", "POST", newU);
        setUsers((p) => [...p, newU]);
        toast(tl.toastUserAdded, uF.name, "ok");
      }
    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
    setUMod(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "kUp .35s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <STit icon={I.settings(C.txS,17)} t={tl.adminPanel} C={C} mb={0} />
        <div style={{ display: "flex", gap: 7 }}>
          <Chip color={RL.admin.c}>{`👑 ${tl.fullAccess}`}</Chip>
          <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.settings(C.ac,13)} Sazlamalar</span>} v="ot" sz="s" onClick={() => setSMod(true)} />
        </div>
      </div>

      {/* Iş wagty görkeziji */}
      <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 13, padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.txS }}>{`🕐 ${tl.workTimeLabel}:`}</span>
        <strong style={{ color: C.tx, fontSize: 13 }}>{settings.workStart} – {settings.workEnd}</strong>
        <span style={{ fontSize: 13, color: C.txS, marginLeft: 8 }}>{tl.lateChipAdmin}</span>
        <strong style={{ color: C.tx, fontSize: 13 }}>{settings.lateLimit} min</strong>
      </div>

      {/* Sub-tab */}
      <div style={{ display: "flex", gap: 5, background: C.sf, padding: 4, borderRadius: 13, border: `1px solid ${C.bd}`, width: "fit-content" }}>
        {[{ id: "workers", l: `👷 ${tl.workersTab}` }, { id: "users", l: `🔐 ${tl.usersTab}` }, { id: "depts", l: `🏢 ${tl.depts}` }].map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: "6px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: sub === t.id ? C.ac : "transparent", color: sub === t.id ? "#fff" : C.txS, transition: "all .2s" }}>{t.l}</button>
        ))}
      </div>

      {/* Işgärler */}
      {sub === "workers" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",14)} {tl.addWorker}</span>} onClick={() => openW()} />
          </div>
          {workers.length === 0 && (
            <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 22, textAlign: "center", color: C.txM }}>
              {tl.noWorkersAdmin}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 13 }}>
            {workers.map((w, i) => (
              <div key={w.id} className="kc" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `5px solid ${AVC[i % AVC.length]}`, borderRadius: 17, padding: "14px 18px", display: "flex", alignItems: "center", gap: 13, transition: "all .2s" }}>
                <Av a={w.av} i={i} z={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.tx }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: C.txS, marginTop: 1 }}>{w.pos}{(() => { const d = depts.find(x => x.id === w.dept_id); return d ? <span style={{ marginLeft:6, fontSize:10, background:C.acG, color:C.ac, borderRadius:5, padding:"1px 6px", fontWeight:700 }}>🏢 {d.name}</span> : null; })()}</div>
                  <div style={{ marginTop: 6 }}>
                    <Chip color={w.status === "işde" ? C.gn : C.txM} sm>{w.status === "işde" ? `● ${tl.inOffice}` : "○ Ýok"}</Chip>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <Btn ch={I.edit(C.txS,13)} v="ot" sz="s" onClick={() => openW(w)} />
                  <Btn ch={I.trash(C.rd,13)} v="dl" sz="s" onClick={async () => { try { await sbFetch(`workers?id=eq.${w.id}`,"DELETE"); setWorkers((p) => p.filter((x) => x.id !== w.id)); toast(tl.toastWorkerDeleted, w.name, "info"); } catch(e) { toast("Ýalňyşlyk",e.message,"err"); } }} />
                </div>
              </div>
            ))}
          </div>

          {wMod && (
            <Pop C={C} onClose={() => setWMod(false)}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: C.tx, marginBottom: 18 }}>{eW ? `✏️ ${tl.editWorker}` : `➕ ${tl.newWorker}`}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div><Lbl t={tl.fullName} C={C} /><Inp C={C} value={wF.name} onChange={(e) => setWF((f) => ({ ...f, name: e.target.value }))} placeholder="Oraz Ataýew" /></div>
                <div><Lbl t={tl.position} C={C} /><Inp C={C} value={wF.pos} onChange={(e) => setWF((f) => ({ ...f, pos: e.target.value }))} placeholder="Programmist" /></div>
                <div><Lbl t={tl.initials} C={C} /><Inp C={C} value={wF.av} onChange={(e) => setWF((f) => ({ ...f, av: e.target.value }))} placeholder="MA" maxLength={2} /></div>
                <div>
                  <Lbl t={tl.dept} C={C} />
                  <Sel C={C} value={wF.dept_id || ""} onChange={(e) => setWF((f) => ({ ...f, dept_id: e.target.value }))} kids={[
                    <option key="" value="">{tl.selectDept}</option>,
                    ...depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>),
                  ]} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn ch={tl.cancel} v="gh" onClick={() => setWMod(false)} sx={{ color: C.txS }} />
                  <Btn ch={eW ? <span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.saveProfile}</span> : <span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",13)} {tl.create}</span>} onClick={saveW} />
                </div>
              </div>
            </Pop>
          )}
        </>
      )}

      {/* Ulanyjylar */}
      {sub === "users" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",14)} {tl.addUser}</span>} onClick={() => openU()} />
          </div>
          <div style={{ display: "grid", gap: 11 }}>
            {users.map((u) => {
              const r  = RL[u.role];
              const lw = workers.find((w) => w.id === u.wid);
              return (
                <div key={u.id} className="kc" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: "14px 18px", display: "flex", alignItems: "center", gap: 13, flexWrap: mob ? "wrap" : "nowrap", transition: "all .2s" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: r ? r.c + "22" : C.acG, border: `1.5px solid ${r ? r.c : C.ac}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {r ? r.ic(r.c, 20) : "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.tx }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: C.txS, marginTop: 1 }}>
                      @{u.username}{lw && <span style={{ marginLeft: 7, color: C.txM }}>→ {lw.name}</span>}
                    </div>
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 7 }}>
                      <RC role={u.role} />
                      <span style={{ fontSize: 11, color: C.txM, background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 7, padding: "2px 7px", fontFamily: "monospace" }}>🔑 {u.password}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    <Btn ch={I.edit(C.txS,13)} v="ot" sz="s" onClick={() => openU(u)} />
                    <Btn ch={I.trash(C.rd,13)} v="dl" sz="s" onClick={async () => { try { await sbFetch(`users?id=eq.${u.id}`,"DELETE"); setUsers((p) => p.filter((x) => x.id !== u.id)); toast(tl.toastUserDeleted, u.name, "info"); } catch(e) { toast("Ýalňyşlyk",e.message,"err"); } }} />
                  </div>
                </div>
              );
            })}
          </div>

          {uMod && (
            <Pop C={C} onClose={() => setUMod(false)}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: C.tx, marginBottom: 18 }}>{eU ? `✏️ ${tl.editUser}` : `➕ ${tl.newUser}`}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div><Lbl t={tl.fullName} C={C} /><Inp C={C} value={uF.name} onChange={(e) => setUF((f) => ({ ...f, name: e.target.value }))} placeholder={tl.fullName} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                  <div><Lbl t={tl.username} C={C} /><Inp C={C} value={uF.username} onChange={(e) => setUF((f) => ({ ...f, username: e.target.value }))} placeholder="username" /></div>
                  <div><Lbl t={tl.password} C={C} /><Inp C={C} type="text" value={uF.password} onChange={(e) => setUF((f) => ({ ...f, password: e.target.value }))} placeholder="parol" /></div>
                </div>
                <div>
                  <Lbl t="Roly" C={C} />
                  <Sel C={C} value={uF.role} onChange={(e) => setUF((f) => ({ ...f, role: e.target.value }))} kids={[
                    <option key="a" value="admin">👑 Admin</option>,
                    <option key="b" value="bashlik">👔 Başlyk</option>,
                    <option key="i" value="ishgar">👷 Işgär</option>,
                  ]} />
                </div>
                <div>
                  <Lbl t={tl.linkWorker} C={C} />
                  <Sel C={C} value={uF.wid || ""} onChange={(e) => setUF((f) => ({ ...f, wid: e.target.value }))} kids={[
                    <option key="" value="">{tl.selectWorker}</option>,
                    ...workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>),
                  ]} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn ch={tl.cancel} v="gh" onClick={() => setUMod(false)} sx={{ color: C.txS }} />
                  <Btn ch={eU ? <span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.saveProfile}</span> : <span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",13)} {tl.create}</span>} onClick={saveU} />
                </div>
              </div>
            </Pop>
          )}
        </>
      )}

      {/* Bölümler */}
      {sub === "depts" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn ch={<span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",14)} {tl.addDept}</span>} onClick={() => { setED(null); setDF({ name: "" }); setDMod(true); }} />
          </div>
          {depts.length === 0 && (
            <div style={{ background:C.cd, border:`1px solid ${C.bd}`, borderRadius:17, padding:22, textAlign:"center", color:C.txM }}>{tl.noDepts}</div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {depts.map((d) => {
              const dw = workers.filter(w => w.dept_id === d.id);
              return (
                <div key={d.id} className="kc" style={{ background:C.cd, border:`1px solid ${C.bd}`, borderRadius:17, padding:"14px 18px", display:"flex", alignItems:"center", gap:13, transition:"all .2s" }}>
                  <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:C.acG, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏢</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:900, fontSize:15, color:C.tx }}>{d.name}</div>
                    <div style={{ fontSize:12, color:C.txS, marginTop:2 }}>{dw.length} işgär</div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:5 }}>
                      {dw.slice(0,5).map((w,i) => <span key={w.id} style={{ fontSize:11, background:C.sf, border:`1px solid ${C.bd}`, borderRadius:6, padding:"2px 7px", color:C.tx }}>{w.name.split(" ")[0]}</span>)}
                      {dw.length > 5 && <span style={{ fontSize:11, color:C.txM }}>+{dw.length-5}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:7 }}>
                    <Btn ch={I.edit(C.txS,13)} v="ot" sz="s" onClick={() => { setED(d); setDF({ name: d.name }); setDMod(true); }} />
                    <Btn ch={I.trash(C.rd,13)} v="dl" sz="s" onClick={async () => {
                      try {
                        await sbFetch(`depts?id=eq.${d.id}`, "DELETE");
                        setDepts(p => p.filter(x => x.id !== d.id));
                        toast("Bölüm pozuldy", d.name, "info");
                      } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {dMod && (
            <Pop C={C} onClose={() => setDMod(false)} w={380}>
              <h3 style={{ fontSize:17, fontWeight:900, color:C.tx, marginBottom:18 }}>{eD ? `✏️ ${tl.editDept}` : `➕ ${tl.newDept}`}</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                <div><Lbl t={tl.deptName} C={C} /><Inp C={C} value={dF.name} onChange={(e) => setDF(f => ({ ...f, name: e.target.value }))} placeholder={tl.deptNamePh} /></div>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <Btn ch={tl.cancel} v="gh" onClick={() => setDMod(false)} sx={{ color:C.txS }} />
                  <Btn ch={eD ? <span style={{display:"flex",alignItems:"center",gap:6}}>{I.save("white",14)} {tl.save}</span> : <span style={{display:"flex",alignItems:"center",gap:6}}>{I.plus("white",13)} {tl.create}</span>} onClick={async () => {
                    if (!dF.name.trim()) return;
                    try {
                      if (eD) {
                        await sbFetch(`depts?id=eq.${eD.id}`, "PATCH", { name: dF.name });
                        setDepts(p => p.map(x => x.id === eD.id ? { ...x, name: dF.name } : x));
                        toast("Bölüm täzelendi", dF.name, "ok");
                      } else {
                        const nd = { id: "d" + Date.now(), name: dF.name };
                        await sbFetch("depts", "POST", nd);
                        setDepts(p => [...p, nd]);
                        toast("Bölüm goşuldy", dF.name, "ok");
                      }
                      setDMod(false);
                    } catch(e) { toast("Ýalňyşlyk", e.message, "err"); }
                  }} />
                </div>
              </div>
            </Pop>
          )}
        </>
      )}

      {sMod && <SettingsModal settings={settings} setSettings={setSettings} C={C} onClose={() => setSMod(false)} toast={toast} tl={tl} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HASABATLAR
// ═══════════════════════════════════════════════════════════════
function Reports({ workers, tasks, attend, C, mob, cu, settings, tl }) {
  if (cu.role === "ishgar") return <Deny C={C} tl={tl} />;

  const ws = workers.map((w) => {
    const recs = attend.filter((a) => a.wid === w.id && a.check_out);
    const mins = recs.reduce((s, a) => s + (tMin(a.check_out) - tMin(a.check_in)), 0);
    const late = recs.filter((a) => !a.edited && tMin(a.check_in) > tMin(settings.workStart) + settings.lateLimit).length;
    const mt   = tasks.filter((t) => t.who === w.id);
    const done = mt.filter((t) => t.col === "Tamamlandy").length;
    return { ...w, hours: (mins / 60).toFixed(1), days: recs.length, late, tasks: mt.length, done };
  });

  const totMin = attend.filter((a) => a.check_out).reduce((s, a) => s + (tMin(a.check_out) - tMin(a.check_in)), 0);
  const top = [
    { l: tl.totalHours,  v: (totMin / 60).toFixed(1) + " sa", ic: I.time(C.ac,24), c: C.ac },
    { l: tl.daysCount,  v: attend.filter((a) => a.check_out).length,            ic: I.calendar(C.gn,24), c: C.gn },
    { l: tl.done,  v: tasks.filter((t) => t.col === "Tamamlandy").length, ic: I.check(C.pu,22), c: C.pu },
    { l: tl.workers,    v: workers.length,                                ic: I.workers(C.gn,22), c: C.yw },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "kUp .35s" }}>
      <STit icon={I.chart(C.txS,17)} t={tl.reports} C={C} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${mob ? 2 : 4},1fr)`, gap: 12 }}>
        {top.map((s) => (
          <div key={s.l} className="kc" style={{ background: C.cd, border: `1px solid ${C.bd}`, borderTop: `3px solid ${s.c}`, borderRadius: 17, padding: 18, textAlign: "center", transition: "all .2s" }}>
            <div style={{ fontSize: 24, marginBottom: 7 }}>{s.ic}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 12, color: C.txS, marginTop: 5 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 17, padding: 18 }}>
        <STit icon={I.workers(C.txS,17)} t={tl.workerStats} C={C} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{[tl.workerCol,tl.positionCol,tl.daysCol,tl.hoursCol,tl.lateCol,tl.tasksCol,tl.readyCol,tl.effCol].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: C.txS, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${C.bd}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {ws.map((w, i) => {
                const eff = w.tasks > 0 ? Math.round(w.done / w.tasks * 100) : 0;
                const ec  = eff > 70 ? C.gn : eff > 40 ? C.yw : C.rd;
                return (
                  <tr key={w.id} style={{ borderBottom: `1px solid ${C.bdS}` }}>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Av a={w.av} i={i} z={30} />
                        <span style={{ fontWeight: 700, color: C.tx }}>{w.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", color: C.txS }}>{w.pos}</td>
                    <td style={{ padding: "11px 12px" }}><Chip color={C.ac} sm>{w.days}</Chip></td>
                    <td style={{ padding: "11px 12px", color: C.tx }}>{w.hours}s</td>
                    <td style={{ padding: "11px 12px" }}>{w.late > 0 ? <Chip color={C.yw} sm>⚠️ {w.late}</Chip> : <span style={{ color: C.gn, fontSize: 12 }}>✓</span>}</td>
                    <td style={{ padding: "11px 12px", color: C.tx }}>{w.tasks}</td>
                    <td style={{ padding: "11px 12px" }}><Chip color={C.gn} sm>{w.done}</Chip></td>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ flex: 1, height: 5, background: C.bd, borderRadius: 2, minWidth: 50 }}>
                          <div style={{ height: "100%", width: `${eff}%`, background: ec, borderRadius: 2, transition: "width .9s" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ec, minWidth: 34 }}>{eff}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ws.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "22px", textAlign: "center", color: C.txM }}>{tl.noData}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI KÖMEKÇI PANELI
// ═══════════════════════════════════════════════════════════════
function AIPanel({ workers, tasks, attend, onClose, C, mob, cu, tl, lang }) {
  const isI = cu.role === "ishgar";
  const myT = isI ? tasks.filter((t) => t.who === cu.wid) : tasks;

  const [msgs, setMsgs] = useState([{ role: "assistant", content: `Salam, ${cu.name.split(" ")[0]}! Men Kömekçiniň AI kömekçisi. Size nähili kömek edip bilerin? ✨` }]);
  const [inp,  setInp]  = useState("");
  const [load, setLoad] = useState(false);
  const endRef = useRef(null);

  const QK = isI
    ? [tl.aiQMyTasks, tl.aiQToday, tl.aiQAdvice]
    : [tl.aiQWho, tl.aiQOverdue, tl.aiQPerf, tl.aiQAdvice];

  const overdue = tasks.filter((t) => t.dl && dDiff(dlToTk(t.dl), gToday()) < 0 && t.col !== "Tamamlandy").length;

  // Dile görä AI instruksiýasy
  const langInstr = {
    tk: "Diňe TÜRKMEN dilinde jogap ber. Gysgaça we peýdaly.",
    ru: "Отвечай ТОЛЬКО на РУССКОМ языке. Кратко и по делу.",
    en: "Reply ONLY in ENGLISH. Keep it brief and helpful.",
  };

  const sysPrompt = `You are an AI assistant built into "Kömekçi" office management app.
${langInstr[lang] || langInstr.tk}
User: ${cu.name}, role: ${cu.role}
${isI
  ? `My tasks: ${myT.map((t) => `"${t.title}"(${t.col}${t.dl ? ", due:" + dlToTk(t.dl) : ""})`).join(", ") || "none"}`
  : `Workers: ${workers.map((w) => `${w.name}(${w.pos},${w.status})`).join(", ")}
At work: ${workers.filter((w) => w.status === "işde").map((w) => w.name).join(", ") || "none"}
Tasks: Todo=${tasks.filter((t) => t.col === "Etmeli").length}, Done=${tasks.filter((t) => t.col === "Tamamlandy").length}
Overdue: ${overdue}`}
Answer in max 3 sentences.`;
// Vercel we Vite üçin API açaryny Environment Variable-dan alýarys
      // GitHub bloklamazlygy üçin açaryňyzy diňe Vercel Settings-e goşuň!
      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    const send = async (txt) => {
    const msg = (txt || inp).trim();
    if (!msg || load) return;
    setInp("");
    const nm = [...msgs, { role: "user", content: msg }];
    setMsgs(nm);
    setLoad(true);

    if (!GROQ_API_KEY) {
      setMsgs((p) => [...p, {
        role: "assistant",
        content: "⚙️ AI işlemek üçin Groq API açaryny App.jsx faýlynda GROQ_API_KEY ýerine goýuň.\n\n1. console.groq.com açyň\n2. Hasap açyň (mugt)\n3. API Keys -> Create API Key\n4. Açary App.jsx-däki GROQ_API_KEY = \"\" içine goýuň",
      }]);
      setLoad(false);
      return;
    }

    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 600,
          messages: [
            { role: "system", content: sysPrompt },
            ...nm.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const d = await r.json();
      const text = d.choices && d.choices[0] && d.choices[0].message
        ? d.choices[0].message.content
        : "Ötünç, jogap alyp bolmady.";
      setMsgs((p) => [...p, { role: "assistant", content: text }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "Bağlantý ýalňyşlygy. Internet bağlantyňyzy barlaň." }]);
    }
    setLoad(false);
  };

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, load]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: mob ? 0 : "20px 24px", backdropFilter: "blur(6px)", animation: "kIn .2s" }}
    >
      <div style={{ width: mob ? "100%" : "min(420px,96vw)", height: mob ? "88vh" : "min(580px,88vh)", background: C.cd, border: `1px solid ${C.bd}`, borderRadius: mob ? "22px 22px 0 0" : "20px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: C.sh, animation: mob ? "kSl .3s" : "kUp .25s" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bd}`, background: `linear-gradient(135deg,${C.pu}18,${C.ac}0A)`, display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `linear-gradient(135deg,${C.pu},${C.ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 14px ${C.pu}55` }}>{I.robot("white",20)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: C.tx }}>{tl.aiTitle}</div>
            <div style={{ fontSize: 11, color: C.gn, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gn, display: "inline-block" }} />
              <span style={{ fontWeight: 700 }}>{tl.aiActive}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.bd}`, background: C.sf, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.txS, fontSize: 14, fontWeight: 700 }}><span style={{fontWeight:700}}>✕</span></button>
        </div>

        {/* Çalt soraglar */}
        <div style={{ padding: "9px 14px", borderBottom: `1px solid ${C.bdS}`, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {QK.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={load} style={{ padding: "3px 10px", borderRadius: 18, fontSize: 11, fontWeight: 700, background: C.puS, color: C.pu, border: `1px solid ${C.pu}33`, cursor: "pointer", opacity: load ? 0.6 : 1 }}>{q}</button>
          ))}
        </div>

        {/* Mesajlar */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
              {m.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: `linear-gradient(135deg,${C.pu},${C.ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginBottom: 2 }}>🤖</div>
              )}
              <div style={{ maxWidth: "80%", padding: "9px 13px", lineHeight: 1.6, fontSize: 13, borderRadius: m.role === "user" ? "15px 15px 4px 15px" : "15px 15px 15px 4px", background: m.role === "user" ? `linear-gradient(135deg,${C.ac},${C.acD})` : C.sf, color: m.role === "user" ? "#fff" : C.tx, border: m.role === "assistant" ? `1px solid ${C.bd}` : "none", whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
          {load && (
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg,${C.pu},${C.ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
              <div style={{ padding: "11px 14px", borderRadius: "15px 15px 15px 4px", background: C.sf, border: `1px solid ${C.bd}`, display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.pu, animation: `kBl 1.2s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "11px 14px", borderTop: `1px solid ${C.bd}`, background: C.sf, display: "flex", gap: 9 }}>
          <input
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={load}
            placeholder={tl.aiPh}
            style={{ flex: 1, padding: "9px 14px", borderRadius: 12, fontSize: 13, background: C.cd, border: `1.5px solid ${C.bd}`, color: C.tx, fontFamily: "inherit" }}
          />
          <button
            onClick={() => send()}
            disabled={load || !inp.trim()}
            style={{ width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer", background: !load && inp.trim() ? `linear-gradient(135deg,${C.pu},${C.ac})` : C.bd, color: "#fff", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >{I.send("white",17)}</button>
        </div>
      </div>
    </div>
  );
}
// ─── Nawigasiýa ───────────────────────────────────────────────
function getTabs(cu, tl) {
  return [
    { id: "d",   ic: (c,s) => I.home(c,s),     l: tl.navHome    },
    { id: "a",   ic: (c,s) => I.calendar(c,s),  l: tl.navAttend },
    { id: "k",   ic: (c,s) => I.kanban(c,s),    l: tl.navTasks  },
    ...(cu.role === "admin"               ? [{ id: "adm", ic: (c,s) => I.settings(c,s), l: tl.navAdmin  }] : []),
    ...(cu.role === "admin" || cu.role === "bashlik" ? [{ id: "r", ic: (c,s) => I.chart(c,s), l: tl.navReport }] : []),
  ];
}

function BottomNav({ tab, setTab, C, cu, tl }) {
  const tabs = getTabs(cu, tl);
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.sf, borderTop: `1px solid ${C.bd}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 4px 7px", border: "none", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === t.id ? C.ac : C.txM }}>
          <span style={{display:"flex",alignItems:"center",justifyContent:"center"}}>{t.ic(tab===t.id ? C.ac : C.txM, 20)}</span>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>{t.l}</span>
          {tab === t.id && <div style={{ width: 20, height: 3, borderRadius: 2, background: C.ac, boxShadow: `0 0 7px ${C.ac}`, marginTop: 1 }} />}
        </button>
      ))}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP — BAŞ KOMPONENT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const { lang, setL, tl } = useLang();
  const [dark,     setDark]     = useState(() => LS.get("k_dark", true));
  const C = dark ? DARK : LITE;
  useCSS(C);

  const [cu,       setCu]       = useState(null);
  const [tab,      setTab]      = useState("d");
  const [workers,  setWorkers]  = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [depts,    setDepts]    = useState([]);
  const [attend,   setAttend]   = useState([]);
  const [users,    setUsers]    = useState([]);
  const [settings, setSettings] = useState(DEF_SETTINGS);
  const [time,     setTime]     = useState(gNow());
  const [aiOpen,   setAiOpen]   = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const mob = useMob();
  const { ts, add: toast, rm } = useToast();

  // ── Supabase-den maglumatlary ýükle ─────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [w, t, a, u, s, d] = await Promise.all([
          sbFetch("workers?order=created_at"),
          sbFetch("tasks?order=created_at"),
          sbFetch("attend?order=created_at"),
          sbFetch("users?order=created_at"),
          sbFetch("settings?id=eq.1"),
          sbFetch("depts?order=created_at"),
        ]);
        setWorkers(w || []);
        setTasks((t || []).map(x => ({ ...x, desc: x.description || "", comments: x.comments || [], files: x.files || [] })));
        setAttend(a || []);
        setUsers(u || []);
        setDepts(d || []);
        if (s && s[0]) {
          setSettings({ workStart: s[0].work_start, workEnd: s[0].work_end, lateLimit: s[0].late_limit });
        }
      } catch(e) {
        toast("Supabase ýalňyşlygy", e.message, "err");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Real-time subscriptions ──────────────────────────────────
  useEffect(() => {
    const unsubs = [
      sbSubscribe("workers", (ev, rec, old) => {
        if (ev === "INSERT") setWorkers(p => [...p, rec]);
        if (ev === "UPDATE") setWorkers(p => p.map(x => x.id === rec.id ? rec : x));
        if (ev === "DELETE") setWorkers(p => p.filter(x => x.id !== old.id));
      }),
      sbSubscribe("tasks", (ev, rec, old) => {
        const r = rec ? { ...rec, desc: rec.description || "", comments: rec.comments || [] } : rec;
        if (ev === "INSERT") setTasks(p => [...p, r]);
        if (ev === "UPDATE") setTasks(p => p.map(x => x.id === r.id ? r : x));
        if (ev === "DELETE") setTasks(p => p.filter(x => x.id !== old.id));
      }),
      sbSubscribe("attend", (ev, rec, old) => {
        if (ev === "INSERT") setAttend(p => [...p, rec]);
        if (ev === "UPDATE") setAttend(p => p.map(x => x.id === rec.id ? rec : x));
        if (ev === "DELETE") setAttend(p => p.filter(x => x.id !== old.id));
      }),
      sbSubscribe("users", (ev, rec, old) => {
        if (ev === "INSERT") setUsers(p => [...p, rec]);
        if (ev === "UPDATE") setUsers(p => p.map(x => x.id === rec.id ? rec : x));
        if (ev === "DELETE") setUsers(p => p.filter(x => x.id !== old.id));
      }),
      sbSubscribe("depts", (ev, rec, old) => {
        if (ev === "INSERT") setDepts(p => [...p, rec]);
        if (ev === "UPDATE") setDepts(p => p.map(x => x.id === rec.id ? rec : x));
        if (ev === "DELETE") setDepts(p => p.filter(x => x.id !== old.id));
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  // Tema localStorage-da saklanýar
  useEffect(() => LS.set("k_dark", dark), [dark]);

  // Sagat täzelenýär
  useEffect(() => {
    const t = setInterval(() => setTime(gNow()), 15000);
    return () => clearInterval(t);
  }, []);

  // Möhlet geçen tabşyryklary barlaýar
  useEffect(() => {
    if (!cu) return;
    const od = tasks.filter((t) => t.dl && dDiff(dlToTk(t.dl), gToday()) < 0 && t.col !== "Tamamlandy");
    if (od.length > 0) toast(`${od.length} ${tl.toastOverdue}`, tl.toastOverdueSub, "info");
  }, [cu]); // eslint-disable-line

  // Loading ekrany
  if (loading) return (
    <div style={{ minHeight:"100vh", background: C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ animation:"kGl 2s infinite" }}><LogoIcon size={64}/></div>
      <LogoText size={28} C={C} center={true}/>
      <div style={{ display:"flex", alignItems:"center", gap:8, color:C.txS, fontSize:14 }}>
        {I.spinner(C.ac, 20)} <span>Ýüklenýär...</span>
      </div>
    </div>
  );

  const normUsers   = users.map((u) => ({ ...u, wid: u.wid || u.workerId || null }));
  // Başlyk — diňe öz bölüminiň işgärlerini görýär
  const cuWorker    = workers.find(w => w.id === cu?.wid);
  const normWorkers = (cu?.role === "bashlik" && cuWorker?.dept_id)
    ? workers.filter(w => w.dept_id === cuWorker.dept_id)
    : workers;
  // Başlyk — diňe öz bölüminiň tabşyryklaryny görýär
  const normTasks   = (cu?.role === "bashlik" && cuWorker?.dept_id)
    ? tasks.filter(t => {
        const tw = workers.find(w => w.id === t.who);
        return tw?.dept_id === cuWorker.dept_id;
      })
    : tasks;

  // Giriş ekrany
  if (!cu) {
    return (
      <>
        <Login
          users={normUsers}
          onLogin={(u) => { setCu({ ...u, wid: u.wid || u.workerId || null }); setTab("d"); }}
          C={C} dark={dark} setDark={setDark} tl={tl} lang={lang} setL={setL}
        />
        <Toast ts={ts} rm={rm} C={C} />
      </>
    );
  }

  const role = RL[cu.role];
  const tabs = getTabs(cu, tl);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", display: "flex", flexDirection: "column", transition: "background .3s,color .3s" }}>

      {/* ─── HEADER ─── */}
      <header style={{ background: C.sf, borderBottom: `1px solid ${C.bd}`, padding: mob ? "0 13px" : "0 26px", height: mob ? 54 : 62, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <LogoIcon size={36}/>
          <div>
            <LogoText size={mob ? 13 : 20} C={C} />
            {!mob && <div style={{ fontSize: 10, color: C.txM, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", marginTop: -2 }}>{tl.appSubShort}</div>}
          </div>
        </div>

        {/* Desktop nawigasiýa */}
        {!mob && (
          <nav style={{ display: "flex", gap: 2 }}>
            {tabs.map((t) => (
              <button key={t.id} className="kn" onClick={() => setTab(t.id)} style={{ padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s", background: tab === t.id ? C.acG : "transparent", color: tab === t.id ? C.ac : C.txS, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{display:"flex"}}>{t.ic(tab===t.id ? C.ac : C.txS, 16)}</span><span>{t.l}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Sag tarap düwmeleri */}
        <div style={{ display: "flex", alignItems: "center", gap: mob ? 3 : 7 }}>
          {/* Sagat — diňe desktop */}
          {!mob && (
            <div style={{ fontSize: 12, color: C.txS, fontVariantNumeric: "tabular-nums", background: C.cd, padding: "4px 12px", borderRadius: 18, border: `1px solid ${C.bd}` }}>🕐 {time}</div>
          )}

          {/* Dil saýlaýjy — hemişe görünýär */}
          <LangSwitcher lang={lang} setL={setL} C={C}/>

          {/* Profil düwmesi */}
          <button onClick={() => setProfOpen(true)} className="kb" style={{ display: "flex", alignItems: "center", gap: 6, background: C.cd, border: `1.5px solid ${role.c}44`, borderRadius: 11, padding: mob ? "4px 6px" : "5px 11px", cursor: "pointer" }}>
            <span style={{display:"flex"}}>{role.ic(role.c, 16)}</span>
            {!mob && <span style={{ fontSize: 12, fontWeight: 800, color: C.tx }}>{cu.name.split(" ")[0]}</span>}
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: role.c, display: "inline-block", boxShadow: `0 0 6px ${role.c}` }} />
          </button>

          {/* AI düwmesi — hemişe görünýär */}
          <button onClick={() => setAiOpen(true)} className="kb" style={{ width: mob ? 30 : "auto", height: mob ? 30 : "auto", padding: mob ? "0" : "7px 14px", borderRadius: mob ? "50%" : 11, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.pu},${C.ac})`, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, boxShadow: `0 4px 14px ${C.ac}44`, animation: "kGl 2.5s infinite" }}>
            {mob ? I.robot("white",17) : <span style={{display:"flex",alignItems:"center",gap:5}}>{I.robot("white",16)} AI</span>}
          </button>

          {/* Tema — hemişe görünýär */}
          <button onClick={() => setDark((d) => !d)} className="kb" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.cd, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {dark ? I.sun(C.txM,16) : I.moon(C.txM,16)}
          </button>

          {/* Çykyş — hemişe görünýär */}
          <button onClick={() => setCu(null)} className="kb" title={tl.logout} style={{ width: mob?28:34, height: mob?28:34, borderRadius: 10, border: `1px solid ${C.rd}44`, background: C.rdS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{I.door(C.rd,15)}</button>
        </div>
      </header>

      {/* ─── MAIN MAZMUNY ─── */}
      <main style={{ flex: 1, padding: mob ? "14px 13px 80px" : "26px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {tab === "d"   && <Dash     tl={tl} workers={normWorkers} tasks={normTasks} depts={depts} attend={attend} C={C} mob={mob} cu={cu} settings={settings} />}
        {tab === "a"   && <Attend   tl={tl} workers={normWorkers} attend={attend} setAttend={setAttend} setWorkers={setWorkers} C={C} mob={mob} cu={cu} settings={settings} toast={toast} />}
        {tab === "k"   && <Kanban   tl={tl} tasks={normTasks} setTasks={setTasks} workers={normWorkers} C={C} mob={mob} cu={cu} toast={toast} />}
        {tab === "adm" && <Admin    tl={tl} workers={normWorkers} setWorkers={setWorkers} users={normUsers} setUsers={setUsers} depts={depts} setDepts={setDepts} C={C} mob={mob} cu={cu} settings={settings} setSettings={setSettings} toast={toast} />}
        {tab === "r"   && <Reports  tl={tl} workers={normWorkers} tasks={normTasks} attend={attend} C={C} mob={mob} cu={cu} settings={settings} />}
      </main>

      {/* Mobil nawigasiýa */}
      {mob && <BottomNav tl={tl} tab={tab} setTab={setTab} C={C} cu={cu} />}

      {/* Desktop AI düwmesi */}
      {!mob && !aiOpen && (
        <button onClick={() => setAiOpen(true)} className="kb" style={{ position: "fixed", bottom: 26, right: 26, width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 24, zIndex: 150, background: `linear-gradient(135deg,${C.pu},${C.ac})`, boxShadow: `0 6px 22px ${C.pu}66`, animation: "kGl 2.5s infinite" }}>{I.robot("white",24)}</button>
      )}

      {/* Modallar */}
      {aiOpen   && <AIPanel   tl={tl} lang={lang} workers={normWorkers} tasks={normTasks} attend={attend} onClose={() => setAiOpen(false)} C={C} mob={mob} cu={cu} />}
      {profOpen && <Profile   tl={tl} cu={cu} users={normUsers} setUsers={setUsers} setCu={(u) => setCu({ ...u, wid: u.wid || u.workerId || null })} C={C} onClose={() => setProfOpen(false)} toast={toast} />}

      {/* Bildirişler */}
      <Toast ts={ts} rm={rm} C={C} />
    </div>
  );
}
