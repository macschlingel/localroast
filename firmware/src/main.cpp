#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

namespace {

constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
constexpr unsigned long WIFI_RETRY_MS = 10000;
constexpr unsigned long SYNC_INTERVAL_MS = 5 * 60000;
constexpr unsigned long RETRY_BASE_MS = 15000;
constexpr size_t MAX_PAYLOAD_BYTES = 12000;

// These are safe placeholders. Provision real values through NVS/serial input
// before deploying a device. The TLS certificate must also be configured.
const char* defaultSsid = "";
const char* defaultPassword = "";
const char* defaultApiUrl = "https://localroast.example.com/api/esp32/recipes";
const char* defaultApiKey = "";
const char* apiRootCa = "YOUR_SERVER_ROOT_CA";

Preferences preferences;
String ssid;
String password;
String apiUrl;
String apiKey;
String recipesPayload;

unsigned long wifiAttemptStartedAt = 0;
unsigned long nextWifiAttemptAt = 0;
unsigned long nextSyncAt = 0;
unsigned long retryDelayMs = RETRY_BASE_MS;
bool wifiAttemptActive = false;

void loadConfig() {
  preferences.begin("localroast", false);
  ssid = preferences.getString("ssid", defaultSsid);
  password = preferences.getString("password", defaultPassword);
  apiUrl = preferences.getString("api_url", defaultApiUrl);
  apiKey = preferences.getString("api_key", defaultApiKey);
  recipesPayload = preferences.getString("recipes", "[]");
}

void saveConfigValue(const char* key, const String& value) {
  preferences.putString(key, value);
  Serial.println(String("Saved ") + key);
}

void handleSerialProvisioning() {
  if (!Serial.available()) return;

  String command = Serial.readStringUntil('\n');
  command.trim();
  const int separator = command.indexOf('=');
  if (separator <= 0) {
    Serial.println("Use ssid=..., password=..., api_url=... or api_key=...");
    return;
  }

  const String key = command.substring(0, separator);
  const String value = command.substring(separator + 1);
  if (key == "ssid") {
    ssid = value;
    saveConfigValue("ssid", ssid);
  } else if (key == "password") {
    password = value;
    saveConfigValue("password", password);
  } else if (key == "api_url") {
    apiUrl = value;
    saveConfigValue("api_url", apiUrl);
  } else if (key == "api_key") {
    apiKey = value;
    saveConfigValue("api_key", apiKey);
  } else {
    Serial.println("Unknown configuration key");
  }
}

void serviceWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiAttemptActive = false;
    return;
  }

  const unsigned long now = millis();
  if (wifiAttemptActive) {
    if (now - wifiAttemptStartedAt < WIFI_CONNECT_TIMEOUT_MS) return;
    WiFi.disconnect();
    wifiAttemptActive = false;
    nextWifiAttemptAt = now + WIFI_RETRY_MS;
    Serial.println("WiFi connection timed out; retry scheduled");
    return;
  }

  if (ssid.isEmpty() || now < nextWifiAttemptAt) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  wifiAttemptStartedAt = now;
  wifiAttemptActive = true;
  Serial.println(String("Connecting to WiFi: ") + ssid);
}

bool validateRecipePayload(const String& payload) {
  if (payload.length() == 0 || payload.length() > MAX_PAYLOAD_BYTES) {
    Serial.println("Recipe payload has an invalid size");
    return false;
  }

  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, payload);
  if (error || !doc.is<JsonArray>()) {
    const String reason = error ? String(error.f_str()) : String("root is not an array");
    Serial.println(String("Recipe payload rejected: ") + reason);
    return false;
  }

  for (JsonObject recipe : doc.as<JsonArray>()) {
    if (!recipe["title"].is<const char*>()) {
      Serial.println("Recipe payload rejected: title is missing");
      return false;
    }
  }
  return true;
}

void printRecipes(const String& payload) {
  JsonDocument doc;
  if (deserializeJson(doc, payload)) return;

  for (JsonObject recipe : doc.as<JsonArray>()) {
    const char* title = recipe["title"] | "Untitled";
    const char* filter = recipe["coffee_filter"] | "Nicht angegeben";
    const char* paper = recipe["filter_paper"] | "Nicht angegeben";
    Serial.println(String("Recipe: ") + title);
    Serial.println(String("  Filter: ") + filter);
    Serial.println(String("  Papier: ") + paper);
  }
}

bool fetchRecipes() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (apiUrl.isEmpty() || apiKey.isEmpty()) {
    Serial.println("API URL or API key is not configured");
    return false;
  }
  if (String(apiRootCa) == "YOUR_SERVER_ROOT_CA") {
    Serial.println("TLS root CA is not configured; refusing HTTPS request");
    return false;
  }

  WiFiClientSecure client;
  client.setCACert(apiRootCa);

  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  if (!http.begin(client, apiUrl)) {
    Serial.println("Could not initialize HTTPS client");
    return false;
  }
  http.addHeader("x-api-key", apiKey);

  const int status = http.GET();
  const bool successfulStatus = status >= 200 && status < 300;
  if (!successfulStatus) {
    Serial.println(String("Recipe sync failed with HTTP ") + status);
    http.end();
    return false;
  }

  const String payload = http.getString();
  http.end();
  if (!validateRecipePayload(payload)) return false;

  recipesPayload = payload;
  preferences.putString("recipes", recipesPayload);
  printRecipes(recipesPayload);
  Serial.println("Recipe sync succeeded");
  return true;
}

void serviceSync() {
  if (WiFi.status() != WL_CONNECTED || millis() < nextSyncAt) return;

  if (fetchRecipes()) {
    retryDelayMs = RETRY_BASE_MS;
    nextSyncAt = millis() + SYNC_INTERVAL_MS;
  } else {
    nextSyncAt = millis() + retryDelayMs;
    retryDelayMs = min(retryDelayMs * 2, 10UL * 60000UL);
  }
}

} // namespace

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(250);
  loadConfig();

  Serial.println("LocalRoast controller starting");
  if (recipesPayload != "[]") {
    Serial.println("Loaded last valid recipe payload from NVS");
    printRecipes(recipesPayload);
  }
}

void loop() {
  handleSerialProvisioning();
  serviceWifi();

  if (WiFi.status() == WL_CONNECTED && !wifiAttemptActive) {
    if (nextSyncAt == 0) nextSyncAt = millis();
    serviceSync();
  }
}
