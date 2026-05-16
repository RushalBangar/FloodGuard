/*
 * LifeGuard ESP32 Node 2: Earthquake & Structural Vibration Monitoring
 * 
 * Sensors:
 * - MPU6050 (I2C) -> 3-Axis Acceleration & Gyro
 * - SW420 (Digital) -> Vibration/Shock Detection
 * 
 * Node Description:
 * Detects seismic activity and structural tremors.
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws"; 

// --- Pin Definitions ---
#define VIBRATION_PIN 27 // SW420 Digital Out
#define BUZZER_PIN 19

// --- Global Objects ---
WebsocketsClient client;
Adafruit_MPU6050 mpu;
unsigned long lastUpdate = 0;
const int UPDATE_INTERVAL = 2000; // Faster updates for tremors

void setup() {
  Serial.begin(115200);
  pinMode(VIBRATION_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) { delay(10); }
  }
  
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
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  bool shock = digitalRead(VIBRATION_PIN) == HIGH;

  StaticJsonDocument<300> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_quake_01";
  doc["vib_x"] = a.acceleration.x;
  doc["vib_y"] = a.acceleration.y;
  doc["vib_z"] = a.acceleration.z;
  doc["shock_alert"] = shock;

  String json;
  serializeJson(doc, json);
  client.send(json);
  
  if (shock) {
    tone(BUZZER_PIN, 2000, 200); // Local warning
  }
}
