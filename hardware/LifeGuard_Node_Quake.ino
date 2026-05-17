/*
 * LifeGuard ESP32 Node 2: Earthquake & Structural Vibration Monitoring
 * 
 * Sensors:
 * - MPU6050 (Raw I2C) -> 3-Axis Acceleration
 * - SW420 (Digital) -> Vibration/Shock Detection
 * 
 * Version: 2.0 (Library-Free for maximum compatibility)
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws";
const char* API_URL = "https://floodguard-8sfc.onrender.com/api/sensor-data";

// --- Pin Definitions ---
#define VIBRATION_PIN 27 // SW420 Digital Out
#define BUZZER_PIN 13
#define LED_PIN 14
#define I2C_SDA 21
#define I2C_SCL 22

// --- Global Objects ---
WebsocketsClient client;
unsigned long lastUpdate = 0;
const int UPDATE_INTERVAL = 2000; 

void setup() {
  delay(2000);
  Serial.begin(115200);
  Serial.println("\n[BOOT] Quake Node Starting...");
  
  pinMode(VIBRATION_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[BOOT] Pins Initialized.");
  
  digitalWrite(LED_PIN, HIGH);
  
  // Initialize I2C
  Serial.println("[BOOT] Initializing I2C...");
  Wire.begin(I2C_SDA, I2C_SCL);
  delay(500);

  // Manual Wake-up for MPU6050
  Wire.beginTransmission(0x68);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Wake up!
  Wire.endTransmission();
  Serial.println("[BOOT] MPU6050 Woken.");
  
  Serial.println("[BOOT] Connecting to WiFi...");
  connectWiFi();
  Serial.println("[BOOT] WiFi Connected!");
  
  // Sync Time for SSL
  Serial.println("[BOOT] Syncing Time...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println("\n[BOOT] Time Synced!");
  digitalWrite(LED_PIN, LOW);
  
  client.onMessage(onMessageCallback);
  client.setInsecure();
  client.addHeader("Origin", "https://floodguard-8sfc.onrender.com");
  Serial.println("[BOOT] WebSocket Configured.");
  
  Serial.println("[BOOT] Connecting to Server (SECURE)...");
  bool connected = client.connect(WS_URL);
  if (connected) {
    Serial.println("[BOOT] Setup Complete! Connected to LifeGuard Server.");
  } else {
    Serial.println("[BOOT] CONNECTION FAILED! Check Render Dashboard Logs.");
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  
  if (client.available()) {
    client.poll();
  } else { 
    // Non-blocking reconnection every 10 seconds
    static unsigned long lastWsRetry = 0;
    if (millis() - lastWsRetry >= 10000) {
      Serial.println("[WS] Attempting Reconnect (Non-blocking)...");
      client.setInsecure();
      client.addHeader("Origin", "https://floodguard-8sfc.onrender.com");
      client.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36");
      client.connect(WS_URL); 
      lastWsRetry = millis();
    }
  }

  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    sendSensorData();
    lastUpdate = millis();
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void sendSensorData() {
  // Read 6 bytes of acceleration data starting from register 0x3B
  Wire.beginTransmission(0x68);
  Wire.write(0x3B); 
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 6, true);

  // Combine high and low bytes
  int16_t rawX = Wire.read() << 8 | Wire.read();
  int16_t rawY = Wire.read() << 8 | Wire.read();
  int16_t rawZ = Wire.read() << 8 | Wire.read();

  // Convert to G-force (LSB sensitivity at +/- 2g is 16384 LSB/g)
  float ax = (float)rawX / 16384.0;
  float ay = (float)rawY / 16384.0;
  float az = (float)rawZ / 16384.0;

  bool shock = digitalRead(VIBRATION_PIN) == HIGH;

  StaticJsonDocument<300> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_quake_01";
  doc["disaster"] = "quake";
  doc["vib_x"] = ax;
  doc["vib_y"] = ay;
  doc["vib_z"] = az;
  doc["shock_alert"] = shock;

  String json;
  serializeJson(doc, json);

  // --- SEND VIA HTTP API (Guaranteed Delivery) ---
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(7000); // 7 second timeout (more reliable for Render)
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36");
    
    int httpResponseCode = http.POST(json);
    
    if (httpResponseCode > 0) {
      Serial.print("[HTTP] Data sent, response: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("[HTTP] Error sending data: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
  
  Serial.print("Accel X: "); Serial.print(ax);
  Serial.print(" Y: "); Serial.print(ay);
  Serial.print(" Z: "); Serial.println(az);

  // Alert Logic (High G-force or vibration)
  if (shock || abs(ax) > 1.5 || abs(ay) > 1.5) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2000, 500);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}

void onMessageCallback(WebsocketsMessage message) {
  StaticJsonDocument<300> doc;
  deserializeJson(doc, message.data());
  String type = doc["type"];
  String status = doc["status"];
  
  if (type == "prediction" && (status == "Structural Threat" || status == "Danger")) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2500, 2000);
  }
}
