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

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws"; 

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
  digitalWrite(LED_PIN, LOW);
  
  client.onMessage(onMessageCallback);
  client.setInsecure();
  Serial.println("[BOOT] WebSocket Configured.");
  
  Serial.println("[BOOT] Connecting to Server...");
  client.connect(WS_URL);
  Serial.println("[BOOT] Setup Complete!");
}


void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (client.available()) client.poll();
  else { client.connect(WS_URL); delay(2000); }

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
  int gasRaw = analogRead(MQ135_PIN);
  float gasPPM = map(gasRaw, 0, 4095, 0, 2000); 
  bool flame = digitalRead(FLAME_PIN) == LOW; 
  bool gasAlert = gasPPM > 700; // Increased threshold for stability during warmup

  // --- Alert Logic (Always runs, independent of DHT status) ---
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
  doc["gas_ppm"] = gasPPM;
  doc["flame_detected"] = flame;

  String json;
  serializeJson(doc, json);
  client.send(json);
}

void onMessageCallback(WebsocketsMessage message) {
  StaticJsonDocument<300> doc;
  deserializeJson(doc, message.data());
  String type = doc["type"];
  
  if (type == "prediction" && doc["status"] == "Danger") {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2000, 2000);
  }
}

