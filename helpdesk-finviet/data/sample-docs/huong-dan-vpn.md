# Hướng dẫn kết nối VPN

## Vấn đề
Nhân viên làm việc từ xa cần kết nối VPN để truy cập hệ thống nội bộ.

## Yêu cầu
- Máy tính có cài phần mềm FortiClient VPN
- Tài khoản VPN đã được IT cấp
- Kết nối internet ổn định

## Các bước thực hiện

### Bước 1: Cài đặt FortiClient
1. Tải FortiClient từ https://www.fortinet.com/support/product-downloads
2. Chọn phiên bản phù hợp (Windows/Mac)
3. Cài đặt với quyền Administrator

### Bước 2: Cấu hình VPN
1. Mở FortiClient
2. Chọn "Remote Access" → "Configure VPN"
3. Điền thông tin:
   - VPN Type: SSL-VPN
   - Connection Name: FinViet VPN
   - Remote Gateway: vpn.finviet.com
   - Port: 443
4. Nhấn "Save"

### Bước 3: Kết nối
1. Chọn connection "FinViet VPN"
2. Nhập Username và Password VPN
3. Nhấn "Connect"
4. Nhập mã OTP từ app Authenticator
5. Chờ kết nối thành công (icon xanh)

## Xử lý lỗi thường gặp

### Lỗi "Connection Timeout"
- Kiểm tra internet
- Thử đổi DNS sang 8.8.8.8
- Khởi động lại FortiClient

### Lỗi "Invalid Credentials"
- Kiểm tra lại username/password
- Đảm bảo Caps Lock tắt
- Liên hệ IT nếu quên mật khẩu VPN

### Lỗi "Certificate Error"
- Cập nhật FortiClient lên phiên bản mới nhất
- Liên hệ IT để cấp lại certificate

## Tags
vpn, kết nối, forticlient, remote, làm việc từ xa, ssl
