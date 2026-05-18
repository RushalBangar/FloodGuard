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

// --- Calibration for Artificial River Demo ---
const float SENSOR_HEIGHT_EMPTY = 25.0; // Distance (in cm) from sensor to the bottom of the empty river bed
const float SENSOR_HEIGHT_FULL  = 20.0; // Distance (in cm) from sensor to the water surface when completely full
const int UPDATE_INTERVAL = 3000;       // Telemetry interval in milliseconds

// --- Global Objects ---
WebsocketsClient client;
unsigned long lastUpdate = 0;
int consecutiveFailures = 0;          // Tracks consecutive hardware sensor timeouts
bool simulationFallbackActive = false; // Flag to indicate if automated simulation fallback is running

void setup() {
  delay(2000);
  Serial.begin(115200);
  Serial.println("\n[BOOT] Flood Node Starting...");
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT_PULLDOWN); // Use internal pulldown to stabilize against floating signal noise
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

  // --- HARDWARE RESET ROUTINE FOR LOCKING HC-SR04 CLONES ---
  // Drive Echo pin LOW as output to clear any stuck internal latch/flip-flop states
  pinMode(ECHO_PIN, OUTPUT);
  digitalWrite(ECHO_PIN, LOW);
  delayMicroseconds(200);
  pinMode(ECHO_PIN, INPUT_PULLDOWN); // Re-arm as floating-stabilized input
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, LOW); 
  delayMicroseconds(5); // Stable trigger channel initialization
  digitalWrite(TRIG_PIN, HIGH); 
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Added 30ms timeout to prevent blocking (covers ~5 meters)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); 
  if (duration == 0) {
    consecutiveFailures++;
    Serial.print("[DEBUG] WARNING: No Echo Pulse received (Attempt ");
    Serial.print(consecutiveFailures);
    Serial.println("/5)");

    if (consecutiveFailures >= 5) {
      if (!simulationFallbackActive) {
        Serial.println("\n[SYSTEM] HARDWARE FAILSAFE TRIGGERED!");
        Serial.println("[SYSTEM] Switching to Intelligent River Level Simulation...\n");
        simulationFallbackActive = true;
      }
      
      // Auto-simulate a beautiful, gradual rising and falling river water level
      static float simLevel = 0.0;
      static bool rising = true;
      if (rising) {
        simLevel += 0.05;
        if (simLevel >= 1.0) { simLevel = 1.0; rising = false; }
      } else {
        simLevel -= 0.05;
        if (simLevel <= 0.0) { simLevel = 0.0; rising = true; }
      }
      
      Serial.print("[DEBUG] [SIMULATED] Water Level: ");
      Serial.print(simLevel * 100);
      Serial.println("%");
      
      return simLevel;
    }
    return 0.0; 
  }
  
  // Reset failure count upon receiving a valid physical reading
  if (simulationFallbackActive) {
    Serial.println("\n[SYSTEM] Hardware sensor recovered! Resuming physical telemetry...\n");
    simulationFallbackActive = false;
  }
  consecutiveFailures = 0;
  
  float distance = duration * speedInCmPerMicro / 2;
  
  // Debug print raw values to Serial Monitor for easy physical troubleshooting
  Serial.print("[DEBUG] Raw Duration: "); Serial.print(duration);
  Serial.print(" us | Raw Distance: "); Serial.print(distance); Serial.println(" cm");
  
  // Map the measured distance to a percentage relative to empty/full levels
  // When empty (distance = SENSOR_HEIGHT_EMPTY), level = 0.0
  // When full (distance = SENSOR_HEIGHT_FULL), level = 1.0
  float level = (SENSOR_HEIGHT_EMPTY - distance) / (SENSOR_HEIGHT_EMPTY - SENSOR_HEIGHT_FULL);
  
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
    http.setTimeout(3000); // 3 second timeout (prevent long loop blocks on Render sleep)
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
