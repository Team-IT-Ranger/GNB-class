// Gemini × Gemini Notebook — Class Workspace
// โครงและส่วนที่ใช้ซ้ำ (Whiteboard, โน้ต, แชต, sidebar) ดัดแปลงจากต้นแบบ Excel Class Workspace
// เนื้อหาอยู่ในไฟล์ *-data.js ตั้งค่าใน config.js — ดู README.md

const GAS_ENDPOINT = APP_CONFIG.GAS_ENDPOINT;
const GAS_SECRET = APP_CONFIG.GAS_SECRET;
const STORE = "gn-"; // คำนำหน้า key ใน localStorage

const esc = (text) => String(text).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
const table = (rows) => `<div class="table-scroll"><table class="data-table"><thead><tr>${rows[0].map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const stored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* โหมดส่วนตัวหรือพื้นที่เต็ม: ข้ามไป ระบบยังใช้งานได้ */ } };
const completed = () => stored("gn-completed", []);
const setViewHash = (value) => { location.hash = value; };

const codeBlock = (text) => `<pre class="code-block">${esc(text)}</pre>`;
const reveal = (openLabel, closeLabel, innerHtml) => `<button type="button" class="reveal-btn" data-open="${esc(openLabel)}" data-close="${esc(closeLabel)}">${esc(openLabel)}</button><div class="reveal-panel">${innerHtml}</div>`;
const zipLink = (folder, label) => `<a class="zip-link" href="data-files/${encodeURIComponent(folder)}.zip" download>⬇ ${esc(label || `ดาวน์โหลดไฟล์ ${folder}`)}</a>`;
const promptBlock = (label, text) => `<div class="prompt-box"><div class="prompt-head"><strong>${esc(label)}</strong><button type="button" class="copy-btn" data-copy="${esc(text)}">คัดลอก</button></div><pre class="prompt-text">${esc(text)}</pre></div>`;
const venueBadgeHtml = () => `<div class="venue-badge"><span class="venue-dot"></span><span>${esc(APP_CONFIG.CLASS_LABEL)}</span></div>`;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

const instructorDataLoaded = () => typeof instructorNotes !== "undefined";

// ---- Handbook PDF export (jsPDF + html2canvas, loaded on demand) ----
let pdfLibsPromise = null;
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("โหลดไลบรารีไม่สำเร็จ: " + src));
    document.head.appendChild(s);
  });
}
function ensurePdfLibs() {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([
      loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
    ]);
  }
  return pdfLibsPromise;
}

async function downloadHandbookPdf() {
  toast("กำลังสร้างไฟล์ PDF คู่มือผู้เรียน...");
  try {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;

    const root = document.createElement("div");
    root.className = "pdf-export-root";
    root.innerHTML = chapters.map(c => renderChapter(c.id)).join("");
    root.querySelectorAll(".quiz-answer").forEach(el => el.classList.add("show"));
    document.body.appendChild(root);

    const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#ffffff", windowWidth: root.scrollWidth });
    document.body.removeChild(root);

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const headerHeight = 46;
    const contentWidth = pageWidth - margin * 2;
    const contentHeightPt = pageHeight - headerHeight - margin - 14;
    const scale = contentWidth / canvas.width;
    const pageSlicePx = Math.floor(contentHeightPt / scale);
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageSlicePx));

    const drawHeader = () => {
      pdf.setDrawColor(210, 210, 210);
      pdf.line(margin, headerHeight - 8, pageWidth - margin, headerHeight - 8);
      pdf.setFontSize(12);
      pdf.setTextColor(30, 30, 30);
      pdf.text("Gemini x Gemini Notebook", margin, 28);
    };

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      drawHeader();
      const sliceHeightPx = Math.min(pageSlicePx, canvas.height - i * pageSlicePx);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      sliceCanvas.getContext("2d").drawImage(canvas, 0, i * pageSlicePx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, headerHeight, contentWidth, sliceHeightPx * scale);
    }

    pdf.save("Gemini-Notebook-คู่มือผู้เรียน.pdf");
    toast("ดาวน์โหลด PDF สำเร็จ");
  } catch (err) {
    console.error(err);
    toast("สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

// ---- Whiteboard (client-side only — nothing is sent anywhere until exported) ----
// Fixed intrinsic resolution; CSS scales the canvas to fit its container, so
// stroke coordinates and widths never need rescaling when the window resizes.
const WB_CANVAS_WIDTH = 1600;
const WB_CANVAS_HEIGHT = 900;
const WHITEBOARD_COLORS = ["#111111", "#d95d45", "#217346", "#1a73e8", "#f6a609", "#7a3ff0"];
let wbPages = [[]]; // each page is an array of strokes {tool:'pen'|'eraser', color, size, points:[{x,y}]} — kept in memory so switching tabs and back doesn't lose the drawing
let wbActivePage = 0;
let wbCurrentStroke = null;
let wbDrawing = false;
let wbTool = "pen";
let wbColor = WHITEBOARD_COLORS[0];
let wbSize = 4;

function wbCanvasEl() { return document.querySelector("#wb-canvas"); }
function wbStrokesRef() { return wbPages[wbActivePage]; }

function wbPointFromEvent(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

function wbDrawStroke(ctx, stroke) {
  if (!stroke.points.length) return;
  ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const first = stroke.points[0];
  ctx.moveTo(first.x, first.y);
  if (stroke.points.length === 1) {
    ctx.lineTo(first.x, first.y); // a plain click/tap renders as a dot via the round line cap
  } else {
    stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  }
  ctx.stroke();
}

function wbDrawSegment(ctx, stroke) {
  const points = stroke.points;
  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];
  if (!p1 || !p2) return;
  ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function wbRedraw() {
  const canvas = wbCanvasEl();
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  wbStrokesRef().forEach(stroke => wbDrawStroke(ctx, stroke));
}

function wbApplyToolUI() {
  document.querySelectorAll(".wb-tool").forEach(b => b.classList.toggle("active", b.dataset.wbTool === wbTool));
}
function wbApplyColorUI() {
  document.querySelectorAll(".wb-color").forEach(b => b.classList.toggle("active", b.dataset.wbColor === wbColor));
  const customInput = document.querySelector("#wb-color-custom");
  if (customInput) customInput.value = wbColor;
}
function wbSetTool(tool) {
  wbTool = tool;
  wbApplyToolUI();
}
function wbSetColor(color) {
  wbColor = color;
  wbTool = "pen"; // picking a color always switches back to the pen
  wbApplyToolUI();
  wbApplyColorUI();
}

function wbHandlePointerDown(e) {
  const canvas = wbCanvasEl();
  canvas.setPointerCapture(e.pointerId);
  wbDrawing = true;
  wbCurrentStroke = { tool: wbTool, color: wbColor, size: wbSize, points: [wbPointFromEvent(e, canvas)] };
}
function wbHandlePointerMove(e) {
  if (!wbDrawing || !wbCurrentStroke) return;
  const canvas = wbCanvasEl();
  wbCurrentStroke.points.push(wbPointFromEvent(e, canvas));
  wbDrawSegment(canvas.getContext("2d"), wbCurrentStroke);
}
function wbHandlePointerUp() {
  if (!wbDrawing || !wbCurrentStroke) return;
  wbDrawing = false;
  wbStrokesRef().push(wbCurrentStroke);
  if (wbCurrentStroke.points.length === 1) wbRedraw(); // draw the dot for a plain click/tap
  wbCurrentStroke = null;
}

function wbUndo() {
  const strokes = wbStrokesRef();
  if (!strokes.length) return;
  strokes.pop();
  wbRedraw();
}
function wbClear() {
  if (!wbStrokesRef().length) return;
  if (!confirm("ล้างกระดานทั้งหมดใช่หรือไม่? เนื้อหาที่ยังไม่ได้บันทึกจะหายไป")) return;
  wbPages[wbActivePage] = [];
  wbRedraw();
}

function wbSwitchPage(index) {
  if (index === wbActivePage || index < 0 || index >= wbPages.length) return;
  wbActivePage = index;
  render();
}
function wbAddPage() {
  wbPages.push([]);
  wbActivePage = wbPages.length - 1;
  render();
}
function wbClosePage(index) {
  if (wbPages.length <= 1) return;
  if (!confirm(`ลบหน้า ${index + 1} ใช่หรือไม่? เนื้อหาในหน้านี้จะหายไป`)) return;
  wbPages.splice(index, 1);
  if (index < wbActivePage) wbActivePage -= 1;
  else if (index === wbActivePage) wbActivePage = Math.min(wbActivePage, wbPages.length - 1);
  render();
}

function fileTimestampLabel() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function wbSavePng() {
  const canvas = wbCanvasEl();
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `whiteboard-${fileTimestampLabel()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  toast("บันทึกรูปภาพ Whiteboard แล้ว");
}
async function wbSavePdf() {
  const canvas = wbCanvasEl();
  if (!canvas) return;
  toast("กำลังสร้างไฟล์ PDF...");
  try {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
    const drawW = canvas.width * ratio;
    const drawH = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageWidth - drawW) / 2, (pageHeight - drawH) / 2, drawW, drawH);
    pdf.save(`whiteboard-${fileTimestampLabel()}.pdf`);
    toast("บันทึก PDF Whiteboard แล้ว");
  } catch (err) {
    console.error(err);
    toast("สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

function initWhiteboardCanvas() {
  const canvas = wbCanvasEl();
  if (!canvas) return;
  canvas.width = WB_CANVAS_WIDTH;
  canvas.height = WB_CANVAS_HEIGHT;
  wbRedraw();

  canvas.addEventListener("pointerdown", wbHandlePointerDown);
  canvas.addEventListener("pointermove", wbHandlePointerMove);
  canvas.addEventListener("pointerup", wbHandlePointerUp);
  canvas.addEventListener("pointercancel", wbHandlePointerUp);

  document.querySelectorAll(".wb-tool").forEach(btn => btn.addEventListener("click", () => wbSetTool(btn.dataset.wbTool)));
  document.querySelectorAll(".wb-color").forEach(btn => btn.addEventListener("click", () => wbSetColor(btn.dataset.wbColor)));
  document.querySelector("#wb-color-custom").addEventListener("input", (e) => wbSetColor(e.target.value));
  document.querySelector("#wb-size").addEventListener("input", (e) => { wbSize = Number(e.target.value); });
  document.querySelector("#wb-undo").addEventListener("click", wbUndo);
  document.querySelector("#wb-clear").addEventListener("click", wbClear);
  document.querySelector("#wb-save-png").addEventListener("click", wbSavePng);
  document.querySelector("#wb-save-pdf").addEventListener("click", wbSavePdf);
  document.querySelectorAll(".wb-tab").forEach(btn => btn.addEventListener("click", (e) => {
    if (e.target.closest(".wb-tab-close")) return;
    wbSwitchPage(Number(btn.dataset.wbPage));
  }));
  document.querySelectorAll(".wb-tab-close").forEach(btn => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    wbClosePage(Number(btn.dataset.wbClosePage));
  }));
  document.querySelector("#wb-add-page").addEventListener("click", wbAddPage);

  wbApplyToolUI();
  wbApplyColorUI();
  document.querySelector("#wb-size").value = wbSize;
}

// ---- Note (personal text notes — autosaved to this browser, optionally synced to the Google Sheet backend or exported as .txt) ----
let noteEntries = stored("gn-notes", []); // {id, title, content, savedAt}
let noteActiveId = null; // id of the note currently loaded in the editor; null = new/unsaved
let noteDraft = { title: "", content: "" };

function persistNotes() { save("gn-notes", noteEntries); }

function noteSelect(id) {
  const entry = noteEntries.find(n => n.id === id);
  if (!entry) return;
  noteActiveId = id;
  noteDraft = { title: entry.title, content: entry.content };
  render();
}
function noteStartNew() {
  noteActiveId = null;
  noteDraft = { title: "", content: "" };
  render();
}
function noteDelete() {
  if (!noteActiveId) return;
  if (!confirm("ลบบันทึกนี้ใช่หรือไม่? ข้อมูลจะหายไปจากเบราว์เซอร์นี้ (ยังอยู่ใน Google Sheet ถ้าเคยบันทึกไปแล้ว)")) return;
  noteEntries = noteEntries.filter(n => n.id !== noteActiveId);
  persistNotes();
  noteStartNew();
}
async function noteSaveToSheet() {
  const title = noteDraft.title.trim();
  const content = noteDraft.content.trim();
  if (!content) { toast("กรุณาพิมพ์เนื้อหาก่อนบันทึก"); return; }
  const name = studentName();
  if (!name) { toast("กรุณากรอกชื่อของคุณก่อนบันทึก"); return; }
  const now = Date.now();
  if (noteActiveId && noteEntries.some(n => n.id === noteActiveId)) {
    const entry = noteEntries.find(n => n.id === noteActiveId);
    entry.title = title;
    entry.content = content;
    entry.savedAt = now;
  } else {
    noteActiveId = now;
    noteEntries.push({ id: noteActiveId, title, content, savedAt: now });
  }
  persistNotes();
  const ok = await syncToBackend("notes", { title, content });
  sentToast(ok, "โน้ต");
  render();
}
function noteSaveAsTxt() {
  const content = noteDraft.content;
  if (!content.trim()) { toast("ยังไม่มีเนื้อหาให้บันทึก"); return; }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const safeTitle = (noteDraft.title || "note").trim().replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60) || "note";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}-${fileTimestampLabel()}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast("บันทึกไฟล์ .txt แล้ว");
}

function renderNotes() {
  const historyHtml = noteEntries.length
    ? noteEntries.slice().reverse().map(n => `
      <button type="button" class="note-history-item ${n.id === noteActiveId ? "active" : ""}" data-note-id="${n.id}">
        <strong>${esc(n.title || "ไม่มีหัวข้อ")}</strong>
        <small>${esc(new Date(n.savedAt).toLocaleString("th-TH"))}</small>
        <span>${esc((n.content || "").slice(0, 70))}${(n.content || "").length > 70 ? "…" : ""}</span>
      </button>`).join("")
    : `<p class="muted">ยังไม่มีบันทึกที่เก็บไว้ในเบราว์เซอร์นี้</p>`;
  return `<section class="notes-page">
    <div class="notes-toolbar">
      <button type="button" id="note-new" class="ghost-button">🆕 บันทึกใหม่</button>
      <button type="button" id="note-save-sheet" class="primary-button">💾 ส่งโน้ตนี้ให้ผู้สอน</button>
      <button type="button" id="note-save-txt" class="primary-button">⬇ บันทึกเป็นไฟล์ .txt</button>
      <button type="button" id="note-delete" class="ghost-button" ${noteActiveId ? "" : "disabled"}>🗑 ลบบันทึกนี้</button>
    </div>
    <p class="consent-note">🔒 โน้ตเก็บในเบราว์เซอร์ของคุณอัตโนมัติ และจะส่งให้ผู้สอนเฉพาะเมื่อคุณกดปุ่ม "ส่งโน้ตนี้ให้ผู้สอน" เท่านั้น ห้ามใส่ชื่อบุคคลหรือข้อมูลลูกค้า</p>
    <div class="notes-layout">
      <div class="notes-editor">
        <input type="text" id="note-title" placeholder="หัวข้อ (ไม่บังคับ)" value="${esc(noteDraft.title)}" />
        <textarea id="note-content" placeholder="พิมพ์บันทึกของคุณที่นี่...">${esc(noteDraft.content)}</textarea>
      </div>
      <aside class="notes-history">
        <h3>ประวัติบันทึกของฉัน (${noteEntries.length})</h3>
        ${historyHtml}
      </aside>
    </div>
  </section>`;
}

function initNotesPage() {
  const titleInput = document.querySelector("#note-title");
  const contentInput = document.querySelector("#note-content");
  if (!titleInput || !contentInput) return;
  titleInput.addEventListener("input", (e) => { noteDraft.title = e.target.value; });
  contentInput.addEventListener("input", (e) => { noteDraft.content = e.target.value; });
  document.querySelector("#note-new").addEventListener("click", noteStartNew);
  document.querySelector("#note-delete").addEventListener("click", noteDelete);
  document.querySelector("#note-save-sheet").addEventListener("click", noteSaveToSheet);
  document.querySelector("#note-save-txt").addEventListener("click", noteSaveAsTxt);
  document.querySelectorAll(".note-history-item").forEach(btn => btn.addEventListener("click", () => noteSelect(Number(btn.dataset.noteId))));
}


// ---- ชื่อผู้เรียน + ส่งข้อมูลไปหลังบ้าน (เฉพาะเมื่อผู้เรียนกดส่งเอง) ----
function studentName() {
  return (localStorage.getItem("gn-student-name") || "").trim();
}

function isValidFullName(name) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

// ทุกอย่างบันทึกในเบราว์เซอร์ก่อนเสมอ; ฟังก์ชันนี้ถูกเรียกเฉพาะตอนผู้เรียนกดปุ่มส่งเท่านั้น (ข้อ 10 ของ Methodology)
// คืนค่า Promise<boolean>: true = หลังบ้านรับแล้ว, false = ยังไม่เชื่อมหลังบ้านหรือส่งไม่สำเร็จ
async function syncToBackend(type, payload) {
  if (!GAS_ENDPOINT) return false;
  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, secret: GAS_SECRET, name: studentName(), ...payload }),
    });
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

const backendReady = () => Boolean(GAS_ENDPOINT);
function sentToast(ok, what) {
  if (ok) toast(`ส่ง${what}ให้ผู้สอนแล้ว`);
  else if (!backendReady()) toast(`บันทึก${what}ในเครื่องของคุณแล้ว (ยังไม่เชื่อมระบบส่งผลให้ผู้สอน)`);
  else toast(`บันทึกในเครื่องแล้ว แต่ส่ง${what}ให้ผู้สอนไม่สำเร็จ ลองกดตรวจ/ส่งใหม่อีกครั้ง`);
}

const CONSENT_TEXT = assessmentIntro.consent;
const consentNoteHtml = () => `<p class="consent-note">🔒 ${esc(CONSENT_TEXT)}</p>`;

// ---- ส่งลิงก์ผลงาน (Notebook / Gem) แทนการอัปโหลดไฟล์ ----
const MAX_LINK_LENGTH = 500;
const linkHistory = () => stored("gn-links", []);

function renderSubmitLinks() {
  const list = linkHistory();
  return `<section><div class="eyebrow">ผลงานของคุณ</div><h1>ส่งลิงก์ผลงาน</h1>
  <p class="lede">ส่งลิงก์ Notebook หรือ Gem ที่คุณสร้างให้ผู้สอนดู ตั้งสิทธิ์แชร์ให้ผู้สอนเปิดได้ก่อน (ปุ่ม แชร์ ในหน้า Notebook หรือ Gem) ไม่มีการอัปโหลดไฟล์ ข้อมูลที่ส่งมีแค่ลิงก์ ประเภท และหมายเหตุที่คุณพิมพ์</p>
  <form id="link-form" class="form-grid">
    ${nameFieldHtml()}
    <div class="field"><label for="link-type">ประเภทผลงาน</label><select id="link-type" name="linkType"><option value="Notebook">Notebook (Gemini Notebook)</option><option value="Gem">Gem</option><option value="Template">การ์ด Prompt Template (ลิงก์ Docs)</option><option value="Other">อื่น ๆ</option></select></div>
    <div class="field full"><label for="link-url">ลิงก์ (ต้องขึ้นต้นด้วย https://)</label><input id="link-url" name="linkUrl" type="url" inputmode="url" placeholder="https://..." maxlength="${MAX_LINK_LENGTH}" required /></div>
    <div class="field full"><label for="link-note">หมายเหตุ (ไม่จำเป็น) — ห้ามใส่ชื่อบุคคลหรือข้อมูลลูกค้า</label><input id="link-note" name="linkNote" maxlength="200" placeholder="เช่น Notebook เปิดตัวเจลตะไคร้ แผนกขาย MT" /></div>
    <div class="full">${consentNoteHtml()}<button class="primary-button" type="submit">ส่งลิงก์ให้ผู้สอน</button></div>
  </form>
  <h2 style="margin-top:36px">ที่คุณส่งไปแล้ว (${list.length})</h2>
  ${list.length ? `<ul class="upload-history-modal-list">${list.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.type)}: ${esc(l.url)}</a><small>${esc(new Date(l.savedAt).toLocaleString("th-TH"))} · ${l.sent ? "ส่งถึงผู้สอนแล้ว" : "บันทึกในเครื่องเท่านั้น"}${l.note ? " · " + esc(l.note) : ""}</small></li>`).join("")}</ul>` : `<p class="muted">ยังไม่ได้ส่งลิงก์ใด ๆ</p>`}
  </section>`;
}

function isSafeHttpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && value.length <= MAX_LINK_LENGTH;
  } catch {
    return false;
  }
}

function showQrModal() {
  const url = location.href.split("#")[0].split("?")[0];
  const canvas = document.createElement("canvas");
  new QRious({ element: canvas, value: url, size: 480, background: "#ffffff", foreground: "#10263f", level: "M" });
  showModal(`<img class="qr-modal-image" src="${canvas.toDataURL()}" alt="QR code สำหรับ ${esc(url)}" /><p class="lede qr-modal-url" style="text-align:center;word-break:break-all">${esc(url)}</p>`);
}

// ---- โหมดผู้สอน (สวิตช์แสดงเมนู ไม่ใช่การล็อกอิน — โค้ดฝั่งเบราว์เซอร์ใครก็อ่านได้) ----
const INSTRUCTOR_FLAG_KEY = "gn-is-instructor";
function isInstructorDevice() { return localStorage.getItem(INSTRUCTOR_FLAG_KEY) === "1"; }
(function initInstructorFlagFromUrl() {
  const flag = new URLSearchParams(location.search).get("instructor");
  if (flag === APP_CONFIG.INSTRUCTOR_URL_FLAG && !isInstructorDevice()) {
    localStorage.setItem(INSTRUCTOR_FLAG_KEY, "1");
    setTimeout(() => toast("เปิดโหมดผู้สอนแล้ว — เมนูผลคะแนน โน้ตผู้สอน และบันทึกการตรวจสอบจะปรากฏ"), 300);
  } else if (flag === "off" && isInstructorDevice()) {
    localStorage.removeItem(INSTRUCTOR_FLAG_KEY);
    setTimeout(() => toast("ปิดโหมดผู้สอนของเครื่องนี้แล้ว"), 300);
  }
})();

// ---- ตารางคะแนนของผู้สอน: ป้องกันด้วยกุญแจผู้สอนที่ผู้สอนพิมพ์เอง (ไม่อยู่ในโค้ดหน้าเว็บ) ----
const INSTRUCTOR_KEY_SESSION = "gn-instructor-key";
const getInstructorKey = () => { try { return sessionStorage.getItem(INSTRUCTOR_KEY_SESSION) || ""; } catch { return ""; } };

function renderScores() {
  if (!isInstructorDevice()) {
    return `<section><div class="eyebrow">ผลคะแนน</div><h1>หน้านี้สำหรับผู้สอนเท่านั้น</h1><p class="lede">ผู้สอนเปิดโหมดผู้สอนด้วยลิงก์ที่ตั้งไว้ใน config.js แล้วกลับมาที่เมนูนี้อีกครั้ง</p></section>`;
  }
  return `<section><div class="eyebrow">ผลคะแนน</div><h1>ตารางคะแนนผู้เรียน</h1>
  <p class="lede">แสดงเฉพาะผลที่ผู้เรียนกดส่งเอง ไม่มีเกณฑ์ผ่านหรือตก ใช้ดูว่าควรทบทวนอะไร</p>
  <form id="scores-key-form" class="form-grid"><div class="field"><label for="scores-key">กุญแจผู้สอน (INSTRUCTOR_KEY จาก Apps Script)</label><input id="scores-key" type="password" autocomplete="off" value="${esc(getInstructorKey())}" /></div><button class="primary-button" type="submit">โหลดผลคะแนน</button></form>
  <div id="scores-container"><p class="muted">ใส่กุญแจผู้สอนแล้วกดโหลด กุญแจจะอยู่ในหน้านี้ชั่วคราวเท่านั้น (ปิดแท็บแล้วหาย)</p></div>
  </section>`;
}

async function loadScores() {
  const container = document.querySelector("#scores-container");
  if (!container) return;
  if (!GAS_ENDPOINT) { container.innerHTML = `<p class="muted">ยังไม่ได้เชื่อมต่อระบบหลังบ้าน (ตั้งค่า GAS_ENDPOINT ใน config.js)</p>`; return; }
  const key = getInstructorKey();
  if (!key) { container.innerHTML = `<p class="muted">กรุณาใส่กุญแจผู้สอน</p>`; return; }
  container.innerHTML = `<p class="muted">กำลังโหลดข้อมูล...</p>`;
  try {
    const res = await fetch(GAS_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: "scores", instructorKey: key }) });
    const data = await res.json();
    if (!data.ok) { container.innerHTML = `<p class="muted">โหลดข้อมูลไม่สำเร็จ: ${esc(data.error || "unknown error")}</p>`; return; }
    if (!data.students.length) { container.innerHTML = `<p class="muted">ยังไม่มีผู้เรียนส่งผลเลย</p>`; return; }
    const rows = data.students.map((s, i) => `<tr>
      <td>${i + 1}</td><td>${esc(s.name)}</td>
      <td>${s.quizPre ? `${s.quizPre.score}/${s.quizPre.total}` : "-"}</td>
      <td>${s.quizPost ? `${s.quizPost.score}/${s.quizPost.total}` : "-"}</td>
      <td>${s.labsPassed}/${s.labsTotal}</td>
      <td>${s.tracks && s.tracks.length ? esc(s.tracks.join(", ")) : "-"}</td>
      <td>${s.links}</td>
    </tr>`).join("");
    container.innerHTML = `<div class="agenda-table-wrap"><table class="agenda-table scores-table">
      <thead><tr><th>#</th><th>ชื่อผู้เรียน</th><th>Quiz ก่อนเรียน</th><th>Quiz หลังเรียน</th><th>Lab ที่ตรวจครบ</th><th>Workshop ที่ส่ง</th><th>ลิงก์ผลงาน</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  } catch {
    container.innerHTML = `<p class="muted">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</p>`;
  }
}

// ---- ห้องแชตของคลาส: ใช้ Google Chat (เปิดในแท็บใหม่) แทนแชตในแอป ----
function openChat() {
  const url = APP_CONFIG.CHAT_URL;
  if (!url || !/^https:\/\/chat\.google\.com\//.test(url)) { toast("ยังไม่ได้ตั้งค่าลิงก์ห้องแชต ติดต่อผู้สอน"); return; }
  toast("เปิดห้อง Google Chat ในแท็บใหม่ · ห้ามพิมพ์ชื่อบุคคลอื่นหรือข้อมูลลูกค้า");
  window.open(url, "_blank", "noopener,noreferrer");
}

// ================= หน้าจอและเนื้อหา =================
function navCollapsibleGroup(key, label, linksHtml) {
  // เริ่มยุบทุกครั้งที่โหลดหน้าใหม่ (ไม่จำข้ามการเข้าใช้)
  return `
    <button type="button" class="nav-group-label nav-group-toggle" data-nav-group="${key}" aria-expanded="false">
      <span>${esc(label)}</span>
      <span class="nav-group-chevron">▾</span>
    </button>
    <div class="nav-group-collapse collapsed" data-nav-group-panel="${key}">
      <div class="nav-group-collapse-inner">${linksHtml}</div>
    </div>`;
}

function renderNav() {
  const chapterLinks = chapters.map(c => `<button class="nav-link" data-view="chapter" data-id="${c.id}"><span class="nav-number">${c.number}</span>${esc(c.title)}</button>`).join("");
  const labLinks = exercisesData.map(e => `<button class="nav-link" data-view="lab" data-id="${e.id}"><span class="nav-number">L${e.id}</span>${esc(e.title)}</button>`).join("");
  const instructorLinks = `
    <button class="nav-link" data-view="scores"><span class="nav-number">📊</span>ผลคะแนนผู้เรียน</button>
    ${instructorDataLoaded() ? `<button class="nav-link" data-view="traps"><span class="nav-number">🔑</span>เฉลยกับดัก (ผู้สอน)</button>` : ""}
    <button class="nav-link" data-view="verify"><span class="nav-number">✔</span>บันทึกการตรวจสอบ</button>`;
  document.querySelector("#chapter-nav").innerHTML = `
    <div class="nav-group-label">ห้องเรียน</div>
    <button class="nav-link" data-view="agenda"><span class="nav-number">📅</span>หน้าสรุป · Agenda</button>
    <button class="nav-link" data-view="slides-resume"><span class="nav-number">▤</span>สไลด์บรรยาย (${slidesData.length} แผ่น)</button>
    <button class="nav-link" data-view="prompts"><span class="nav-number">❝</span>คลังคำสั่ง (Prompt)</button>
    <button class="nav-link" data-view="whiteboard"><span class="nav-number">🖊️</span>Whiteboard</button>
    <button class="nav-link" data-view="notes"><span class="nav-number">📝</span>Note</button>
    ${navCollapsibleGroup("chapters", `คู่มือผู้เรียน · ${chapters.length} บท`, chapterLinks)}
    ${navCollapsibleGroup("labs", `แบบฝึกหัด · Lab 0-${exercisesData.length - 1}`, labLinks)}
    <button class="nav-link" data-view="workshop"><span class="nav-number">★</span>Part 3 · Workshop แผนก</button>
    <div class="nav-group-label">วัดผลและทรัพยากร</div>
    <button class="nav-link" data-view="assessment"><span class="nav-number">✎</span>แบบทดสอบและความมั่นใจ</button>
    <button class="nav-link" data-view="submit"><span class="nav-number">🔗</span>ส่งลิงก์ผลงาน</button>
    <button class="nav-link" data-view="certificate"><span class="nav-number">🏅</span>เกียรติบัตร</button>
    <button class="nav-link" data-view="datafiles"><span class="nav-number">⇩</span>ไฟล์ฝึกปฏิบัติ</button>
    ${isInstructorDevice() ? navCollapsibleGroup("instructor", "ผู้สอน", instructorLinks) : ""}
  `;
  document.querySelectorAll(".nav-group-toggle").forEach(btn => btn.addEventListener("click", () => {
    const key = btn.dataset.navGroup;
    const panel = document.querySelector(`[data-nav-group-panel="${key}"]`);
    const collapsed = panel.classList.toggle("collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
  }));
}

function labsPassedCount() {
  return exercisesData.filter(e => {
    const data = stored(`gn-selfcheck-exercise-${e.id}`, null);
    return data && data.results.length && data.results.every(Boolean);
  }).length;
}

function renderHome() {
  const done = completed().length;
  const labDone = labsPassedCount();
  const cards = [
    ["agenda", null, "📅", "หน้าสรุปภาพรวม", "จุดประสงค์การเรียนรู้ ไทม์ไลน์ 180 นาที สิ่งที่ต้องเตรียม และข้อจำกัดของเครื่องมือ"],
    ["slides", null, "▤", "สไลด์บรรยาย", `${slidesData.length} แผ่นตามช่วงเวลา แผ่นที่ข้ามได้เมื่อเวลาไม่พอจะติดป้ายไว้`],
    ["lab", "0", "✎", `แบบฝึกหัด Lab 0-${exercisesData.length - 1}`, `ลงมือทำใน Gemini และ Gemini Notebook จริง พร้อมตรวจตัวเลขกับค่าอ้างอิง · ตรวจครบแล้ว ${labDone}/${exercisesData.length}`],
    ["workshop", null, "★", "Part 3 · Workshop แผนก", "ทำ Master Prompt → Notebook → Studio Artifacts กับงานแผนกตัวเอง 6 โจทย์ นำเสนอกลุ่ม และ Practical Check"],
    ["prompts", null, "❝", "คลังคำสั่ง (Prompt)", "การ์ด Prompt Template 6 แผนก และคำสั่งตั้งต้นของ Gem พร้อมปุ่มคัดลอก"],
    ["assessment", null, "✓", "แบบทดสอบและความมั่นใจ", "Post-test 5 ข้อในคลาส (ชุดเต็ม 12 ข้อก่อนเรียนได้) ไม่มีเกณฑ์ผ่านหรือตก"],
    ["certificate", null, "🏅", "เกียรติบัตรเข้าร่วมอบรม", "ทำ Post-test และแบบประเมินหลังเรียนแล้ว ดาวน์โหลดเกียรติบัตรเป็น PDF ได้ทันที"],
    ["datafiles", null, "⇩", "ไฟล์ฝึกปฏิบัติ", "ชุดเอกสารสมมติ 12 ไฟล์ของบริษัท ไร้ควันพันล้าน"],
    ["submit", null, "🔗", "ส่งลิงก์ผลงาน", "ส่งลิงก์ Notebook และ Gem ที่คุณสร้างให้ผู้สอน (ส่งเมื่อคุณกดเอง)"],
  ];
  return `<section class="hero" id="start"><div>${venueBadgeHtml()}<div class="eyebrow">คลาส 3 ชั่วโมง · ${esc(APP_CONFIG.COMPANY_LABEL)}</div><h1>เตรียมด้วย Gemini<br>ทำงานต่อด้วย Gemini Notebook</h1><p class="lede">เรียนแบบลงมือทำ 70%: ตั้งโจทย์ ปิดชื่อบุคคล จัดโครงสร้างเอกสาร แล้วสร้าง Notebook ถามตอบพร้อมอ้างอิง เป้าหมายไม่ใช่จำทุกปุ่ม แต่คือได้ขั้นตอนที่เชื่อถือได้และตรวจสอบได้ เพื่อประหยัดเวลาในงานเอกสารประจำสัปดาห์ (Gemini Notebook เดิมชื่อ NotebookLM)</p><div class="hero-meta"><span class="tag">${chapters.length} บทเรียน · 3 Part</span><span class="tag">${slidesData.length} สไลด์</span><span class="tag">Lab 0-${exercisesData.length - 1} + Workshop</span><span class="tag">ผลงาน 3 ชิ้น</span><span class="tag">เกียรติบัตร</span><span class="tag">ไม่มีเกณฑ์ผ่าน/ตก</span></div><div class="progress-wrap"><div class="progress-label"><span>ความคืบหน้าบทเรียนคู่มือ</span><span>${done} / ${chapters.length} บท</span></div><div class="progress"><i style="width:${done / chapters.length * 100}%"></i></div></div></div><div class="hero-mark" aria-hidden="true"><div class="hero-mark-flow"><span>Gemini</span><b>→</b><span>Notebook</span></div><small>เตรียม → ทำงาน → ตรวจ</small></div></section>
  <section><div class="eyebrow">ห้องเรียนของคุณ</div><h2>ทุกอย่างที่ใช้ในคลาสอยู่ในที่เดียว</h2>
  <div class="workspace-grid">${cards.map(([view, id, icon, title, desc]) => `<button class="workspace-card" data-view="${view}" ${id !== null ? `data-id="${id}"` : ""}><span class="workspace-icon">${icon}</span><strong>${esc(title)}</strong><small>${esc(desc)}</small></button>`).join("")}</div></section>
  <section class="home-grid"><div><div class="eyebrow">เริ่มจากบทเรียน</div><h2>เรียนทีละบท แล้วลองกับงานของตัวเอง</h2><p style="margin:-4px 0 16px">${pdfDownloadButtonHtml()}</p><div class="chapter-list">${chapters.map(c => `<button class="chapter-row" data-view="chapter" data-id="${c.id}"><span class="number">${c.number}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.intro)}</small></span><span class="row-arrow">→</span></button>`).join("")}</div></div><div><div class="eyebrow">จำไว้ก่อนเริ่ม</div><h2>หกข้อที่ต้องติดตัว</h2>${principles.map(p => `<article class="principle"><strong>${esc(p[0])}</strong><p>${esc(p[1])}</p></article>`).join("")}</div></section>`;
}

const pdfDownloadButtonHtml = () => `<button type="button" class="ghost-button pdf-download-btn" data-action="download-handbook-pdf">⬇ ดาวน์โหลด PDF คู่มือผู้เรียน (ทั้งเล่ม)</button>`;

function renderChapter(id) {
  const c = chapters.find(item => item.id === id) || chapters[0];
  const isDone = completed().includes(c.id);
  return `<section class="chapter-header"><div><div class="eyebrow">${esc(c.part || "")} · บทที่ ${c.number} · ${esc(c.lo)}</div><h1>${esc(c.title)}</h1><p class="lede">${esc(c.intro)}</p>${pdfDownloadButtonHtml()}</div><div class="chapter-no">CHAPTER ${c.number}</div></section>
  <section class="content-grid"><div><div class="learning"><h3>เมื่อจบบทนี้ คุณจะทำสิ่งเหล่านี้ได้</h3><ul>${c.outcomes.map(item => `<li>${esc(item)}</li>`).join("")}</ul></div><h3>${esc(c.conceptTitle)}</h3><p>${esc(c.concept)}</p><h3>ขั้นตอนที่ต้องทำให้คล่อง</h3><ol class="steps">${c.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>${table(c.table)}<div class="trap"><strong>กับดักของบทนี้</strong><br>${esc(c.trap)}</div><div class="checklist"><label class="check-item ${isDone ? "done" : ""}"><input class="chapter-check" data-id="${c.id}" type="checkbox" ${isDone ? "checked" : ""}><span>ฉันเรียนและลองทำ Lab ของบทนี้แล้ว</span></label></div><p><button class="ghost-button" data-view="lab" data-id="${esc(c.lab)}">ไปที่ Lab ${esc(c.lab)} →</button></p><div class="quiz"><div class="eyebrow">ทดสอบตัวเอง</div><h3>${esc(c.quiz)}</h3><button class="reveal-answer">แสดงแนวคำตอบ</button><div class="quiz-answer">${esc(c.answer)}</div></div></div><aside class="side-note"><strong>ก่อนใช้คำตอบของ AI ทุกครั้ง</strong>คลิกดูอ้างอิง เทียบกับต้นทางจริง และถามว่าถ้าผิด ใครเสียหาย</aside></section>`;
}

function renderPlan() {
  const fields = stored("gn-plan", {});
  const day = (title, copy, items) => `<article class="week"><div class="eyebrow">${title}</div><p>${copy}</p><ul class="plain-list">${items.map(i => `<li>${i}</li>`).join("")}</ul></article>`;
  return `<section><div class="eyebrow">หลังจบคลาส</div><h1>แผนนำไปใช้ภายใน 7 วัน</h1><p class="lede">เลือกงานที่ทำซ้ำทุกสัปดาห์และกินเวลาเกิน 30 นาที เพราะวัดผลง่าย ไม่ต้องเริ่มจากงานใหญ่ที่สุด</p><div class="plan-grid">${day("วันที่ 1-2", "เตรียมของ", ["เลือกงานซ้ำ 1 งาน", "เตรียมไฟล์ตัวอย่างที่ปิดชื่อแล้ว", "เปิดการ์ดของแผนกจากคลังคำสั่ง"])}${day("วันที่ 3-4", "ทำจริงหนึ่งรอบ", ["สร้าง Notebook 1 อัน", "ตรวจอ้างอิงและตัวเลข", "จดเวลาที่ใช้"])}${day("วันที่ 5-6", "ใช้ในงานจริง", ["ใช้ผลลัพธ์ในงานที่ต้องส่ง", "จับเวลาเทียบกับวิธีเดิม", "จดข้อที่ AI ตอบผิดหรือขัดกัน"])}${day("วันที่ 7", "สรุปและแชร์", ["จดเวลาที่ประหยัด", "แชร์ Gem หรือ Notebook กับทีม (ถ้านโยบายอนุญาต)", "ทำแบบติดตาม 7 วัน"])}</div>
  <h2>งานจริงที่คุณจะเริ่ม</h2><form id="plan-form" class="form-grid"><div class="field full"><label for="project">งานที่ฉันจะทำใหม่ด้วย Gemini + Gemini Notebook คือ (ไม่ต้องใส่ชื่อบุคคล)</label><input id="project" name="project" value="${esc(fields.project || "")}" placeholder="เช่น สรุปประชุมทีมขายรายสัปดาห์" /></div><div class="field"><label for="minutes">ปกติงานนี้ใช้เวลา (นาที)</label><input id="minutes" name="minutes" inputmode="numeric" value="${esc(fields.minutes || "")}" /></div><div class="field"><label for="source">เอกสารต้นทางอยู่ที่ไหน</label><input id="source" name="source" value="${esc(fields.source || "")}" /></div><div class="field"><label for="start">วันที่เริ่มลงมือ</label><input id="start" name="start" type="date" value="${esc(fields.start || "")}" /></div><div class="field"><label for="support">คนที่ฉันจะบอก</label><input id="support" name="support" value="${esc(fields.support || "")}" /></div><button class="primary-button" type="submit">บันทึกแผนของฉัน (ในเครื่องนี้)</button></form></section>`;
}

function renderPrompts() {
  return `<section><div class="eyebrow">คลังคำสั่ง</div><h1>Prompt Template ของแต่ละแผนก</h1><p class="lede">เติมช่อง [ ] ให้ตรงงานของคุณแล้วกดคัดลอก ใช้กับไฟล์ที่ปิดชื่อบุคคลแล้วเท่านั้น ทุกการ์ดใช้กติกาเดียวกัน: ห้ามให้ AI เดาตัวเลข และตรวจการอ้างอิงเสมอ</p>
  <article class="card-block"><h2>Master Prompt (Part 1) · ใช้กับเอกสารที่ปิดชื่อแล้ว</h2><p>Clean → Categorize → Format → Outline โดยห้ามตัดตัวเลข วันที่ มติ และข้อความที่ขัดกัน ปรับบทบาทให้เป็นแผนกของคุณ</p>${promptBlock(labPrompts.MP.label, labPrompts.MP.text)}</article>
  ${promptCards.map(c => `<article class="card-block"><h2>${esc(c.dept)}</h2><p><strong>งาน:</strong> ${esc(c.task)}</p><p><strong>ไฟล์ที่ต้องมี:</strong> ${esc(c.files)}</p>${promptBlock("Prompt Template (5 ช่อง)", c.lines.join("\n"))}<div class="trap"><strong>วิธีตรวจก่อนนำไปใช้</strong><br>${esc(c.check)}</div><div class="trap trap-red"><strong>ห้ามใส่ข้อมูลจริง</strong><br>${esc(c.red)} และชื่อบุคคลทุกกรณี ต้องแทนด้วยรหัสก่อน</div></article>`).join("")}
  <article class="card-block"><h2>คำสั่งตั้งต้นสำหรับ Gem (Lab 3)</h2><p>วางในช่อง Instructions ของ Gem แล้วแก้ช่อง [ ] ให้ตรงแผนก</p>${promptBlock("Gem Instructions", gemInstructions.join("\n"))}<div class="trap trap-red"><strong>ข้อจำกัด</strong><br>การเตือนเรื่องชื่อบุคคลใน Gem เป็นตัวช่วยเตือน ไม่ใช่มาตรการป้องกัน ชื่อที่วางเข้าไปแล้วก็เข้า AI แล้ว ผู้ใช้ต้องปิดชื่อก่อนเสมอ</div></article></section>`;
}

function renderTroubleshoot() {
  return `<section><div class="eyebrow">คู่มือแก้ปัญหา</div><h1>เปิดหน้านี้ทุกครั้งที่ติด</h1><p class="lede">ก่อนแก้ ให้แยกก่อนว่าเป็นปัญหาสิทธิ์/ฟีเจอร์ (ต้องแจ้งแอดมิน) หรือปัญหาการใช้งาน (แก้เองได้)</p>
  ${table([["อาการ", "สาเหตุที่พบบ่อย", "ทำอย่างไร"],
    ["ไม่เห็น Gemini Notebook หรือเข้าไม่ได้", "แอดมินยังไม่เปิดสิทธิ์ หรือใช้บัญชีส่วนตัว", "ตรวจว่าใช้บัญชีองค์กร แจ้งผู้สอนเพื่อส่งแอดมิน แล้วจับคู่ดูจอเพื่อน"],
    ["ไม่เห็นเมนู Gems หรือ Notebooks ในแอป Gemini", "ขึ้นกับรุ่น Workspace และการตั้งค่าของแอดมิน (Notebooks in Gemini เพิ่งทยอยเปิด)", "ทำการ์ด Prompt Template แทน แล้วแจ้งแอดมิน"],
    ["เพิ่มแหล่งจาก Drive ไม่ได้", "ไฟล์เป็น .docx/.xlsx ที่ยังไม่แปลงเป็น Google Docs/Sheets หรือไม่มีสิทธิ์ไฟล์", "เปิดด้วย Google Docs/Sheets ก่อน หรืออัปโหลดตรง หรือวางข้อความเป็นแหล่ง"],
    ["Notebook ตอบเรื่องที่ไม่มีในเอกสาร", "ตั้งคำถามกว้าง หรือแหล่งข้อมูลไม่ตรงคำถาม", "ทดสอบขอบเขตอีกครั้ง สั่งว่า 'ถ้าไม่มีในแหล่งข้อมูลให้ตอบว่าไม่พบ อย่าเดา'"],
    ["คำตอบมีอ้างอิงแต่ตัวเลขไม่ตรงต้นฉบับ", "AI สรุปผิด หรืออ้างส่วนที่ไม่ใช่", "คลิกอ้างอิงดูต้นฉบับ แก้เป็นค่าจากต้นฉบับ และคำนวณใน Sheets เมื่อเป็นตัวเลขรวม"],
    ["แหล่งข้อมูลขัดกันเอง", "เอกสารหลายฉบับ ไม่ได้ระบุว่าฉบับไหนใช้จริง", "ให้ Notebook แสดงเป็นตาราง ดูวันที่และสถานะ ถามผู้รับผิดชอบเมื่อหลักฐานไม่พอ"],
    ["พบชื่อบุคคลหลุดในแหล่งข้อมูล", "แทนชื่อไม่ครบ หรือสะกดคลาดเคลื่อน", "หยุดใช้ไฟล์นั้น ปิดชื่อใหม่ ค้นหา 'คุณ' 'พี่' 'น้อง' แยกผลบวกลวง แล้วลบ Notebook เดิมถ้าใส่ไปแล้ว"],
    ["ใช้โควตาสร้างสื่อเต็ม", "โควตาต่อวันตามแผน", "ใช้ Briefing + Mind Map ที่เป็นแกนหลัก ทำสื่ออื่นวันถัดไป"]])}</section>`;
}

// ---- หน้าสรุปภาพรวม (ข้อ 7 ของ Methodology) ----
function slideNumberFromTimeline(s) { return s; }

function renderAgendaPage() {
  const total = courseTimeline.reduce((a, r) => a + r.minutes, 0);
  const rows = courseTimeline.map(r => {
    const slideCell = r.slide ? `<button type="button" class="link-button" data-view="slides" data-id="${r.slide}">สไลด์ ${r.slide}+</button>` : "";
    const labCell = r.lab === "W" ? `<button type="button" class="link-button" data-view="workshop">Workshop</button>` : (r.lab ? `<button type="button" class="link-button" data-view="lab" data-id="${r.lab.split("-")[0]}">Lab ${esc(r.lab)}</button>` : "");
    return `<tr class="${r.brk ? "agenda-break-row" : "agenda-hour-row"}"><td class="agenda-duration-cell"><strong>${esc(r.clock)}</strong><br><small>${r.minutes} นาที · นาทีที่ ${esc(r.start)}–${esc(r.end)}</small></td><td><strong>${esc(r.block)}</strong>${r.lo ? `<br><small class="muted">${esc(r.lo)}</small>` : ""}</td><td>${esc(r.activity)}</td><td>${slideCell} ${labCell}</td></tr>`;
  }).join("");
  return `<section><div class="eyebrow">หน้าสรุปภาพรวม</div><h1>Class Agenda</h1><p class="lede"><strong>${esc(classSchedule.date)} เวลา ${esc(classSchedule.time)}</strong> (${esc(classSchedule.note)})<br>ไทม์ไลน์คลาส 3 ชั่วโมงแบบนาทีต่อนาที (รวม ${total} นาทีพอดี รวมพัก 10 นาที) ส่วนที่เป็น 'เสริม' ไม่นับในเวลาคลาส ทำต่อที่บ้านหรือเมื่อเวลาเหลือ</p>${venueBadgeHtml()}
  <h2 style="margin-top:28px">จุดประสงค์การเรียนรู้</h2><ol class="steps lo-list">${learningObjectives.map(l => `<li><strong>${esc(l.id)}</strong> ${esc(l.text)}</li>`).join("")}</ol>
  <h2 style="margin-top:32px">ไทม์ไลน์ 180 นาที (13:30–16:30)</h2>
  <div class="agenda-table-wrap"><table class="agenda-table"><thead><tr><th>เวลา</th><th>ช่วง</th><th>กิจกรรม</th><th>ไปที่</th></tr></thead><tbody>${rows}</tbody></table></div>
  <h3 style="margin-top:24px">ส่วนเสริม (ไม่นับเวลาคลาส)</h3><ul>${optionalItems.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
  <h2 style="margin-top:32px">สิ่งที่ต้องเตรียมก่อนคลาส</h2>
  <div class="checklist-grid">${[["แอดมิน IT", preClassChecklist.admin], ["ผู้สอน", preClassChecklist.instructor], ["ผู้เรียน", preClassChecklist.learner]].map(([h, items]) => `<article class="checklist-card"><strong>${esc(h)}</strong><ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></article>`).join("")}</div>
  <h2 style="margin-top:32px">ข้อจำกัดของเครื่องมือที่ต้องรู้ล่วงหน้า</h2>${table([["หัวข้อ", "ข้อจำกัดจริง", "ผลต่อคลาส / แผนสำรอง"], ...toolLimits])}
  <p class="muted" style="margin-top:12px">ตรวจกับแหล่งของ Google เมื่อ 19 ก.ย. 2569 ดูสถานะการตรวจสอบและจุดที่ปรับจากแผนเดิมได้ในโหมดผู้สอน</p>
  </section>`;
}

// ---- สไลด์ ----
const slideRow = (s) => `<button class="chapter-row" data-view="slides" data-id="${s.n}"><span class="number">${s.n}</span><span><strong>${esc(s.title)}</strong>${s.skippable ? `<small>ข้ามได้เมื่อเวลาไม่พอ (เสริม)</small>` : ""}</span><span class="row-arrow">→</span></button>`;

function slideBlocks() {
  const order = [];
  slidesData.forEach(s => { if (!order.includes(s.session)) order.push(s.session); });
  return order.map(name => ({ name, slides: slidesData.filter(s => s.session === name) }));
}

function renderSlides(id) {
  const n = parseInt(id, 10);
  const slide = slidesData.find(s => s.n === n);
  if (slide) save("gn-last-slide", n);
  if (!slide) {
    return `<section><div class="eyebrow">ห้องเรียน</div><h1>สไลด์บรรยาย ${slidesData.length} แผ่น</h1><p class="lede">จัดตามช่วงเวลาของคลาสจริง แผ่นที่ติดป้าย "ข้ามได้" คืออ่านเองที่บ้านได้ ไม่นับเวลาแกนหลัก</p>
    <button class="primary-button" data-view="slide-start" style="margin-bottom:28px">▶ เริ่มดูตั้งแต่แผ่นที่ 1</button>
    ${slideBlocks().map(b => `<h2 style="margin-top:32px">${esc(b.name)}</h2><div class="chapter-list">${b.slides.map(slideRow).join("")}</div>`).join("")}</section>`;
  }
  const idx = slidesData.findIndex(s => s.n === n);
  const prev = slidesData[idx - 1];
  const next = slidesData[idx + 1];
  const jump = `<select id="slide-jump" class="slide-jump">${slideBlocks().map(b => `<optgroup label="${esc(b.name)}">${b.slides.map(s => `<option value="${s.n}" ${s.n === n ? "selected" : ""}>${s.n}. ${esc(s.title)}</option>`).join("")}</optgroup>`).join("")}</select>`;
  const notes = isInstructorDevice() && instructorDataLoaded() ? (instructorNotes[String(n)] || "") : "";
  return `<section class="slide-deck">
    <div class="slide-toolbar">
      <button class="ghost-button" data-view="slides">← สารบัญสไลด์</button>
      <div class="slide-quick-nav">
        <button type="button" class="slide-arrow-btn" data-view="slides" data-id="${prev ? prev.n : slide.n}" ${prev ? "" : "disabled"} aria-label="แผ่นก่อนหน้า">‹</button>
        <span class="slide-counter">สไลด์ ${slide.n} / ${slidesData.length}</span>
        <button type="button" class="slide-arrow-btn" data-view="slides" data-id="${next ? next.n : slide.n}" ${next ? "" : "disabled"} aria-label="แผ่นถัดไป">›</button>
      </div>
      ${jump}
    </div>
    <div class="slide-context">${esc(slide.session)}${slide.skippable ? " · ข้ามได้เมื่อเวลาไม่พอ" : ""}</div>
    <div class="slide-card"><h1>${esc(slide.title)}</h1><div class="slide-body">${slide.bodyHtml}</div></div>
    <div class="slide-nav-buttons">
      <button class="ghost-button" data-view="slides" data-id="${prev ? prev.n : slide.n}" ${prev ? "" : "disabled"}>← แผ่นก่อนหน้า</button>
      ${notes ? `<button type="button" class="reveal-btn notes-toggle-btn" data-open="แสดงโน้ตผู้สอน" data-close="ซ่อนโน้ตผู้สอน">แสดงโน้ตผู้สอน</button>` : "<span></span>"}
      <button class="primary-button" data-view="slides" data-id="${next ? next.n : slide.n}" ${next ? "" : "disabled"}>แผ่นถัดไป →</button>
    </div>
    ${notes ? `<div class="reveal-panel notes-panel">${notes}</div>` : ""}
  </section>`;
}


// ---- ตรวจการบ้านด้วยตัวเลขจริง (validate กับค่าอ้างอิง ไม่ใช่แค่ทำเสร็จ) ----
function parseExpectedNumber(text) {
  const m = /^([\d,]+(?:\.\d+)?)/.exec(String(text).trim());
  if (!m) return null;
  return { num: parseFloat(m[1].replace(/,/g, "")), unit: text.slice(m[0].length).trim() };
}

function selfCheckBlock(kind, id, checkRows) {
  const key = `gn-selfcheck-${kind}-${id}`;
  const rows = checkRows.slice(1);
  const items = rows.map(r => ({ label: r[0], expected: r[1], parsed: parseExpectedNumber(r[1]) }));
  const existing = stored(key, null);
  if (existing) {
    const correct = existing.results.filter(Boolean).length;
    const allPass = correct === items.length;
    return `<div class="selfcheck-result ${allPass ? "pass" : ""}">
      <p><strong>ผลตรวจสอบของคุณ:</strong> ${correct} / ${items.length} ข้อตรงตามเกณฑ์ ${allPass ? "— ผ่านครบทุกข้อ ✓" : "— ข้อที่ไม่ตรง แปลว่าคำตอบของ AI หรือการอ่านของคุณคลาดเคลื่อน ให้กลับไปคลิกอ้างอิงตรวจต้นฉบับ"}</p>
      <ol class="steps">${items.map((it, i) => `<li>${esc(it.label)}${it.parsed ? ` — คุณกรอก <strong>${esc(existing.inputs[i] || "-")}</strong>` : ""} ${existing.results[i] ? "✓" : `✗ <span class="muted">(ค่าอ้างอิง: ${esc(it.expected)})</span>`}</li>`).join("")}</ol>
      <button type="button" class="ghost-button" data-action="retake-selfcheck" data-key="${key}">ตรวจใหม่</button>
    </div>`;
  }
  return `<form class="selfcheck-form" data-selfcheck="${key}">
    ${nameFieldHtml()}
    ${items.map((it, i) => it.parsed
      ? `<div class="selfcheck-row"><label>${esc(it.label)}</label><div class="selfcheck-input-wrap"><input type="text" inputmode="decimal" name="v${i}" data-expected="${it.parsed.num}" placeholder="กรอกค่าที่คุณตรวจแล้ว" required /><span class="selfcheck-unit">${esc(it.parsed.unit)}</span></div></div>`
      : `<label class="choice-row selfcheck-confirm"><input type="checkbox" name="v${i}" required /><span>${esc(it.label)}</span></label>`
    ).join("")}
    ${consentNoteHtml()}
    <button class="primary-button" type="submit" style="margin-top:12px">ตรวจคำตอบของฉัน และส่งผลให้ผู้สอน</button>
  </form>`;
}

function renderLab(id) {
  const idx = exercisesData.findIndex(e => e.id === parseInt(id, 10));
  const e = exercisesData[idx] || exercisesData[0];
  const prev = exercisesData[idx - 1];
  const next = exercisesData[idx + 1];
  const files = e.folder ? zipLink(e.folder, "ดาวน์โหลดไฟล์ประกอบ Lab นี้") : "";
  return `<section class="chapter-header"><div><div class="eyebrow">Lab ${e.id} · ${esc(e.time)}</div><h1>${esc(e.title)}</h1><p class="lede">${esc(e.hour)}</p></div><div class="chapter-no">LAB ${e.id}</div></section>
  <section class="content-grid"><div>
  <p><strong>ไฟล์ที่ใช้:</strong> ${esc(e.files)} ${files}</p>
  <h3>ขั้นตอน</h3>
  <ol class="steps">${e.tasks.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
  ${e.prompts && e.prompts.length ? `<h3>Prompt ที่ใช้ (กดคัดลอก)</h3>${e.prompts.map(pid => labPrompts[pid] ? promptBlock(labPrompts[pid].label, labPrompts[pid].text) : "").join("")}` : ""}
  ${e.hint ? `<div class="side-note" style="position:static;margin:20px 0"><strong>คำใบ้</strong>${esc(e.hint)}</div>` : ""}
  <h3>ตรวจการบ้านของคุณ</h3>
  <p class="lede" style="font-size:14px">กรอกค่าที่คุณเห็นจากต้นฉบับหรือที่ตรวจแล้วจริง ๆ ระบบเทียบกับค่าอ้างอิงของชุดเอกสารสมมติ ถ้า AI ตอบไม่ตรง แปลว่าต้องกลับไปตรวจอ้างอิง</p>
  ${table(e.checks)}
  ${selfCheckBlock("exercise", e.id, e.checks)}
  ${e.checksOptional ? `<h4 style="margin-top:28px">ส่วนเสริม</h4>${table(e.checksOptional)}${selfCheckBlock("exercise", `${e.id}b`, e.checksOptional)}` : ""}
  <div class="trap trap-plan"><strong>แผนสำรอง (Plan B)</strong><br>${esc(e.planB)}</div>
  ${e.challenge && e.challenge.length ? `<h3>ข้อท้าทายเพิ่มเติม</h3><ul>${e.challenge.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
  ${e.pitfalls && e.pitfalls.length ? `<div class="trap"><strong>จุดที่ผู้เรียนพลาดบ่อย</strong><ul style="margin:8px 0 0;padding-left:18px">${e.pitfalls.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
  <div class="exercise-pager">
    ${prev ? `<button class="ghost-button" data-view="lab" data-id="${prev.id}">← Lab ${prev.id}</button>` : "<span></span>"}
    ${next ? `<button class="primary-button" data-view="lab" data-id="${next.id}">Lab ${next.id} →</button>` : `<button class="primary-button" data-view="workshop">ไป Part 3: Workshop →</button>`}
  </div>
  </div><aside class="side-note"><strong>กติกา 3 ข้อของทุก Lab</strong>1) ชื่อบุคคลไม่เข้า AI ปิดที่ต้นทางก่อน<br>2) คลิกอ้างอิงตรวจก่อนใช้คำตอบ<br>3) ตัวเลขเงินเทียบต้นทางหรือ Sheets เสมอ</aside></section>`;
}

function renderWorkshop(id) {
  const w = workshopData;
  const trackId = id || stored("gn-last-track", w.tracks[0].id);
  const t = w.tracks.find(x => x.id === trackId) || w.tracks[0];
  save("gn-last-track", t.id);
  const groupTabs = w.groups.map(([gname, gdesc, ids]) => `<div class="ws-group"><strong>${esc(gname)}</strong><small>${esc(gdesc)}</small><div class="tab-row">${ids.map(tid => { const x = w.tracks.find(y => y.id === tid); return `<button class="tab-btn ${x.id === t.id ? "active" : ""}" data-view="workshop" data-id="${x.id}">${esc(x.dept)}</button>`; }).join("")}</div></div>`).join("");
  return `<section class="chapter-header"><div><div class="eyebrow">${esc(w.meta)}</div><h1>${esc(w.title)}</h1><p class="lede">${esc(w.subtitle)}</p></div><div class="chapter-no">PART 3</div></section>
  <section class="content-grid"><div>
  <h3>สถานการณ์สมมติ</h3><p>${esc(w.scenario)}</p>
  <div class="trap"><strong>ภารกิจ</strong><br>${esc(w.mission)}</div>
  <h3>ลงมือทำ 28 นาที: 5 ขั้น</h3><ol class="steps">${w.steps.map(([h, b]) => `<li><strong>${esc(h)}</strong><br>${esc(b)}</li>`).join("")}</ol>
  <h3>เลือกสายงานและแผนกของคุณ</h3>
  ${groupTabs}
  <article class="card-block"><h2>โจทย์: ${esc(t.dept)}</h2><p><strong>งานและ Deliverable:</strong> ${esc(t.task)}</p><p><strong>แหล่งข้อมูล:</strong> ${esc(t.sources)} <small class="muted">(ไฟล์ที่มี * ต้องลบชื่อก่อน)</small></p><p><strong>ผลลัพธ์ที่ต้องได้:</strong></p><ul>${t.deliverables.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
  <p><button class="ghost-button" data-view="prompts">เปิดการ์ด Prompt ของแผนก →</button></p></article>
  <h3>ตรวจตัวเลขของแผนก (${esc(t.dept)})</h3>
  <p class="lede" style="font-size:14px">กรอกค่าที่คุณตรวจแล้วจากต้นฉบับ ระบบเทียบกับค่าอ้างอิง</p>
  ${table(t.checks)}
  ${selfCheckBlock("workshop", t.id, t.checks)}
  <h3 style="margin-top:32px">นำเสนอกลุ่ม 15 นาที</h3>
  <ul>${w.presentation.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
  <h3 style="margin-top:32px">Practical Check: เช็กลิสต์ 6 ข้อ (ติ๊กเอง แล้วให้เพื่อนตรวจไขว้)</h3>
  ${selfCheckBlock("workshop", "practical", w.practical)}
  <h4>ระดับความพร้อม (ไม่มีผ่านหรือตก)</h4>${table(w.levels)}
  <div class="trap trap-plan"><strong>แผนสำรอง (Plan B)</strong><br>${esc(w.planB)}</div>
  <div class="exercise-pager"><button class="ghost-button" data-view="lab" data-id="${exercisesData.length - 1}">← Lab ${exercisesData.length - 1}</button><button class="primary-button" data-view="assessment">ไปแบบทดสอบ →</button></div>
  </div><aside class="side-note"><strong>ก่อนเริ่ม Workshop</strong>ปิดชื่อไฟล์ที่ต้องใช้ให้ครบก่อน แล้วรัน Master Prompt ก่อนสร้าง Notebook ถ้าฟีเจอร์ไหนไม่มี ใช้แผนสำรองด้านล่าง</aside></section>`;
}

// ---- แบบทดสอบ / ความมั่นใจ / ติดตาม 7 วัน ----
function quizState(mode) { return stored(`gn-quiz-${mode}`, null); }
// ก่อนเรียน = ชุดเต็ม 12 ข้อ, หลังเรียน = Post-test 5 ข้อ (postTestCore)
function quizSet(mode) { return mode === "post" ? postTestCore.map(i => quizQuestions[i]) : quizQuestions; }
function quizModeLabel(mode) { return mode === "pre" ? "ก่อนเรียน (Pre-test)" : "หลังเรียน (Post-test)"; }
const UNKNOWN_INDEX = 4;

function quizReviewHtml(existing, mode) {
  const qset = quizSet(mode);
  const other = quizState(mode === "pre" ? "post" : "pre");
  const otherSet = quizSet(mode === "pre" ? "post" : "pre");
  const pct = (sc, n) => Math.round(sc / n * 100);
  return `<p><strong>คะแนนของคุณ (${esc(quizModeLabel(mode))}):</strong> ${existing.score} / ${qset.length} (${pct(existing.score, qset.length)}%) — เลือก "ยังไม่ทราบ" ${existing.unknown} ข้อ</p>
      ${other ? `<p>เทียบกับอีกรอบ: ${other.score} / ${otherSet.length} (${pct(other.score, otherSet.length)}%) (${mode === "pre" ? "หลังเรียน" : "ก่อนเรียน"}) — ชุดข้อสอบต่างกัน จึงเทียบเป็นเปอร์เซ็นต์ ใช้ดูแนวโน้มเท่านั้น</p>` : ""}
      <h4>เฉลยและทบทวนรายข้อ</h4>
      <ol class="steps">${qset.map((q, i) => `<li><strong>${esc(q.q)}</strong><br>คำตอบของคุณ: ${esc(q.choices[existing.answers[i]] ?? "ไม่ได้ตอบ")} ${existing.answers[i] === q.answer ? "✓ ถูกต้อง" : `✗ คำตอบที่ถูกคือ "${esc(q.choices[q.answer])}"`}<br><small class="muted">วัด: ${esc(q.topic)} (${esc(q.hour)})</small></li>`).join("")}</ol>`;
}

function renderQuizTab(mode) {
  const existing = quizState(mode);
  const modeLabel = quizModeLabel(mode);
  const qset = quizSet(mode);
  let resultHtml;
  if (existing) {
    resultHtml = `<div class="quiz-result">${quizReviewHtml(existing, mode)}<button type="button" class="ghost-button" data-action="retake-quiz" data-mode="${mode}">ทำแบบทดสอบชุดนี้ใหม่</button></div>`;
  } else {
    resultHtml = `<form id="quiz-form" data-mode="${mode}">
      ${nameFieldHtml()}
      <ol class="steps">${qset.map((q, i) => `<li><strong>${esc(q.q)}</strong>
        <div class="choice-list">${q.choices.map((c, ci) => `<label class="choice-row"><input type="radio" name="q${i}" value="${ci}" required>${esc(c)}</label>`).join("")}</div>
      </li>`).join("")}</ol>
      ${consentNoteHtml()}
      <button class="primary-button" type="submit">ส่งคำตอบ (${esc(modeLabel)})</button>
    </form>`;
  }
  return `<div class="quiz-intro"><p>${esc(assessmentIntro.why)}</p><p class="muted">ชุดนี้มี ${qset.length} ข้อ</p></div>${resultHtml}`;
}

function confidenceReviewHtml(existing, mode) {
  const modeLabel = mode === "pre" ? "ก่อนเรียน" : "หลังเรียน";
  const avg = (existing.ratings.reduce((a, b) => a + b, 0) / existing.ratings.length).toFixed(1);
  return `<p><strong>ความมั่นใจเฉลี่ย (${esc(modeLabel)}):</strong> ${avg} / 5</p>
    <ol class="steps">${confidenceItems.map((c, i) => `<li>${esc(c)} — <strong>${existing.ratings[i]} / 5</strong></li>`).join("")}</ol>
    ${existing.intention ? `<p><strong>ความตั้งใจนำไปใช้:</strong> ${existing.intention.score} / 5<br>งานที่ตั้งใจจะทำ: ${esc(existing.intention.project || "-")}<br>สิ่งที่อาจทำให้ไม่ได้ลงมือ: ${esc(existing.intention.blocker || "-")}</p>` : ""}`;
}

function renderConfidenceTab(mode) {
  const key = `gn-confidence-${mode}`;
  const existing = stored(key, null);
  const modeLabel = mode === "pre" ? "ก่อนเรียน" : "หลังเรียน";
  if (existing) {
    return `<div class="quiz-result">${confidenceReviewHtml(existing, mode)}<button type="button" class="ghost-button" data-action="retake-confidence" data-mode="${mode}">ทำแบบประเมินนี้ใหม่</button></div>`;
  }
  return `<form id="confidence-form" data-mode="${mode}">
    ${nameFieldHtml()}
    <p class="lede" style="font-size:14px">ให้คะแนนความมั่นใจของคุณในแต่ละข้อ 1 = ทำไม่ได้เลย และ 5 = ทำได้เองอย่างมั่นใจ</p>
    <ol class="steps">${confidenceItems.map((c, i) => `<li>ฉันสามารถ...${esc(c)}
      <div class="scale-row">${[1, 2, 3, 4, 5].map(v => `<label class="scale-choice"><input type="radio" name="c${i}" value="${v}" required>${v}</label>`).join("")}</div>
    </li>`).join("")}</ol>
    ${mode === "post" ? `<h4>เฉพาะครั้งหลังเรียน — ความตั้งใจนำไปใช้</h4>
    <p>ฉันตั้งใจจะนำสิ่งที่เรียนไปใช้กับงานจริงภายใน 7 วัน</p>
    <div class="scale-row">${[1, 2, 3, 4, 5].map(v => `<label class="scale-choice"><input type="radio" name="intentionScore" value="${v}" required>${v}</label>`).join("")}</div>
    <div class="field full" style="margin-top:12px"><label>งานที่ฉันตั้งใจจะเอาไปทำด้วย Gemini + Gemini Notebook คือ (ไม่ต้องใส่ชื่อบุคคล)</label><input name="project" maxlength="200" /></div>
    <div class="field full" style="margin-top:12px"><label>สิ่งที่อาจทำให้ฉันไม่ได้ลงมือ คือ</label><input name="blocker" maxlength="200" /></div>` : ""}
    ${consentNoteHtml()}
    <button class="primary-button" type="submit" style="margin-top:18px">ส่งแบบประเมิน (${esc(modeLabel)})</button>
  </form>`;
}

function renderFollowupTab() {
  const existing = stored("gn-followup", null);
  if (existing) {
    return `<div class="quiz-result"><p>ส่งแบบติดตาม 7 วันไว้แล้วเมื่อ ${esc(new Date(existing.savedAt).toLocaleDateString("th-TH"))}</p>
    <ol class="steps">${followupQuestions.map((q, i) => `<li>${esc(q.q)}<br><strong>${esc(Array.isArray(existing.answers[i]) ? existing.answers[i].join(", ") : (existing.answers[i] || "-"))}</strong></li>`).join("")}</ol>
    <button type="button" class="ghost-button" data-action="retake-followup">กรอกแบบติดตามใหม่</button></div>`;
  }
  return `<form id="followup-form">
    ${nameFieldHtml()}
    <ol class="steps">${followupQuestions.map((q, i) => {
      if (q.type === "text") return `<li>${esc(q.q)}<input name="f${i}" class="text-answer" maxlength="300" /></li>`;
      const inputType = q.type === "multi" ? "checkbox" : "radio";
      return `<li>${esc(q.q)}${q.note ? `<br><small class="muted">${esc(q.note)}</small>` : ""}
      <div class="choice-list">${q.choices.map(c => `<label class="choice-row"><input type="${inputType}" name="f${i}" value="${esc(c)}">${esc(c)}</label>`).join("")}</div></li>`;
    }).join("")}</ol>
    ${consentNoteHtml()}
    <button class="primary-button" type="submit">ส่งแบบติดตาม 7 วัน</button>
  </form>`;
}

function renderAssessment(tab, mode) {
  const t = tab || "quiz";
  const m = mode || "pre";
  const tabs = [["quiz", `แบบทดสอบความรู้ (ก่อน ${quizQuestions.length} ข้อ · หลัง ${postTestCore.length} ข้อ)`], ["confidence", "ความมั่นใจในการลงมือทำ"], ["followup", "ติดตาม 7 วัน"]];
  const body = t === "confidence" ? renderConfidenceTab(m) : t === "followup" ? renderFollowupTab() : renderQuizTab(m);
  const modeSwitch = t !== "followup" ? `<div class="mode-switch">
    <button class="ghost-button ${m === "pre" ? "active" : ""}" data-view="assessment" data-id="${t}" data-sub="pre">ก่อนเรียน</button>
    <button class="ghost-button ${m === "post" ? "active" : ""}" data-view="assessment" data-id="${t}" data-sub="post">หลังเรียน</button>
  </div>` : "";
  return `<section><div class="eyebrow">วัดผลการเรียนรู้</div><h1>แบบทดสอบและความมั่นใจ</h1><p class="lede">${esc(assessmentIntro.howToUse)}</p>
  <div class="tab-row">${tabs.map(([tid, label]) => `<button class="tab-btn ${t === tid ? "active" : ""}" data-view="assessment" data-id="${tid}" data-sub="pre">${esc(label)}</button>`).join("")}</div>
  ${modeSwitch}
  <div class="assessment-body">${body}</div></section>`;
}


// ---- เกียรติบัตรเข้าร่วมอบรม: สร้างในเบราว์เซอร์ของผู้เรียนเอง ไม่ส่งข้อมูลไปที่ใด ----
function certificateEligibility() {
  return { post: Boolean(quizState("post")), evaluation: Boolean(stored("gn-confidence-post", null)) };
}
// รูปลายเซ็น (ถ้ามี) ต้องเป็นไฟล์ในเว็บ (assets/...) หรือ https เท่านั้น เว้นว่าง = เหลือช่องว่างไว้เซ็นสดหลังพิมพ์
function certSignImg(src) {
  return src && /^(assets\/[\w\-./]+|https:\/\/[^\s"'<>]+)$/.test(src) ? `<div class="cert-sign-img" style="background-image:url('${esc(src)}')"></div>` : "";
}
const CERT_SPARK_PATH = "M12 0C12.8 6.6 17.4 11.2 24 12C17.4 12.8 12.8 17.4 12 24C11.2 17.4 6.6 12.8 0 12C6.6 11.2 11.2 6.6 12 0Z";
function certGradientDef(id) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4285f4"/><stop offset=".55" stop-color="#9b72cb"/><stop offset="1" stop-color="#d96570"/></linearGradient>`;
}
function certNetSvg(cls) {
  const nodes = [[286, 14], [238, 44], [268, 88], [196, 72], [176, 20], [226, 128], [148, 108], [284, 150], [118, 52]];
  const edges = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 4], [2, 5], [3, 5], [3, 6], [2, 7], [4, 8], [6, 8]];
  const g = edges.map(([i, j]) => `<line x1="${nodes[i][0]}" y1="${nodes[i][1]}" x2="${nodes[j][0]}" y2="${nodes[j][1]}"/>`).join("") + nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 4 : 2.6}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170" viewBox="0 0 300 170"><g stroke="#4285f4" stroke-opacity=".28" stroke-width="1" fill="#4285f4" fill-opacity=".45">${g}</g></svg>`;
  // เป็นภาพพื้นหลัง (ไม่ใช่ <svg> ตรง ๆ) เพราะตัวสร้าง PDF วาด SVG ที่ขนาดเป็นหน่วย cqw ไม่ได้
  return `<div class="cert-net ${cls}" style="background-image:url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')"></div>`;
}
function certificateHtml(name, certId) {
  const c = APP_CONFIG;
  const nameSize = name.length > 30 ? 3.4 : name.length > 22 ? 4 : 5;
  const hasSchedule = typeof classSchedule !== "undefined" && classSchedule.date;
  const dateText = hasSchedule ? classSchedule.date : new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  const timeText = hasSchedule && classSchedule.time ? ` · ${classSchedule.time}` : "";
  const spark = (id) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs>${certGradientDef(id)}</defs><path d="${CERT_SPARK_PATH}" fill="url(#${id})"/></svg>`;
  const sign = (img, signerName, titleHtml) => `<div class="cert-sign"><div class="cert-sign-space">${certSignImg(img)}</div><div class="cert-sign-line"></div><div class="cert-sign-name">${esc(signerName || "")}</div><div class="cert-sign-title">${titleHtml}</div></div>`;
  return `<div class="cert-sheet"><div class="cert-glow"></div>${certNetSvg("cert-net-tr")}<div class="cert-bar"></div><div class="cert-frame"></div><div class="cert-logo-co"></div><div class="cert-id">${backendReady() ? (certId ? "CERT ID · " + esc(certId) : "CERT ID · ออกให้ตอนดาวน์โหลด") : ""}</div>
  <div class="cert-inner">
    <div class="cert-head"><div class="cert-logo-tnk"></div><div class="cert-spark">${spark("cgh")}</div><div class="cert-kicker">CERTIFICATE OF PARTICIPATION</div><h1 class="cert-title">เกียรติบัตรเข้าร่วมอบรม</h1></div>
    <div class="cert-mid"><p class="cert-line">ขอมอบเกียรติบัตรนี้เพื่อแสดงว่า</p><div class="cert-name" style="font-size:${nameSize}cqw">${esc(name)}</div><div class="cert-namebar"></div><p class="cert-line">ได้เข้าร่วมอบรมเชิงปฏิบัติการ 3 ชั่วโมง</p><div class="cert-course">${esc(c.CERT_COURSE || "Gemini × Gemini Notebook")}</div>${c.CERT_ORG ? `<div class="cert-org">${esc(c.CERT_ORG)}</div>` : ""}<div class="cert-meta">${esc(dateText)}${esc(timeText)}</div></div>
    <div class="cert-sign-row">
      ${sign(c.CERT_SIGN_INSTRUCTOR_IMG, c.CERT_ISSUER || "", "ผู้สอน · Instructor")}
      <div class="cert-seal">${spark("cgs")}<span>GEMINI × NOTEBOOK</span></div>
      ${sign(c.CERT_SIGN_MD_IMG, c.CERT_MD_NAME || "", "Managing Director")}
    </div>
  </div></div>`;
}
function renderCertificate() {
  const e = certificateEligibility();
  const name = studentName();
  const ok = e.post && e.evaluation && isValidFullName(name);
  return `<section><div class="eyebrow">ประเมินผลและเกียรติบัตร</div><h1>เกียรติบัตรเข้าร่วมอบรม</h1>
  <p class="lede">เกียรติบัตรนี้ยืนยันการเข้าร่วมและทำแบบประเมินครบ ไม่มีเกณฑ์คะแนนผ่านหรือตก สร้างในเบราว์เซอร์ของคุณเอง ไม่มีการส่งข้อมูลไปที่ใด</p>
  <ul class="cert-checklist"><li class="${e.post ? "done" : ""}">${e.post ? "✓" : "☐"} ทำ Post-test ${postTestCore.length} ข้อแล้ว <button class="link-button" data-view="assessment" data-id="quiz" data-sub="post">ไปทำ</button></li>
  <li class="${e.evaluation ? "done" : ""}">${e.evaluation ? "✓" : "☐"} ทำแบบประเมินความมั่นใจหลังเรียนแล้ว <button class="link-button" data-view="assessment" data-id="confidence" data-sub="post">ไปทำ</button></li>
  <li class="${isValidFullName(name) ? "done" : ""}">${isValidFullName(name) ? "✓" : "☐"} มีชื่อที่ใช้พิมพ์ในเกียรติบัตร (แก้ที่ช่องชื่อในเมนู): ${esc(name || "-")}</li></ul>
  ${ok ? `<div class="cert-preview">${certificateHtml(name)}</div><p><button type="button" class="primary-button" data-action="download-certificate">⬇ ดาวน์โหลดเกียรติบัตร (PDF)</button></p>` : `<p class="muted">ทำครบทุกข้อด้านบนแล้วปุ่มดาวน์โหลดจะปรากฏ</p>`}
  </section>`;
}
// เลขตรวจสอบเกียรติบัตร: สุ่มครั้งเดียวต่อชื่อ (ดาวน์โหลดซ้ำได้เลขเดิม) รูปแบบ GNB-yymmdd-XXXXXXXX (ไม่มี 0 O 1 I L)
function certIdFor(name) {
  try {
    const saved = JSON.parse(localStorage.getItem("gn-cert-id") || "null");
    if (saved && saved.name === name && /^GNB-\d{6}-[A-HJ-NP-Z2-9]{8}$/.test(saved.id)) return saved.id;
  } catch { /* เริ่มใหม่ */ }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const now = new Date();
  const ymd = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  const id = `GNB-${ymd}-${Array.from(bytes, b => alphabet[b & 31]).join("")}`;
  localStorage.setItem("gn-cert-id", JSON.stringify({ name, id }));
  return id;
}
async function downloadCertificate() {
  const name = studentName();
  toast("กำลังสร้างเกียรติบัตร...");
  try {
    let certId = "";
    if (backendReady()) {
      // ลงทะเบียนเลขกับระบบก่อนออกไฟล์ เพื่อให้ผู้สอนตรวจย้อนได้ว่าเลขนี้ออกให้ใคร
      certId = certIdFor(name);
      const registered = await syncToBackend("certificate", { certId, course: APP_CONFIG.CERT_COURSE || "", classDate: typeof classSchedule !== "undefined" ? classSchedule.date : "" });
      if (!registered) { toast("ลงทะเบียนเลข Cert ID ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"); return; }
    }
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const root = document.createElement("div");
    root.className = "cert-export-root";
    root.innerHTML = certificateHtml(name, certId);
    document.body.appendChild(root);
    // ความละเอียดสูงเพื่อให้โลโก้และตัวอักษรคมเมื่อพิมพ์ (A4 แนวนอน ~ 3370 px ที่ scale 3); ถ้าเครื่องสร้างภาพใหญ่ไม่ไหวให้ลดลง
    let canvas = null;
    for (const scale of [4, 3, 2]) {
      try { canvas = await html2canvas(root, { scale, backgroundColor: "#ffffff", useCORS: true }); if (canvas && canvas.width > 0 && canvas.toDataURL("image/jpeg", 0.5).length > 100) break; } catch { canvas = null; }
    }
    document.body.removeChild(root);
    if (!canvas) throw new Error("render failed");
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, w, h);
    pdf.save("เกียรติบัตร-Gemini-Notebook.pdf");
    toast("ดาวน์โหลดเกียรติบัตรแล้ว");
  } catch (err) {
    console.error(err);
    toast("สร้างเกียรติบัตรไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

// ---- ไฟล์ฝึกปฏิบัติ ----
const datapackFiles = [
  ["00_อ่านก่อน_สารบัญชุดเอกสาร.docx", "สารบัญและคำเตือน", "ทุกคน"],
  ["01_MT_โปรโมชั่นและTradeTerm.docx", "เงื่อนไขโปรโมชั่นและ Trade Term ช่องทาง MT", "ขาย MT / การเงิน"],
  ["02_GT_ราคาส่งและเครดิตร้านค้า.docx", "ราคาส่งและเครดิตร้านค้า GT (มีชื่อเจ้าของร้าน ต้องลบก่อนใช้)", "ขาย GT / บัญชี"],
  ["03_ยอดขายรายเดือน_แยกช่องทาง.xlsx", "ยอดขายรายเดือน ม.ค.-ส.ค. (ตั้งใจให้เละ)", "ขาย / การเงิน / การตลาด"],
  ["04_บันทึกประชุมทีมขาย_ถอดเสียง.docx", "บันทึกประชุมแบบถอดเสียง (มีชื่อบุคคล)", "แอดมิน / ขาย"],
  ["05_รีวิวลูกค้าออนไลน์.xlsx", "รีวิวลูกค้า 51 รายการจาก Shopee/Lazada/TikTok Shop", "ออนไลน์ / การตลาด"],
  ["06_Brief_แคมเปญและคู่แข่ง.docx", "Brief แคมเปญและข้อมูลคู่แข่ง", "การตลาด"],
  ["07_SOP_เบิกงบและวางบิล.docx", "SOP เบิกงบและวางบิล", "แอดมิน / บัญชี"],
  ["08_นโยบายเครดิต_ฉบับ2566.docx", "นโยบายเครดิต ฉบับปี 2566", "การเงิน / ขาย"],
  ["08_นโยบายเครดิต_ฉบับ2568.docx", "นโยบายเครดิต ฉบับปี 2568", "การเงิน / ขาย"],
  ["09_รายงานลูกหนี้ค้างชำระ.xlsx", "รายงานลูกหนี้ค้างชำระ (มีชื่อผู้ติดต่อ ต้องลบก่อนใช้)", "บัญชี / การเงิน"],
  ["10_ระเบียบสวัสดิการและการลา.docx", "ระเบียบสวัสดิการและการลา", "แอดมิน"],
];

function renderDataFiles() {
  return `<section><div class="eyebrow">ทรัพยากรประกอบการเรียน</div><h1>ไฟล์ฝึกปฏิบัติ</h1>
  <p class="lede">ชุดเอกสารสมมติของบริษัท ไร้ควันพันล้าน ทุกชื่อ ตัวเลข และเหตุการณ์ไม่ใช่ข้อมูลจริง เอกสารตั้งใจให้ไม่สมบูรณ์ ไม่สม่ำเสมอ และบางฉบับขัดกันเอง งานของคุณคือเตรียมให้พร้อมและตรวจสอบก่อนใช้ อัปโหลดเข้า Google Drive ของคุณแล้วเปิดเป็น Google Docs/Sheets</p>
  <p>${zipLink("all-datapack", "ดาวน์โหลดทั้งชุดในไฟล์เดียว (12 ไฟล์)")}</p>
  <div class="chapter-list">${datapackFiles.map(([f, desc, dept]) => `<div class="chapter-row" style="cursor:default"><span class="number">${esc(f.slice(0, 2))}</span><span><strong>${esc(f)}</strong><small>${esc(desc)} · ${esc(dept)}</small></span><span><a class="zip-link" href="data-files/datapack/${encodeURIComponent(f)}" download>ดาวน์โหลด</a></span></div>`).join("")}</div>
  <div class="side-note" style="position:static;margin-top:28px"><strong>กติกาข้อมูล</strong>ชื่อในไฟล์เป็นชื่อสมมติ จึงใช้ในคลาสได้ แต่ให้ฝึกปิดชื่อเหมือนเป็นข้อมูลจริง อย่านำเอกสารจริงของบริษัทมาใช้แทนโดยไม่ปิดชื่อบุคคลก่อน</div>
  </section>`;
}

// ---- โหมดผู้สอน: บันทึกการตรวจสอบ และเฉลยกับดัก ----
function renderVerify() {
  if (!isInstructorDevice()) return renderScores();
  return `<section><div class="eyebrow">ผู้สอน</div><h1>บันทึกการตรวจสอบเนื้อหา</h1>
  <p class="lede">สถานะการตรวจกับแหล่งทางการของ Google และจุดที่ปรับจากแผนเดิมพร้อมเหตุผล (ข้อ 2, 3, 6 ของ Methodology) ตรวจซ้ำก่อนสอนทุกครั้ง เพราะเครื่องมือเปลี่ยนเร็ว</p>
  <h2>สถานะการตรวจสอบ</h2>
  ${table([["เรื่อง", "สถานะ", "แหล่ง", "แผนสำรอง"], ...verificationLog.map(v => [v.item, v.status, v.source, v.planB])])}
  <p class="muted">แหล่งที่ตรวจ: ${verificationLog.filter(v => v.url).map(v => `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.source)}</a>`).join(" · ")}</p>
  <h2 style="margin-top:32px">จุดที่ปรับจากแผนเดิม</h2>
  ${table([["วันที่", "สิ่งที่ปรับ", "เหตุผล", "สิ่งที่ยังคงไว้"], ...adjustmentLog.map(a => [a.date, a.change, a.reason, a.kept])])}
  </section>`;
}

function renderTraps() {
  if (!isInstructorDevice() || !instructorDataLoaded()) return renderScores();
  return `<section><div class="eyebrow">ผู้สอนเท่านั้น</div><h1>เฉลยกับดักในชุดเอกสารสมมติ</h1><p class="lede">ไฟล์นี้ไม่อยู่บน GitHub Pages ผู้เรียนเห็นไม่ได้ ห้ามแจกต่อ</p>
  ${table([["#", "เอกสาร", "กับดัก", "ใช้สอนเรื่อง"], ...trapList.map(t => [t.id, t.docs, t.trap, t.teaches])])}
  <div class="side-note" style="position:static;margin-top:20px"><strong>ตัวเลขอ้างอิงจากไฟล์ 03</strong>${esc(trapReference)}</div></section>`;
}

function renderSearch(term) {
  const needle = term.trim().toLowerCase();
  if (!needle) return renderHome();
  const hit = (obj) => JSON.stringify(obj).toLowerCase().includes(needle);
  const ch = chapters.filter(hit);
  const labs = exercisesData.filter(hit);
  const sl = slidesData.filter(s => hit([s.title, s.bodyHtml]));
  const pr = promptCards.filter(hit);
  const rows = [
    ...ch.map(c => `<article class="result"><button data-view="chapter" data-id="${c.id}">บทที่ ${c.number} · ${esc(c.title)}</button><p>${esc(c.intro)}</p></article>`),
    ...labs.map(e => `<article class="result"><button data-view="lab" data-id="${e.id}">Lab ${e.id} · ${esc(e.title)}</button><p>${esc(e.hour)}</p></article>`),
    ...pr.map(c => `<article class="result"><button data-view="prompts">การ์ด Prompt · ${esc(c.dept)}</button><p>${esc(c.task)}</p></article>`),
    ...sl.slice(0, 12).map(s => `<article class="result"><button data-view="slides" data-id="${s.n}">สไลด์ ${s.n} · ${esc(s.title)}</button><p>${esc(s.session)}</p></article>`),
  ];
  return `<section><div class="eyebrow">ค้นหา</div><h1>ผลลัพธ์สำหรับ “${esc(term)}”</h1><div class="search-results">${rows.length ? rows.join("") : "<p>ยังไม่พบหัวข้อที่ตรงกัน ลองค้นหาคำ เช่น ปิดชื่อ, อ้างอิง, Gem, Prompt หรือชื่อแผนก</p>"}</div></section>`;
}

function renderWhiteboard() {
  return `<section class="whiteboard-page">
    <div class="wb-tabs" role="tablist" aria-label="หน้าไวท์บอร์ด">
      ${wbPages.map((_, i) => `<button type="button" class="wb-tab ${i === wbActivePage ? "active" : ""}" data-wb-page="${i}" role="tab" aria-selected="${i === wbActivePage}">หน้า ${i + 1}${wbPages.length > 1 ? `<span class="wb-tab-close" data-wb-close-page="${i}" title="ลบหน้านี้">✕</span>` : ""}</button>`).join("")}
      <button type="button" class="wb-tab-add" id="wb-add-page" title="เพิ่มหน้าใหม่" aria-label="เพิ่มหน้าใหม่">+</button>
    </div>
    <div class="whiteboard-toolbar">
      <div class="wb-group" role="group" aria-label="เครื่องมือวาด">
        <button type="button" class="wb-tool" data-wb-tool="pen">✏️ ปากกา</button>
        <button type="button" class="wb-tool" data-wb-tool="eraser">🧹 ยางลบ</button>
      </div>
      <div class="wb-group wb-colors" role="group" aria-label="สีปากกา">
        ${WHITEBOARD_COLORS.map(c => `<button type="button" class="wb-color" data-wb-color="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join("")}
        <input type="color" id="wb-color-custom" class="wb-color-custom" title="เลือกสีเอง" />
      </div>
      <label class="wb-size-field">
        <span>ขนาดเส้น</span>
        <input type="range" id="wb-size" min="2" max="28" step="1" />
      </label>
      <div class="wb-group">
        <button type="button" id="wb-undo" class="ghost-button">↩ Undo</button>
        <button type="button" id="wb-clear" class="ghost-button">🗑 ล้างกระดาน</button>
      </div>
      <div class="wb-group">
        <button type="button" id="wb-save-png" class="primary-button">⬇ บันทึกรูปภาพ (PNG)</button>
        <button type="button" id="wb-save-pdf" class="primary-button">⬇ บันทึก PDF</button>
      </div>
    </div>
    <div class="whiteboard-canvas-wrap">
      <canvas id="wb-canvas"></canvas>
    </div>
  </section>`;
}

function toast(message) { const el = document.querySelector("#toast-template").content.firstElementChild.cloneNode(true); el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 2800); }

function showModal(html) {
  document.querySelector("#modal-content").innerHTML = html;
  document.querySelector("#modal-overlay").classList.add("show");
}
function hideModal() {
  document.querySelector("#modal-overlay").classList.remove("show");
  document.querySelector("#modal-content").innerHTML = "";
}

const nameFieldHtml = () => `<div class="field full required" style="margin-bottom:20px"><label>ชื่อผู้ทำ</label><input name="_takerName" required placeholder="ชื่อ นามสกุล หรือ ชื่อเล่น แผนก" value="${esc(studentName())}" /></div>`;
function captureTakerName(data) {
  const name = (data.get("_takerName") || "").trim();
  if (name) {
    localStorage.setItem("gn-student-name", name);
    const sidebarInput = document.querySelector("#student-name");
    if (sidebarInput) sidebarInput.value = name;
  }
  return name;
}

function render() {
  const hash = location.hash.replace("#", "");
  const parts = hash.split("/");
  const view = parts[0];
  const id = parts[1];
  const sub = parts[2];
  const app = document.querySelector("#app");
  const search = document.querySelector("#search");
  document.querySelectorAll(".nav-link").forEach(el => {
    const navView = el.dataset.view === "slides-resume" ? "slides" : el.dataset.view;
    const isChapterOrLab = (navView === "chapter" || navView === "lab") && navView === view;
    const isSingle = ["agenda", "slides", "workshop", "assessment", "datafiles", "whiteboard", "notes", "prompts", "submit", "certificate", "scores", "traps", "verify"].includes(navView) && navView === view;
    el.classList.toggle("active", (isChapterOrLab && el.dataset.id === id) || isSingle);
  });
  app.innerHTML =
    view === "chapter" ? renderChapter(id) :
    view === "plan" ? renderPlan() :
    view === "prompts" ? renderPrompts() :
    view === "troubleshoot" ? renderTroubleshoot() :
    view === "agenda" ? renderAgendaPage() :
    view === "slides" ? renderSlides(id) :
    view === "lab" ? renderLab(id) :
    view === "workshop" ? renderWorkshop(id) :
    view === "assessment" ? renderAssessment(id, sub) :
    view === "datafiles" ? renderDataFiles() :
    view === "submit" ? renderSubmitLinks() :
    view === "certificate" ? renderCertificate() :
    view === "whiteboard" ? renderWhiteboard() :
    view === "notes" ? renderNotes() :
    view === "scores" ? renderScores() :
    view === "traps" ? renderTraps() :
    view === "verify" ? renderVerify() :
    search.value ? renderSearch(search.value) : renderHome();
  if (view === "whiteboard") initWhiteboardCanvas();
  if (view === "notes") initNotesPage();
  if (view === "scores" && isInstructorDevice() && getInstructorKey()) loadScores();
  const sidebarEl = document.querySelector("#sidebar");
  if (!sidebarEl.classList.contains("pinned")) {
    sidebarEl.classList.remove("open");
    document.querySelector("#sidebar-backdrop").classList.remove("show");
  }
  window.scrollTo(0, 0);
}

renderNav();
document.addEventListener("click", async event => {
  const target = event.target.closest("[data-view], .reveal-answer, .reveal-btn, [data-action], .copy-btn");
  if (!target) return;
  if (target.classList.contains("copy-btn")) {
    const ok = await copyText(target.dataset.copy || "");
    toast(ok ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วกด Ctrl+C");
    return;
  }
  if (target.classList.contains("reveal-answer")) {
    target.nextElementSibling.classList.toggle("show");
    target.textContent = target.nextElementSibling.classList.contains("show") ? "ซ่อนแนวคำตอบ" : "แสดงแนวคำตอบ";
    return;
  }
  if (target.classList.contains("reveal-btn")) {
    const panel = target.classList.contains("notes-toggle-btn") ? document.querySelector(".notes-panel") : target.nextElementSibling;
    panel.classList.toggle("show");
    target.textContent = panel.classList.contains("show") ? target.dataset.close : target.dataset.open;
    return;
  }
  if (target.dataset.action === "retake-quiz") { localStorage.removeItem(`gn-quiz-${target.dataset.mode}`); render(); return; }
  if (target.dataset.action === "retake-confidence") { localStorage.removeItem(`gn-confidence-${target.dataset.mode}`); render(); return; }
  if (target.dataset.action === "retake-followup") { localStorage.removeItem("gn-followup"); render(); return; }
  if (target.dataset.action === "retake-selfcheck") { localStorage.removeItem(target.dataset.key); render(); return; }
  if (target.dataset.action === "download-handbook-pdf") { downloadHandbookPdf(); return; }
  if (target.dataset.action === "download-certificate") { downloadCertificate(); return; }
  if (target.dataset.action === "open-chat") { openChat(); return; }
  if (target.dataset.action === "show-qr") { showQrModal(); return; }
  if (!target.dataset.view) return;
  event.preventDefault();
  if (target.dataset.view === "slide-start") { setViewHash("slides/1"); return; }
  if (target.dataset.view === "slides-resume") {
    const last = stored("gn-last-slide", null);
    const next = last ? `slides/${last}` : "slides";
    if (location.hash === `#${next}`) render(); else setViewHash(next);
    return;
  }
  const hashParts = [target.dataset.view];
  if (target.dataset.id !== undefined) hashParts.push(target.dataset.id);
  if (target.dataset.sub !== undefined) hashParts.push(target.dataset.sub);
  const next = hashParts.join("/");
  if (location.hash === `#${next}`) render(); else setViewHash(next);
});
document.querySelector("#app").addEventListener("change", event => {
  if (event.target.matches(".chapter-check")) {
    const id = event.target.dataset.id; const next = new Set(completed());
    event.target.checked ? next.add(id) : next.delete(id);
    save("gn-completed", [...next]);
    event.target.closest(".check-item").classList.toggle("done", event.target.checked);
    toast(event.target.checked ? "บันทึกความคืบหน้าแล้ว" : "นำสถานะออกแล้ว");
    return;
  }
  if (event.target.id === "slide-jump") { setViewHash(`slides/${event.target.value}`); }
});

document.querySelector("#app").addEventListener("submit", async event => {
  const form = event.target;
  if (form.id === "plan-form") { event.preventDefault(); save("gn-plan", Object.fromEntries(new FormData(form))); toast("บันทึกแผน 7 วันในเครื่องนี้แล้ว"); return; }
  if (form.id === "scores-key-form") {
    event.preventDefault();
    try { sessionStorage.setItem(INSTRUCTOR_KEY_SESSION, form.querySelector("#scores-key").value.trim()); } catch { /* ไม่มี sessionStorage: ใช้ไม่ได้ในโหมดนี้ */ }
    loadScores();
    return;
  }
  if (form.id === "link-form") {
    event.preventDefault();
    const data = new FormData(form);
    const name = captureTakerName(data);
    const url = String(data.get("linkUrl") || "").trim();
    if (!isValidFullName(name)) { toast("กรุณากรอกชื่อ 2 คำขึ้นไป (ชื่อ นามสกุล หรือ ชื่อเล่น แผนก)"); return; }
    if (!isSafeHttpsUrl(url)) { toast("ลิงก์ต้องขึ้นต้นด้วย https:// และยาวไม่เกิน " + MAX_LINK_LENGTH + " ตัวอักษร"); return; }
    const record = { type: String(data.get("linkType")), url, note: String(data.get("linkNote") || "").trim(), savedAt: Date.now(), sent: false };
    record.sent = await syncToBackend("link", { linkType: record.type, url: record.url, note: record.note });
    const list = linkHistory(); list.unshift(record); save("gn-links", list.slice(0, 20));
    sentToast(record.sent, "ลิงก์");
    render();
    return;
  }
  if (form.id === "quiz-form") {
    event.preventDefault();
    const mode = form.dataset.mode;
    const qset = quizSet(mode);
    const data = new FormData(form);
    captureTakerName(data);
    const answers = qset.map((q, i) => parseInt(data.get(`q${i}`), 10));
    const score = answers.filter((a, i) => a === qset[i].answer).length;
    const unknown = answers.filter(a => a === UNKNOWN_INDEX).length;
    const record = { answers, score, unknown, savedAt: Date.now() };
    save(`gn-quiz-${mode}`, record);
    const ok = await syncToBackend("quiz", { mode, score, total: qset.length, unknown, answers });
    sentToast(ok, "ผลแบบทดสอบ");
    render();
    showModal(`<h2>ผลแบบทดสอบ (${esc(quizModeLabel(mode))})</h2><div class="modal-score ${score === qset.length ? "pass" : ""}">${score} / ${qset.length} คะแนน</div>${quizReviewHtml(record, mode)}`);
    return;
  }
  if (form.id === "confidence-form") {
    event.preventDefault();
    const mode = form.dataset.mode;
    const data = new FormData(form);
    captureTakerName(data);
    const ratings = confidenceItems.map((c, i) => parseInt(data.get(`c${i}`), 10));
    const payload = { ratings, savedAt: Date.now() };
    if (mode === "post") payload.intention = { score: parseInt(data.get("intentionScore"), 10), project: data.get("project"), blocker: data.get("blocker") };
    save(`gn-confidence-${mode}`, payload);
    const average = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
    const ok = await syncToBackend("confidence", { mode, average, intentionScore: payload.intention ? payload.intention.score : "", project: payload.intention ? payload.intention.project : "", blocker: payload.intention ? payload.intention.blocker : "" });
    sentToast(ok, "แบบประเมินความมั่นใจ");
    render();
    showModal(`<h2>ผลแบบประเมินความมั่นใจ</h2><div class="modal-score">${average} / 5 เฉลี่ย</div>${confidenceReviewHtml(payload, mode)}`);
    return;
  }
  if (form.id === "followup-form") {
    event.preventDefault();
    const data = new FormData(form);
    captureTakerName(data);
    const answers = followupQuestions.map((q, i) => q.type === "multi" ? data.getAll(`f${i}`) : data.get(`f${i}`));
    save("gn-followup", { answers, savedAt: Date.now() });
    const ok = await syncToBackend("followup", { answers });
    sentToast(ok, "แบบติดตาม 7 วัน");
    render();
    return;
  }
  if (form.dataset.selfcheck) {
    event.preventDefault();
    const key = form.dataset.selfcheck;
    captureTakerName(new FormData(form));
    const inputs = [];
    const results = [];
    [...form.querySelectorAll('input[name]:not([name="_takerName"])')].forEach(inp => {
      if (inp.type === "checkbox") { inputs.push(inp.checked ? "ยืนยันแล้ว" : ""); results.push(inp.checked); return; }
      const val = inp.value.trim();
      inputs.push(val);
      const expectedNum = parseFloat(inp.dataset.expected);
      const typedNum = parseFloat(val.replace(/,/g, ""));
      results.push(!isNaN(typedNum) && Math.abs(typedNum - expectedNum) < 0.005);
    });
    save(key, { inputs, results, submittedAt: Date.now() });
    const allPass = results.every(Boolean);
    const keyMatch = /^gn-selfcheck-(exercise|workshop)-(.+)$/.exec(key);
    let ok = false;
    if (keyMatch) {
      const [, kind, sid] = keyMatch;
      const base = { score: results.filter(Boolean).length, total: results.length, allPass, inputs };
      ok = await syncToBackend(kind, kind === "exercise" ? { exerciseId: sid, ...base } : { track: sid, ...base });
    }
    toast(allPass ? "ตรวจแล้ว — ผ่านครบทุกข้อ 🎉" : "บันทึกผลตรวจสอบแล้ว ข้อที่ไม่ตรงให้กลับไปตรวจอ้างอิง");
    if (!ok && backendReady()) toast("ส่งผลให้ผู้สอนไม่สำเร็จ กดตรวจใหม่เพื่อส่งอีกครั้ง");
    render();
  }
});

document.querySelector("#search").addEventListener("input", event => { const next = event.target.value.trim() ? "search" : "start"; if (location.hash === `#${next}`) render(); else setViewHash(next); });
const sidebarEl = document.querySelector("#sidebar");
const backdropEl = document.querySelector("#sidebar-backdrop");
const pinButton = document.querySelector("#pin-button");

function setSidebarOpen(open) {
  sidebarEl.classList.toggle("open", open);
  backdropEl.classList.toggle("show", open && !sidebarEl.classList.contains("pinned"));
}
function setSidebarPinned(pinned) {
  sidebarEl.classList.toggle("pinned", pinned);
  document.body.classList.toggle("sidebar-pinned", pinned);
  pinButton.setAttribute("aria-pressed", String(pinned));
  save("gn-sidebar-pinned", pinned);
  backdropEl.classList.toggle("show", sidebarEl.classList.contains("open") && !pinned);
}

document.querySelector("#menu-button").addEventListener("click", () => setSidebarOpen(!sidebarEl.classList.contains("open")));
backdropEl.addEventListener("click", () => setSidebarOpen(false));
pinButton.addEventListener("click", () => {
  const nextPinned = !sidebarEl.classList.contains("pinned");
  setSidebarPinned(nextPinned);
  setSidebarOpen(nextPinned);
  toast(nextPinned ? "ปักหมุดเมนูแล้ว — เปิดค้างไว้ทุกครั้ง" : "เลิกปักหมุดเมนูแล้ว");
});
setSidebarPinned(stored("gn-sidebar-pinned", false));

const studentNameInput = document.querySelector("#student-name");
studentNameInput.value = studentName();
studentNameInput.addEventListener("change", () => {
  const oldValue = studentName();
  const newValue = studentNameInput.value.trim();
  if (!newValue) { toast("ห้ามลบชื่อจนว่างเปล่า — ต้องมีชื่อไว้ส่งผลที่คุณกดส่ง"); studentNameInput.value = oldValue; return; }
  if (!isValidFullName(newValue)) { toast("กรุณากรอกอย่างน้อย 2 คำ (ชื่อ นามสกุล หรือ ชื่อเล่น แผนก)"); studentNameInput.value = oldValue; return; }
  if (newValue === oldValue) return;
  if (oldValue && !confirm(`เปลี่ยนชื่อจาก "${oldValue}" เป็น "${newValue}" ใช่หรือไม่?\n\nผลที่เคยส่งไปแล้วจะยังผูกกับชื่อเดิม ควรแก้เฉพาะกรณีพิมพ์ผิดเท่านั้น`)) { studentNameInput.value = oldValue; return; }
  localStorage.setItem("gn-student-name", newValue);
  toast("บันทึกชื่อแล้ว");
});

const nameGateOverlay = document.querySelector("#name-gate-overlay");
const nameGateInput = document.querySelector("#name-gate-input");
const nameGateError = document.querySelector("#name-gate-error");
if (!isValidFullName(studentName())) {
  nameGateInput.value = studentName();
  nameGateOverlay.classList.add("show");
}
document.querySelector("#name-gate-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameGateInput.value.trim();
  if (!isValidFullName(name)) { nameGateError.hidden = false; nameGateInput.focus(); return; }
  nameGateError.hidden = true;
  localStorage.setItem("gn-student-name", name);
  studentNameInput.value = name;
  nameGateOverlay.classList.remove("show");
  toast(`ยินดีต้อนรับ ${name}`);
});
document.addEventListener("mousemove", event => {
  if (event.clientX <= 6 && !sidebarEl.classList.contains("open") && !sidebarEl.classList.contains("pinned")) setSidebarOpen(true);
});

function setDensity(mode) {
  document.documentElement.dataset.density = mode;
  document.querySelectorAll(".density-option").forEach(b => b.classList.toggle("active", b.dataset.density === mode));
  localStorage.setItem("gn-density", mode);
}
document.querySelector(".density-switch").addEventListener("click", event => {
  const btn = event.target.closest(".density-option");
  if (!btn) return;
  setDensity(btn.dataset.density);
});
setDensity(localStorage.getItem("gn-density") || "normal");

document.querySelector("#theme-button").addEventListener("click", () => { const next = document.documentElement.dataset.theme === "dark" ? "" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("gn-theme", next); });
document.querySelector("#modal-close").addEventListener("click", hideModal);
document.querySelector("#modal-overlay").addEventListener("click", (event) => { if (event.target.id === "modal-overlay") hideModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { hideModal(); } });

document.documentElement.dataset.theme = localStorage.getItem("gn-theme") || "";
window.addEventListener("hashchange", render);
render();
