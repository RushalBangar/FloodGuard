/*
 * LifeGuard ESP32 Node 1: Flood & Rainfall Monitoring
 * 
 * Sensors:
 * - HC-SR04 (Ultrasonic) -> Water Level
 * - Rain Sensor (Analog) -> Rainfall Rate
 * 
 * Node Description:
 * Monitors water levels in rivers/drains and real-time precipitation.
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws";
const char* API_URL = "https://floodguard-8sfc.onrender.com/api/sensor-data";

// --- Pin Definitions ---
#define TRIG_PIN 5
#define ECHO_PIN 18
#define RAIN_PIN 34
#define BUZZER_PIN 13
#define LED_PIN 14

// --- Constants ---
const float MAX_DISTANCE = 200.0;
const int UPDATE_INTERVAL = 3000; 

// --- Global Objects ---
WebsocketsClient client;
unsigned long lastUpdate = 0;

void setup() {
  delay(2000);
  Serial.begin(115200);
  Serial.println("\n[BOOT] Flood Node Starting...");
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[BOOT] Pins Initialized.");
  
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

float getWaterLevel() {
  // Speed of sound compensation
  float speedOfSound = 331.3 + (0.606 * 25.0); 
  float speedInCmPerMicro = speedOfSound / 10000.0;

  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Added 30ms timeout to prevent blocking (covers ~5 meters)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
  
  float distance = duration * speedInCmPerMicro / 2;
  float level = (MAX_DISTANCE - distance) / MAX_DISTANCE;
  return constrain(level, 0.0, 1.0);
}

float getRainfall() {
  int sensorValue = analogRead(RAIN_PIN);
  return map(sensorValue, 4095, 0, 0, 50);
}

void sendSensorData() {
  float waterLevel = getWaterLevel();
  float rainfall = getRainfall();

  Serial.print("[DATA] Water Level: "); Serial.print(waterLevel * 100);
  Serial.print("% | Rainfall: "); Serial.println(rainfall);

  StaticJsonDocument<200> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_flood_01";
  doc["disaster"] = "flood";
  doc["water_level"] = waterLevel;
  doc["rainfall"] = rainfall;

  String json;
  serializeJson(doc, json);

  // --- SEND VIA HTTP API (Guaranteed Delivery) ---
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(3000); // 3 second timeout
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

  // Local Alert Logic
  if (waterLevel > 0.7 || rainfall > 30) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1000);
  } else {
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  }
}

void onMessageCallback(WebsocketsMessage message) {
  StaticJsonDocument<300> doc;
  deserializeJson(doc, message.data());
  String type = doc["type"];
  
  if (type == "prediction" && doc["status"] == "Danger") {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1500, 2000);
  }
}
