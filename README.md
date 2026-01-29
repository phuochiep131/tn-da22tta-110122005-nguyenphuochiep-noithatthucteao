# 🏠 WEBSITE BÁN NỘI THẤT TÍCH HỢP AI CHATBOT TƯ VẤN KHÁCH HÀNG

---

## 👨‍💻 Thông tin tác giả
- **Họ và tên:** Nguyễn Phước Hiệp  
- **MSSV:** 110122005  
- **Lớp:** DA22TTA  
- **Email:** nphhiep1301@gmail.com  

---

## 🚀 Giới thiệu dự án
Dự án xây dựng một **website bán nội thất trực tuyến**, hỗ trợ người dùng mua sắm dễ dàng với các chức năng hiện đại:

- 🛒 Mua bán sản phẩm nội thất online
- 🤖 **AI Chatbot** tư vấn sản phẩm tự động
- 💳 Thanh toán online qua **VNPAY**
- 🧑‍💼 Trang **Admin** quản lý sản phẩm, đơn hàng và người dùng

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### 🔙 Backend
- Java Spring Boot
- Hibernate / JPA
- Maven

### 🌐 Frontend
- ReactJS
- Tailwind CSS

### 🗄️ Database
- MySQL

### 🤖 AI
- OpenAI API

### 💳 Thanh toán
- VNPAY Sandbox

---

## ⚙️ Cấu hình & Cài đặt

### 🖥️ Yêu cầu môi trường
- Java JDK 21+
- Node.js 22+
- MySQL 8+
- Maven 3.8+
- IDE: IntelliJ IDEA / Eclipse / VS Code

---

## 🔧 Cấu hình Backend

### Bước 1: Tạo Database
Mở MySQL Workbench hoặc phpMyAdmin và tạo database:

```sql
CREATE DATABASE interior_shop;
```

### Bước 2: Cấu hình application.properties
Mở file **application.properties** tại **backend/src/main/resources/application.properties**

```properties
# ================= DATABASE =================
spring.datasource.url=jdbc:mysql://localhost:3306/interior_shop?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=YOUR_DB_PASSWORD

# ================= JPA =================
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# ================= MAIL =================
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_EMAIL@gmail.com
spring.mail.password=YOUR_APP_PASSWORD

# ================= AI CHATBOT =================
openai.api.key=YOUR_OPENAI_API_KEY

# ================= VNPAY =================
vnpay.tmn_code=YOUR_TMN_CODE
vnpay.hash_secret=YOUR_HASH_SECRET
vnpay.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
vnpay.return_url=http://localhost:3000/payment/result
```
---
## ▶️ Chạy Backend (Spring Boot)
**Mở Terminal và chạy lệnh**
```properties
cd backend
mvn clean install
mvn spring-boot:run
```

## 🌐 Chạy Frontend (ReactJS)
**Mở Terminal và chạy lệnh**
```properties
cd frontend
npm install
npm run dev
```
**Kết quả**

```
http://localhost:5173
```
