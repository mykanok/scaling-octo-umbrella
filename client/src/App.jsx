import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Send, CheckCircle, XCircle, Clock, Upload, LogOut, KeyRound, ExternalLink, ShieldAlert } from 'lucide-react';

export default function App() {
  // 1. State ทั้งหมด
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // State สำหรับ Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null); // ตัวแปรเก็บข้อมูลผู้ใช้ (รวมถึง user.role)

  // State สำหรับ Register
  const [regFullname, setRegFullname] = useState('');
  const [regDepartment, setRegDepartment] = useState('');

  // State สำหรับ Reset Password
  const [newPassword, setNewPassword] = useState('');

  // State สำหรับเอกสาร
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [receiverDept, setReceiverDept] = useState('');
  const [file, setFile] = useState(null);

  // ฟังก์ชันดึงเอกสาร (รองรับ Admin และ User ทั่วไป)
  const fetchDocuments = async (currentUser) => {
    const userData = currentUser || user;
    if (!userData) return;

    try {
      // ส่งทั้ง department และ role ไปให้ Backend ตรวจสอบ
      const res = await axios.get('http://localhost:5000/api/documents', {
        params: { 
          department: userData.department,
          role: userData.role
        }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  // เรียกดึงข้อมูลเมื่อล็อกอินสำเร็จ
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchDocuments(user);
    }
  }, [isLoggedIn, user]);

  // ฟังก์ชันล็อกอิน
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      setUser(res.data.user);
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.response?.data?.message || 'ล็อกอินไม่สำเร็จ');
    }
  };

  // ฟังก์ชันสมัครสมาชิก
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', {
        username,
        password,
        fullname: regFullname,
        department: regDepartment
      });
      alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      setIsRegistering(false);
      setUsername('');
      setPassword('');
      setRegFullname('');
      setRegDepartment('');
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    }
  };

  // ฟังก์ชันตั้งรหัสผ่านใหม่ (Reset Password)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/reset-password', {
        username,
        newPassword
      });
      alert(res.data.message);
      setIsResetting(false);
      setUsername('');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    }
  };

  // ฟังก์ชันส่งเอกสาร
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('กรุณาเลือกไฟล์เอกสาร');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('doc_number', docNumber);
    formData.append('sender_dept', user.department);
    formData.append('receiver_dept', receiverDept);
    formData.append('uploaded_by', user.id);
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5000/api/documents', formData);
      alert('ส่งเอกสารเรียบร้อยแล้ว');
      setTitle(''); setDocNumber(''); setReceiverDept(''); setFile(null);
      fetchDocuments(user);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งเอกสาร');
    }
  };

  // ฟังก์ชันอัปเดตสถานะ
  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/documents/${id}/status`, { status });
      fetchDocuments(user);
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // 2. ส่วนแสดงผลเมื่อยังไม่ได้ล็อกอิน
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-6">
            <FileText className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-800">
              {isResetting ? 'ตั้งรหัสผ่านใหม่' : isRegistering ? 'สมัครสมาชิกใหม่' : 'ระบบรับ-ส่งเอกสาร'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isResetting ? 'กรอก Username และรหัสผ่านใหม่' : isRegistering ? 'กรอกข้อมูลเพื่อลงทะเบียนเข้าใช้งาน' : 'กรุณาเข้าสู่ระบบเพื่อใช้งาน'}
            </p>
          </div>

          {/* ฟอร์มตั้งรหัสผ่านใหม่ */}
          {isResetting ? (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                <input type="text" className="w-full p-2.5 border rounded-lg text-sm" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่านใหม่ (New Password)</label>
                <input type="password" className="w-full p-2.5 border rounded-lg text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 text-sm mt-2 flex items-center justify-center gap-2">
                <KeyRound size={16} /> ยืนยันการเปลี่ยนรหัสผ่าน
              </button>
              <button type="button" onClick={() => setIsResetting(false)} className="w-full text-slate-500 text-xs text-center hover:underline pt-2">
                ยกเลิก / กลับไปหน้าเข้าสู่ระบบ
              </button>
            </form>
          ) : isRegistering ? (
            /* ฟอร์มสมัครสมาชิก */
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input type="text" className="w-full p-2.5 border rounded-lg text-sm" value={regFullname} onChange={e => setRegFullname(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">แผนก/ฝ่ายงาน</label>
                <input type="text" className="w-full p-2.5 border rounded-lg text-sm" value={regDepartment} onChange={e => setRegDepartment(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                <input type="text" className="w-full p-2.5 border rounded-lg text-sm" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                <input type="password" className="w-full p-2.5 border rounded-lg text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 text-sm mt-2">
                ยืนยันการสมัครสมาชิก
              </button>
              <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-slate-500 text-xs text-center hover:underline pt-2">
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </button>
            </form>
          ) : (
            /* ฟอร์มเข้าสู่ระบบ */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน</label>
                <input type="text" className="w-full p-3 border rounded-xl" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                <input type="password" className="w-full p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">
                เข้าสู่ระบบ
              </button>
              <div className="flex justify-between items-center text-xs pt-2">
                <button type="button" onClick={() => { setIsRegistering(true); setUsername(''); setPassword(''); }} className="text-blue-600 hover:underline">
                  ยังไม่มีบัญชี? สมัครสมาชิกใหม่
                </button>
                <button type="button" onClick={() => { setIsResetting(true); setUsername(''); setPassword(''); setNewPassword(''); }} className="text-slate-500 hover:underline">
                  ลืมรหัสผ่าน?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 3. ส่วนแสดงผลหลักหลังล็อกอินสำเร็จ
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl">
          <FileText /> ระบบรับ-ส่งเอกสาร
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            {user?.fullname} ({user?.department})
            {user?.role === 'admin' && (
              <span className="bg-amber-400 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert size={12} /> Admin
              </span>
            )}
          </span>
          <button onClick={() => setIsLoggedIn(false)} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg text-sm flex items-center gap-1">
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Send className="text-blue-600" size={20} /> ส่งเอกสารใหม่
          </h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <input type="text" placeholder="เลขที่หนังสือ" className="w-full p-2.5 border rounded-lg text-sm" value={docNumber} onChange={e => setDocNumber(e.target.value)} required />
            <input type="text" placeholder="ชื่อเรื่องเอกสาร" className="w-full p-2.5 border rounded-lg text-sm" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="text" placeholder="แผนกผู้รับ" className="w-full p-2.5 border rounded-lg text-sm" value={receiverDept} onChange={e => setReceiverDept(e.target.value)} required />
            <input type="file" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setFile(e.target.files[0])} required />
            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 text-sm flex items-center justify-center gap-2">
              <Upload size={16} /> อัปโหลดและส่ง
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              {user?.role === 'admin' ? 'รายการเอกสารทั้งหมด (สิทธิ์ Admin)' : 'รายการเอกสารของแผนก'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-3">เลขที่</th>
                  <th className="p-3">เรื่อง</th>
                  <th className="p-3">ผู้ส่ง ➔ ผู้รับ</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">ไฟล์แนบ</th>
                  <th className="p-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => {
                  const filePath = doc.file_path || doc.filepath || doc.path;
                  const fileUrl = filePath 
                    ? `http://localhost:5000/${filePath.replace(/\\/g, '/')}`
                    : null;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium">{doc.doc_number}</td>
                      <td className="p-3">{doc.title}</td>
                      <td className="p-3 text-slate-500">{doc.sender_dept} ➔ {doc.receiver_dept}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                          doc.status === 'received' ? 'bg-green-100 text-green-700' :
                          doc.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {doc.status === 'received' && <CheckCircle size={12} />}
                          {doc.status === 'rejected' && <XCircle size={12} />}
                          {doc.status === 'pending' && <Clock size={12} />}
                          {doc.status}
                        </span>
                      </td>
                      
                      <td className="p-3">
                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink size={13} /> เปิดดูไฟล์
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">ไม่มีไฟล์</span>
                        )}
                      </td>

                      <td className="p-3">
                        {doc.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatusChange(doc.id, 'received')} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">รับ</button>
                            <button onClick={() => handleStatusChange(doc.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">ตีกลับ</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}