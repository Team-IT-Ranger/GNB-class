// ตั้งค่าที่ผู้ deploy ต้องแก้เอง (ไฟล์นี้ขึ้นเว็บสาธารณะ — ห้ามใส่ความลับจริง)
//
// GAS_ENDPOINT : URL ที่ลงท้าย /exec ของ Apps Script หลังบ้าน (ดู ../backend/README.md)
//                เว้นว่างไว้ = แอปทำงานได้ปกติ แต่ทุกอย่างบันทึกในเบราว์เซอร์ของผู้เรียนเท่านั้น
// GAS_SECRET   : ต้องตรงกับ SHARED_SECRET ใน backend/Code.gs เป็นเพียงตัวกันสแปมเบา ๆ ไม่ใช่ระบบความปลอดภัย
//                (อยู่ในโค้ดสาธารณะ ใครก็อ่านได้) จึงไม่ใช้ปกป้องข้อมูลคะแนน — คะแนนป้องกันด้วยกุญแจผู้สอนแยก
//                ที่ไม่อยู่ในไฟล์ใดของเว็บ (INSTRUCTOR_KEY ใน backend/Code.gs)
const APP_CONFIG = {
  GAS_ENDPOINT: "https://script.google.com/macros/s/AKfycbxvNZiewuGaCiIyKLoA95W5yyn4-MwevrK7TCw96oEjjW_98x-a0qPPPoAOmXXkGJqD/exec",
  GAS_SECRET: "!2948",
  // เปิดโหมดผู้สอนบนเครื่องของคุณ: เข้าเว็บด้วย ?instructor=<ค่านี้> (เป็นแค่สวิตช์แสดงเมนู ไม่ใช่การล็อกอิน)
  INSTRUCTOR_URL_FLAG: "gn-teacher",
  CLASS_LABEL: "Gemini × Gemini Notebook · คลาส 3 ชั่วโมง",
  // เกียรติบัตรเข้าร่วมอบรม (ผู้เรียนสร้างเองในเบราว์เซอร์ ไม่ส่งข้อมูลไปที่ใด) — ใส่ชื่อหน่วยงานและผู้ลงนามของคุณ
  CERT_ORG: "",
  CERT_ISSUER: "ผู้สอน",
  CERT_COURSE: "Gemini × Gemini Notebook (เดิมชื่อ NotebookLM)",
  // ห้องแชตของคลาส: ลิงก์ห้อง Google Chat (ผู้เรียนต้องอยู่ในองค์กรเดียวกัน) เว้นว่าง = ปุ่มแจ้งว่ายังไม่ได้ตั้งค่า
  CHAT_URL: "https://chat.google.com/room/AAQAN5srWjU?cls=1",
  COMPANY_LABEL: "กรณีศึกษา: บริษัท ไร้ควันพันล้าน จำกัด (บริษัทสมมติ)",
};
