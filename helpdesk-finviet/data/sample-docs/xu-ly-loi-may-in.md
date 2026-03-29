# Xử lý lỗi máy in

## Các lỗi thường gặp

### 1. Máy in không in được
**Kiểm tra:**
- Máy in bật nguồn chưa?
- Đèn báo lỗi có sáng không?
- Cáp USB/mạng kết nối chưa?

**Giải pháp:**
1. Khởi động lại máy in (tắt 30 giây → bật lại)
2. Kiểm tra hàng chờ in: Control Panel → Devices and Printers → Click phải máy in → See what's printing → Cancel All
3. Khởi động lại Print Spooler:
   - Mở Command Prompt (Run as Administrator)
   - Gõ: `net stop spooler`
   - Gõ: `net start spooler`
4. Thử in test page

### 2. Máy in bị kẹt giấy
1. Tắt máy in
2. Mở nắp trước/sau theo hướng dẫn trên máy
3. Nhẹ nhàng kéo giấy ra theo hướng giấy chạy
4. Kiểm tra không còn mảnh giấy nhỏ bên trong
5. Đóng nắp, bật máy lại

### 3. In bị mờ/nhòe
- Kiểm tra mực/toner còn không
- Chạy Head Cleaning (trong Printer Preferences)
- Thay cartridge nếu cần

### 4. Không tìm thấy máy in mạng
1. Kiểm tra máy in và máy tính cùng mạng LAN
2. Ping địa chỉ IP máy in: `ping 192.168.1.xxx`
3. Add printer thủ công: Devices and Printers → Add Printer → TCP/IP → Nhập IP

## Danh sách máy in FinViet
| Tầng | Model | IP |
|------|-------|-----|
| 1 | HP LaserJet Pro M404dn | 192.168.1.101 |
| 2 | Canon LBP226dw | 192.168.1.102 |
| 3 | Brother HL-L2350DW | 192.168.1.103 |
| 4 | HP Color LaserJet Pro M255dw | 192.168.1.104 |

## Tags
máy in, printer, kẹt giấy, in lỗi, mạng, spooler
