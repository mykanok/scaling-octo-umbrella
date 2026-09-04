const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// ตั้งค่า Database Connection Pool (รองรับ async/await)
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'doc_system_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ตั้งค่า Multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
    cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// ================= API ROUTES =================

// 1. API ล็อกอิน
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
        res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: rows[0] });
    } else {
        res.status(401).json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
    } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});

// 2. API สมัครสมาชิก (พร้อม Regex เช็กรหัสผ่านปลอดภัย)
app.post('/api/register', async (req, res) => {
    const { username, password, fullname, department } = req.body;

    if (!username || !password || !fullname || !department) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

  // Regex ตรวจสอบรหัสผ่าน: พิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข, อักขระพิเศษอย่างน้อย 1 ตัว และยาว 8 ตัวขึ้นไป
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วย ตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ (@$!%*?&)' 
    });
    }

    try {
    const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้งานนี้มีในระบบแล้ว' });
    }

    // กำหนด role เป็น 'staff' ตรงตาม ENUM ใน MySQL
    await db.query(
        'INSERT INTO users (username, password, fullname, department, role) VALUES (?, ?, ?, ?, ?)',
        [username, password, fullname, department, 'staff']
    );

    res.json({ message: 'สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบ' });
    } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});

//API ลืมรหัสผ่าน
// API สำหรับตั้งรหัสผ่านใหม่ (Reset Password)
app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

  // ตรวจสอบความปลอดภัยของรหัสผ่านใหม่ด้วย Regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ 
        message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วย พิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ (@$!%*?&)' 
    });
    }

    try {
    // ตรวจสอบว่ามีผู้ใช้นี้ในระบบจริงไหม
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' });
    }

    // อัปเดตรหัสผ่านใหม่ลง MySQL
    await db.query('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
    } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
    }
});
// 3. API ดึงรายการเอกสารทั้งหมด
// 3. API ดึงรายการเอกสาร (ปรับรองรับสิทธิ์ Admin และแบ่งตามแผนก)
app.get('/api/documents', async (req, res) => {
    const { department, role } = req.query;

    try {
        // กรณีเป็น Admin ให้ดึงเอกสารทั้งหมด
        if (role === 'admin') {
            const [rows] = await db.query('SELECT * FROM documents ORDER BY created_at DESC');
            return res.json(rows);
        }

        // กรณีเป็น ยูสเซอร์ทั่วไป แต่ไม่ได้ส่ง department มา
        if (!department) {
            return res.status(400).json({ message: 'กรุณาระบุแผนกของผู้ใช้งาน' });
        }

        // กรณีเป็น ยูสเซอร์ทั่วไป ให้ดึงเฉพาะเอกสารที่เกี่ยวข้องกัน (เป็นผู้ส่งหรือผู้รับ)
        const sql = `
            SELECT * FROM documents 
            WHERE receiver_dept = ? OR sender_dept = ? 
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql, [department, department]);
        res.json(rows);

    } catch (err) {
        console.error('FETCH DOCUMENTS ERROR:', err);
        res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเอกสารได้' });
    }
});

// 4. API ส่งเอกสารใหม่
app.post('/api/documents', upload.single('file'), async (req, res) => {
    const { title, doc_number, sender_dept, receiver_dept, uploaded_by } = req.body;
    const file_path = req.file ? req.file.path : '';

    try {
    await db.query(
        'INSERT INTO documents (title, doc_number, sender_dept, receiver_dept, file_path, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, doc_number, sender_dept, receiver_dept, file_path, uploaded_by, 'pending']
    );
    res.json({ message: 'อัปโหลดเอกสารสำเร็จ' });
    } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถอัปโหลดเอกสารได้' });
    }
});

// 5. API อัปเดตสถานะเอกสาร
app.put('/api/documents/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
    await db.query('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
    } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตสถานะได้' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Server รันอยู่ที่ http://localhost:${PORT}`);
});