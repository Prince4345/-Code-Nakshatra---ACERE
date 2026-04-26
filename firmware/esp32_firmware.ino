#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_NAME";        // REPLACE THIS
const char* password = "YOUR_WIFI_PASSWORD"; // REPLACE THIS

// Server Endpoint (For Hackathon: You can use a mock endpoint or local server IP)
const char* serverUrl = "http://YOUR_LAPTOP_IP:3000/api/iot-data"; 

// --- SENSOR PINS ---
#define DHTPIN 4      // DHT11 Data Pin (D4 on ESP32)
#define DHTTYPE DHT11 // Sensor Type
#define MQ135_PIN 34  // Analog Pin for Gas Sensor (ADC1_CH6)
#define POT_PIN 32    // Potentiometer for Energy Sim (ADC1_CH4)

DHT dht(DHTPIN, DHTTYPE);

// --- VARIABLES ---
float carbonIntensity = 0.0;
float temperature = 0.0;
int energyUsage = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Power up MQ-135 heater
  pinMode(MQ135_PIN, INPUT);
  
  Serial.println("\n--- AERCE FACTORY SENSOR NODE ---");
  Serial.println("Initializing sensors...");
  delay(2000); // Warmup

  // Connect to WiFi
  connectToWiFi();
}

void loop() {
  // 1. READ SENSORS
  // Temperature (DHT11)
  float t = dht.readTemperature();
  if (!isnan(t)) temperature = t;
  
  // Air Quality / Carbon (MQ-135)
  // Raw analog value (0-4095). Higher = More Gas/Smoke.
  int gasRaw = analogRead(MQ135_PIN);
  // Map raw sensor to "Carbon Intensity" (Simulated tCO2e/ton)
  // Normal air is ~400. Breath/Smoke is >1500.
  carbonIntensity = map(gasRaw, 0, 4095, 150, 500) / 100.0; 
  if (carbonIntensity < 1.0) carbonIntensity = 1.0; // Baseline

  // Energy Usage (Potentiometer)
  int energyRaw = analogRead(POT_PIN);
  energyUsage = map(energyRaw, 0, 4095, 200, 800); // kWh

  // 2. PRINT TO SERIAL (For Debugging/Demo)
  Serial.print("[SENSOR] Temp: ");
  Serial.print(temperature);
  Serial.print("°C | Carbon: ");
  Serial.print(carbonIntensity);
  Serial.print(" tCO2 | Energy: ");
  Serial.print(energyUsage);
  Serial.println(" kWh");

  // 3. SEND TO DASHBOARD (Optional for Demo)
  // If you don't have a real backend, the Serial Monitor IS the demo.
  if (WiFi.status() == WL_CONNECTED) {
    sendDataToBackend();
  } else {
    // connectToWiFi(); // Auto-reconnect
  }

  // 4. ANOMALY LOGIC (For the "Show" aspect)
  if (gasRaw > 2000) {
    Serial.println(">>> CRITICAL ALERT: EMISSION SPIKE DETECTED! <<<");
  }

  delay(2000); // Send data every 2 seconds
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
  } else {
    Serial.println("\nWiFi Failed. Running in Offline Mode.");
  }
}

void sendDataToBackend() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String json = "{";
  json += "\"carbon\":" + String(carbonIntensity) + ",";
  json += "\"temp\":" + String(temperature) + ",";
  json += "\"energy\":" + String(energyUsage);
  json += "}";
  
  int httpResponseCode = http.POST(json);
  
  if (httpResponseCode > 0) {
    Serial.print("Data Sent: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error Sending: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}
