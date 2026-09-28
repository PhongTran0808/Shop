# ☕ Starbucks Smart Kiosk — Hướng Dẫn Khởi Chạy Đa Nền Tảng (Windows / Linux / macOS)

Dự án này được thiết kế **tối ưu đa nền tảng (Cross-Platform Ready)**. Bạn có thể copy toàn bộ thư mục `project` sang máy tính chạy **Windows 10/11**, **macOS** hoặc **Linux** và khởi chạy ngay lập tức mà không gặp bất kỳ lỗi biên dịch C++ hay đường dẫn nào.

---

## 🖥️ HƯỚNG DẪN KHỞI CHẠY TRÊN WINDOWS (CMD / POWERSHELL)

### Bước 1: Mở Command Prompt (CMD) hoặc PowerShell
Mở CMD/PowerShell và trỏ tới thư mục `project`:
```cmd
cd project
```

### Bước 2: Cài đặt thư viện & Khởi chạy Server
```cmd
npm install
npm start
```

Màn hình sẽ hiển thị:
```text
====================================================
☕ Starbucks Smart Kiosk Server Running (HTTPS)
Local Access: https://localhost:7001
LAN Access:   https://192.168.x.x:7001
====================================================
HTTP Redirect Service running on port 7000
```

---

## 🐧 HƯỚNG DẪN KHỞI CHẠY TRÊN LINUX / MACOS

Mở Terminal và gõ:
```bash
cd project
npm start
```

---

## 🛡️ TẠI SAO DỰ ÁN NÀY ĐẢM BẢO CHẠY 100% TRÊN WINDOWS?

1. **Không dùng C++ Native Addon:**  
   Sử dụng engine SQLite WebAssembly pure JavaScript (`sql.js`), **không cần cài Python, C++ Build Tools hay node-gyp** trên Windows.
2. **Đường dẫn chuẩn hóa (`path.join`):**  
   Toàn bộ đường dẫn file, database, SSL certificate được xử lý tự động phù hợp với dấu suýt ngược `\` của Windows và suýt xuôi `/` của Linux.
3. **SSL Certificate Tự Động:**  
   Module `selfsigned` tạo sẵn cặp chứng chỉ RSA 2048-bit tương thích với OpenSSL trên cả Windows và Linux.
4. **Phát hiện IP LAN tự động:**  
   Hàm `getLanIp()` tự đọc adapter mạng (`Wi-Fi`, `Ethernet`) trên Windows để tạo mã QR LAN chia sẻ.
