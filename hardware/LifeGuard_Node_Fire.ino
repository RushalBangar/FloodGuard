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
#define BUZZER_PIN 19

// --- Global Objects ---
WebsocketsClient client;
DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastUpdate = 0;
const int UPDATE_INTERVAL = 5000;

void setup() {
  Serial.begin(115200);
  pinMode(MQ135_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  dht.begin();
  connectWiFi();
  client.connect(WS_URL);
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
  float gasPPM = map(gasRaw, 0, 4095, 0, 2000); // Simplified mapping
  bool flame = digitalRead(FLAME_PIN) == LOW; // Usually LOW when flame detected

  if (isnan(h) || isnan(t)) return;

  StaticJsonDocument<300> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_fire_01";
  doc["temperature"] = t;
  doc["humidity"] = h;
  doc["gas_ppm"] = gasPPM;
  doc["flame_detected"] = flame;

  String json;
  serializeJson(doc, json);
  client.send(json);
  
  if (flame || gasPPM > 500) {
    tone(BUZZER_PIN, 1500); // Local alert
  } else {
    noTone(BUZZER_PIN);
  }
}
