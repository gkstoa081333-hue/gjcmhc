// crypto.js — AES-256-GCM 암호화 유틸 (PBKDF2 키 유도)
/* ================================================================
   1. 암호화 유틸 (PBKDF2 → AES-GCM)  — v1과 동일
================================================================ */
let AES_KEY = null;
const te = new TextEncoder(), td = new TextDecoder();
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a)));
const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pass){
  const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt: te.encode('gjmhc-case-record-2026'), iterations:150000, hash:'SHA-256'},
    base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encText(t){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, AES_KEY, te.encode(t));
  return {iv:b64(iv), ct:b64(ct)};
}
async function decText(o){
  try{
    const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:ub64(o.iv)}, AES_KEY, ub64(o.ct));
    return td.decode(pt);
  }catch(e){ return null; }
}
async function sha256(s){
  const h = await crypto.subtle.digest('SHA-256', te.encode(s));
  return b64(h);
}