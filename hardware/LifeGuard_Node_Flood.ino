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
const int UPDATE_INTERVAL = 5000; 

// --- Global Objects ---
WebsocketsClient client;
unsigned long lastUpdate = 0;

void setup() {
  delay(2000);
  Serial.begin(115200);
  Serial.println("\n[BOOT] Setup starting...");
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[BOOT] Pins initialized.");
  
  digitalWrite(LED_PIN, HIGH);
  Serial.println("[BOOT] LED On.");
  
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
  Serial.println("[BOOT] WebSocket client configured.");
  
  Serial.println("[BOOT] Connecting to Server (SECURE)...");
  bool connected = client.connect(WS_URL);
  if (connected) {
    Serial.println("[BOOT] Setup complete! Connected to LifeGuard Server.");
  } else {
    Serial.println("[BOOT] CONNECTION FAILED! Check Render Dashboard Logs.");
  }
}


void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (client.available()) client.poll();
  else { 
    client.setInsecure(); 
    client.connect("echo.websocket.org", 443, "/"); 
    delay(10000); 
  }

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
  // Speed of sound compensation: v = 331.3 + (0.606 * Temp)
  // Assuming 25 degrees if no temp sensor is present on this node
  float speedOfSound = 331.3 + (0.606 * 25.0); 
  float speedInCmPerMicro = speedOfSound / 10000.0;

  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  
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
    http.addHeader("Content-Type", "application/json");
    
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

