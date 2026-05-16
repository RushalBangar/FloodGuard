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
const char* WIFI_SSID = "Tiger";
const char* WIFI_PASSWORD = "rushi123";
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws"; 

// --- Pin Definitions ---
#define VIBRATION_PIN 27 // SW420 Digital Out
#define BUZZER_PIN 19
#define LED_PIN 2
#define I2C_SDA 21
#define I2C_SCL 22

// --- Global Objects ---
WebsocketsClient client;
Adafruit_MPU6050 mpu;
unsigned long lastUpdate = 0;
const int UPDATE_INTERVAL = 2000; 

void setup() {
  Serial.begin(115200);
  pinMode(VIBRATION_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, HIGH);
  // Initialize I2C with defined pins and wait for stabilization
  Wire.begin(I2C_SDA, I2C_SCL);
  delay(100);
  
  if (!mpu.begin(0x68)) {
    Serial.println("Failed to find MPU6050 chip at 0x68");
    while (1) { delay(10); }
  }
  
  Serial.println("MPU6050 Found!");
  connectWiFi();

  digitalWrite(LED_PIN, LOW);
  
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
  
  if (shock || abs(a.acceleration.x) > 15 || abs(a.acceleration.y) > 15) {
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
  
  if (type == "prediction" && doc["status"] == "Danger") {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2500, 2000);
  }
}

