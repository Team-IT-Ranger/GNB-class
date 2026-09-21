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
  INSTRUCTOR_URL_FLAG: "chnnchnn",
  CLASS_LABEL: "Gemini × Gemini Notebook · คลาส 3 ชั่วโมง",
  // เกียรติบัตรเข้าร่วมอบรม (ผู้เรียนสร้างเองในเบราว์เซอร์ ไม่ส่งข้อมูลไปที่ใด) — ใส่ชื่อหน่วยงานและผู้ลงนามของคุณ
  CERT_ORG: "THANATKORN INTERNATIONAL",
  CERT_ISSUER: "Channarong PIPATWATANAKUL",
  // ลายเซ็นบนเกียรติบัตร: ใส่ชื่อกรรมการผู้จัดการใน CERT_MD_NAME (เว้นว่าง = เหลือช่องว่างไว้เขียนสด)
  // รูปลายเซ็น (PNG พื้นโปร่งใส) วางในโฟลเดอร์ assets/ แล้วใส่พาธ เช่น "assets/sign-instructor.png" เว้นว่าง = เหลือช่องว่างไว้เซ็นสดหลังพิมพ์
  CERT_MD_NAME: "Sonthaya THUNG",
  CERT_SIGN_INSTRUCTOR_IMG: "",
  CERT_SIGN_MD_IMG: "",
  CERT_COURSE: "Gemini Notebook 2026",
  // ห้องแชตของคลาส: ลิงก์ห้อง Google Chat (ผู้เรียนต้องอยู่ในองค์กรเดียวกัน) เว้นว่าง = ปุ่มแจ้งว่ายังไม่ได้ตั้งค่า
  CHAT_URL: "https://chat.google.com/room/AAQAZhQsKdo?cls=7",
  // โพสต์ลิงก์/โน้ตที่ผู้เรียนส่งลงห้อง Google Chat ของคลาสด้วย (ต้องตั้ง CHAT_WEBHOOK_URL ในหลังบ้านก่อน ดู backend/README.md)
  // false = ไม่แสดงตัวเลือกนี้ในแอป
  CHAT_POST: false,
  COMPANY_LABEL: "กรณีศึกษา: บริษัท ไร้ควันพันล้าน จำกัด (บริษัทสมมติ)",
};
