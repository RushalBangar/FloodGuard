/*
 * LifeGuard ESP32 Node 3: Wildfire & Air Quality Monitoring
 * 
 * Sensors:
 * - DHT11 -> Temp/Humidity
 * - MQ-135 (Analog) -> Smoke/CO2/Gas PPM
 * - Flame Sensor (Digital) -> Fire Detection
 * 
 * Node Description:
 * Monitors forest environment for early fire detection and air quality.
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws";
const char* API_URL = "https://floodguard-8sfc.onrender.com/api/sensor-data";

// --- Pin Definitions ---
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define MQ135_PIN 35
#define FLAME_PIN 32
#define BUZZER_PIN 13
#define LED_PIN 14

// --- Global Objects ---
WebsocketsClient client;
DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastUpdate = 0;
const int UPDATE_INTERVAL = 5000;

void setup() {
  delay(2000);
  Serial.begin(115200);
  Serial.println("\n[BOOT] Fire Node Starting...");
  
  pinMode(MQ135_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[BOOT] Pins Initialized.");
  
  dht.begin();
  digitalWrite(LED_PIN, HIGH);
  
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
  Serial.println("[BOOT] WebSocket Configured.");
  
  client.setInsecure();
  
  // Add Browser-like headers to fool the server
  client.addHeader("Origin", "https://floodguard-8sfc.onrender.com");
  client.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36");
  Serial.println("[BOOT] WebSocket Configured with Browser Headers.");
  
  // Resolve IP Address to check DNS
  IPAddress serverIP;
  if (WiFi.hostByName("floodguard-8sfc.onrender.com", serverIP)) {
    Serial.print("[BOOT] Server IP Found: ");
    Serial.println(serverIP);
  } else {
    Serial.println("[BOOT] DNS FAILED! ESP32 cannot find the server address.");
  }
  
  Serial.println("[BOOT] Connecting to Server (Final Attempt)...");
  bool connected = client.connect(WS_URL);
  if (connected) {
    Serial.println("[BOOT] SUCCESS! Connected to LifeGuard Server.");
  } else {
    Serial.println("[BOOT] STILL FAILED. Your ISP or Router might be blocking WebSockets.");
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
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void sendSensorData() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int gasRaw = (digitalRead(MQ135_PIN) == LOW) ? 4000 : 0; // Digital MQ-135: LOW means smoke detected
  float gasPPM = map(gasRaw, 0, 4095, 0, 2000); 
  bool flame = digitalRead(FLAME_PIN) == LOW; 
  bool gasAlert = (gasRaw > 3500); 

  Serial.print("[DATA] Gas Raw: "); Serial.print(gasRaw);
  Serial.print(" | Flame: "); Serial.print(flame ? "FIRE!" : "None");
  Serial.print(" | Alert: "); Serial.println(gasAlert ? "YES" : "NO");

  // --- Alert Logic ---
  if (flame || gasAlert) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1500); 
  } else {
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  }

  // --- Data Reporting ---
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  StaticJsonDocument<300> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_fire_01";
  doc["disaster"] = "fire";
  doc["temperature"] = t;
  doc["humidity"] = h;
  doc["gas_raw"] = gasRaw;
  doc["flame_detected"] = flame;

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
}

void onMessageCallback(WebsocketsMessage message) {
  StaticJsonDocument<300> doc;
  deserializeJson(doc, message.data());
  String type = doc["type"];
  String status = doc["status"];
  
  if (type == "prediction" && (status == "High Fire Risk" || status == "Danger")) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2000, 2000); // 2 second burst
  }
}

