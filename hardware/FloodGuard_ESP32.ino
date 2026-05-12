/*
 * LifeGuard ESP32 IoT Firmware (WebSocket Version)
 * 
 * Sensors:
 * - HC-SR04 (Ultrasonic) -> Water Level
 * - DHT11/22 -> Temp/Humidity
 * - Rain Sensor (Analog) -> Rainfall Rate
 * 
 * Actuators:
 * - Buzzer & RGB LED -> Local Alerts
 * - Push Button -> SOS Signal
 * 
 * Libraries Required:
 * - ArduinoJson by Benoit Blanchon
 * - DHT sensor library by Adafruit
 * - Adafruit Unified Sensor by Adafruit
 * - ArduinoWebsockets by Gil Maimon
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>

using namespace websockets;

// --- Configuration ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Production URL (Render): wss://floodguard-8sfc.onrender.com/ws
// Local URL: ws://192.168.1.X:5000/ws
const char* WS_URL = "wss://floodguard-8sfc.onrender.com/ws"; 

// --- Pin Definitions ---
#define TRIG_PIN 5
#define ECHO_PIN 18
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define RAIN_PIN 34
#define SOS_BUTTON 27
#define BUZZER_PIN 19
#define LED_R 13
#define LED_G 12
#define LED_B 14

// --- Constants ---
const float MAX_DISTANCE = 200.0;
const int UPDATE_INTERVAL = 5000; // 5 seconds for fast updates

// --- Global Objects ---
DHT dht(DHT_PIN, DHT_TYPE);
WebsocketsClient client;
unsigned long lastUpdate = 0;
volatile bool sosTriggered = false;

// --- Interrupt Service Routine for SOS ---
void IRAM_ATTR handleSOS() {
  sosTriggered = true;
}

void onMessageCallback(WebsocketsMessage message) {
  Serial.print("Got Message: ");
  Serial.println(message.data());
  
  StaticJsonDocument<500> doc;
  DeserializationError error = deserializeJson(doc, message.data());
  
  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  String type = doc["type"];
  if (type == "prediction") {
    String status = doc["status"];
    handleRiskStatus(status);
  }
}

void onEventsCallback(WebsocketsEvent event, String data) {
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("Connnection Opened");
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("Connnection Closed");
  } else if (event == WebsocketsEvent::GotPing) {
    Serial.println("Got a Ping!");
  } else if (event == WebsocketsEvent::GotPong) {
    Serial.println("Got a Pong!");
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(SOS_BUTTON, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  
  attachInterrupt(SOS_BUTTON, handleSOS, FALLING);
  
  dht.begin();
  
  connectWiFi();
  
  // Setup callbacks
  client.onMessage(onMessageCallback);
  client.onEvent(onEventsCallback);
  
  // Connect to server
  client.connect(WS_URL);
  client.ping();

  setLED(0, 255, 0);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (client.available()) {
    client.poll();
  } else {
    Serial.println("WebSocket disconnected, reconnecting...");
    client.connect(WS_URL);
    delay(2000);
  }

  if (sosTriggered) {
    sendSOS();
    sosTriggered = false;
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

float getWaterLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
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
  float waterLevel = getWaterLevel();
  float rainfall = getRainfall();
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) return;

  StaticJsonDocument<200> doc;
  doc["type"] = "sensor_data";
  doc["water_level"] = waterLevel;
  doc["rainfall"] = rainfall;
  doc["humidity"] = humidity;
  doc["temperature"] = temperature;

  String json;
  serializeJson(doc, json);
  client.send(json);
}

void handleRiskStatus(String status) {
  if (status == "Normal") {
    setLED(0, 255, 0);
    noTone(BUZZER_PIN);
  } else if (status == "Advisory") {
    setLED(255, 255, 0);
    noTone(BUZZER_PIN);
  } else if (status == "Danger") {
    setLED(255, 0, 0);
    tone(BUZZER_PIN, 1000);
    sendAlert("IMMEDIATE DANGER: WebSocket node reporting critical levels!");
  }
}

void sendAlert(String message) {
  StaticJsonDocument<100> doc;
  doc["type"] = "alert";
  doc["message"] = message;
  String json;
  serializeJson(doc, json);
  client.send(json);
}

void sendSOS() {
  Serial.println("SOS Triggered!");
  setLED(255, 0, 0);
  tone(BUZZER_PIN, 2000, 2000);

  StaticJsonDocument<200> doc;
  doc["type"] = "location";
  doc["lat"] = 20.0;
  doc["lng"] = 78.0; 
  doc["isSOS"] = true;
  doc["name"] = "LifeGuard-WS-Node-01";
  
  String json;
  serializeJson(doc, json);
  client.send(json);
}

void setLED(int r, int g, int b) {
  analogWrite(LED_R, r);
  analogWrite(LED_G, g);
  analogWrite(LED_B, b);
}
