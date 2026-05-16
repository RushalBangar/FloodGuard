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

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws"; 

// --- Pin Definitions ---
#define TRIG_PIN 5
#define ECHO_PIN 18
#define RAIN_PIN 34
#define BUZZER_PIN 19

// --- Constants ---
const float MAX_DISTANCE = 200.0;
const int UPDATE_INTERVAL = 5000; 

// --- Global Objects ---
WebsocketsClient client;
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  connectWiFi();
  client.onMessage(onMessageCallback);
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
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nConnected!");
}

float getWaterLevel() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;
  float level = (MAX_DISTANCE - distance) / MAX_DISTANCE;
  return constrain(level, 0.0, 1.0);
}

float getRainfall() {
  int sensorValue = analogRead(RAIN_PIN);
  return map(sensorValue, 4095, 0, 0, 50);
}

void sendSensorData() {
  StaticJsonDocument<200> doc;
  doc["type"] = "sensor_data";
  doc["node_id"] = "node_flood_01";
  doc["water_level"] = getWaterLevel();
  doc["rainfall"] = getRainfall();

  String json;
  serializeJson(doc, json);
  client.send(json);
}

void onMessageCallback(WebsocketsMessage message) {
  // Handle alerts/commands from server
}
