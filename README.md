# 🤖 IoTDevBot - WhatsApp Bot for IoT & Coding

Bot WhatsApp pintar yang didesain khusus untuk membantu engineer dan hobiis di bidang Internet of Things (IoT) serta pemrograman embedded. Didukung oleh Groq AI (Llama 3/Mixtral).

## 🚀 Fitur Utama
- **AI Brain**: Menjawab pertanyaan teknis seputar ESP32, Arduino, C++, Python, dsb.
- **Strict Context**: Menolak pertanyaan di luar domain IoT & Coding.
- **Hardware Integration**: Dilengkapi HTTP API untuk menerima data dari ESP32 nyata.
- **Remote Control**: Kontrol LED/Relay langsung melalui WhatsApp.
- **History Chat**: Menyimpan ingatan percakapan per user (JSON).
- **Auto Reconnect**: Sistem tetap online meskipun koneksi sempat terputus.

## 🛠️ Instalasi

1. **Clone/Download** folder ini.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Konfigurasi API**:
   Buka file `.env` dan masukkan API Key dari [Groq Console](https://console.groq.com/).
   ```env
   GROQ_API_KEY=gsk_xxxx
   GROQ_MODEL=llama-3.3-70b-versatile
   WA_NUMBER=628xxxx@s.whatsapp.net (nomor admin untuk alert)
   ```
4. **Jalankan Bot**:
   ```bash
   npm start
   ```
5. **Scan QR Code**: Scan QR yang muncul di terminal menggunakan WhatsApp di HP Anda.

## 📱 Cara Penggunaan

### Bertanya ke AI
Kirim pesan biasa seputar coding atau hardware.
> User: "Gimana cara baca sensor DHT11 di ESP32?"
> Bot: (Akan memberikan langkah dan kode C++)

### Perintah Khusus
- `!status` : Melihat data sensor terbaru yang dikirim oleh ESP32.
- `!led on` : Menyalakan LED di hardware (via HTTP polling).
- `!led off` : Mematikan LED.

## 🔌 Integrasi ESP32 (Arduino IDE)
Contoh pengiriman data dari ESP32 ke Bot:

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendDataToBot(float temp) {
    HTTPClient http;
    http.begin("http://IP_KOMPUTER_ANDA:3000/api/sensor");
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["sensor"] = "temperature";
    doc["value"] = temp;
    doc["unit"] = "C";
    doc["deviceId"] = "ESP32_LAB_1";

    String requestBody;
    serializeJson(doc, requestBody);
    int httpResponseCode = http.POST(requestBody);
    http.end();
}
```

## 📂 Struktur File
- `index.js`: Main bot logic & connectior.
- `prompt.js`: System prompt (Otak bot).
- `iot_handler.js`: Server HTTP API untuk hardware.
- `auth_info_baileys/`: Folder session (jangan dihapus agar tidak login ulang).
- `history.json`: Database chat sederhana.
