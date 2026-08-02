#include "BleProvisioner.h"

#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_system.h>

namespace
{
    const char *SERVICE_UUID = "e1a87d62-5df4-42f4-9cf9-fe3b312a8d85";
    const char *DEVICE_ID_UUID = "31c794a4-7189-4023-beb7-f908f31e6224";
    const char *WIFI_SSID_UUID = "426b1b2a-c11b-49c2-9053-1ba2afc1f6c1";
    const char *WIFI_PASSWORD_UUID = "ff386352-081f-4803-b256-c0fba4085d2d";
    const char *COMMAND_UUID = "1d831e2f-0ca5-4bf4-9f84-39487ad6b635";
    const char *STATUS_UUID = "079a5b9b-eb37-49ff-b11b-fa3c68efd8f8";
    const char *WIFI_SCAN_RESULTS_UUID = "7f9c0b60-9f79-46f6-8e2e-4f9c7d2c7c6d";
    const char *PAIRING_TOKEN_UUID = "8be0ef6e-118a-4bd3-90b7-83bcaea35b7f";
    const char *PREFERENCES_NAMESPACE = "posture-pad";
    const char *PAIRING_TOKEN_KEY = "pairing_token";
    const int MAX_WIFI_SCAN_RESULTS = 15;
}

BleProvisioner::BleProvisioner() : started(false), connectionRequested(false), scanRequested(false), statusCharacteristic(nullptr), scanResultsCharacteristic(nullptr) {}

void BleProvisioner::begin()
{
    if (started)
        return;

    deviceId = buildDeviceId();
    pairingToken = loadPairingToken();
    String deviceName = "PosturePad-" + deviceId.substring(6);

    NimBLEDevice::init(deviceName.c_str());

    NimBLEServer *server = NimBLEDevice::createServer();
    NimBLEService *service = server->createService(SERVICE_UUID);
    NimBLECharacteristic *deviceIdCharacteristic = service->createCharacteristic(DEVICE_ID_UUID, NIMBLE_PROPERTY::READ);
    NimBLECharacteristic *pairingTokenCharacteristic = service->createCharacteristic(PAIRING_TOKEN_UUID, NIMBLE_PROPERTY::READ, 32);
    NimBLECharacteristic *wifiSsidCharacteristic = service->createCharacteristic(WIFI_SSID_UUID, NIMBLE_PROPERTY::WRITE, 32);
    NimBLECharacteristic *wifiPasswordCharacteristic = service->createCharacteristic(WIFI_PASSWORD_UUID, NIMBLE_PROPERTY::WRITE, 64);
    NimBLECharacteristic *commandCharacteristic = service->createCharacteristic(COMMAND_UUID, NIMBLE_PROPERTY::WRITE, 16);
    statusCharacteristic = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 24);
    scanResultsCharacteristic = service->createCharacteristic(WIFI_SCAN_RESULTS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 1024);

    wifiSsidCharacteristic->setCallbacks(this);
    wifiPasswordCharacteristic->setCallbacks(this);
    commandCharacteristic->setCallbacks(this);

    deviceIdCharacteristic->setValue(deviceId.c_str());
    pairingTokenCharacteristic->setValue(pairingToken.c_str());
    statusCharacteristic->setValue("unconfigured");
    scanResultsCharacteristic->setValue("{\"status\":\"idle\",\"networks\":[]}");
    currentStatus = "unconfigured";
    service->start();

    NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
    advertising->setName(deviceName.c_str());
    advertising->addServiceUUID(SERVICE_UUID);
    advertising->enableScanResponse(true);
    advertising->start();

    started = true;
    Serial.printf("BLE device available as %s\n", deviceName.c_str());
}

void BleProvisioner::onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &)
{
    const NimBLEUUID &uuid = characteristic->getUUID();
    const std::string value = characteristic->getValue();

    if (uuid == NimBLEUUID(WIFI_SSID_UUID))
    {
        pendingSsid = value.c_str();
        Serial.printf("Stored Wi-Fi SSID: %s\n", pendingSsid.c_str());
    }
    else if (uuid == NimBLEUUID(WIFI_PASSWORD_UUID))
    {
        pendingPassword = value.c_str();
        Serial.printf("Stored Wi-Fi password (%u bytes)\n", static_cast<unsigned int>(value.length()));
    }
    else if (uuid == NimBLEUUID(COMMAND_UUID))
    {
        Serial.printf("Received BLE command: %s\n", value.c_str());

        if (value == "connect" && !pendingSsid.isEmpty())
        {
            connectionRequested = true;
            Serial.println("Wi-Fi connection requested");
        }
        else if (value == "scan_wifi")
        {
            scanRequested = true;
            Serial.println("Wi-Fi scan requested");
        }
        else if (value == "connect")
        {
            Serial.println("Ignored connect command: no Wi-Fi SSID received");
        }
    }
}

bool BleProvisioner::takeConnectionRequest(String &ssid, String &password)
{
    if (!connectionRequested)
        return false;

    ssid = pendingSsid;
    password = pendingPassword;

    pendingSsid = "";
    pendingPassword = "";
    connectionRequested = false;

    return true;
}

bool BleProvisioner::takeScanRequest()
{
    if (!scanRequested)
        return false;

    scanRequested = false;
    return true;
}

void BleProvisioner::scanWifiNetworks()
{
    publishScanResults("{\"status\":\"scanning\",\"networks\":[]}");

    int networkCount = WiFi.scanNetworks();

    JsonDocument doc;
    JsonArray networks = doc["networks"].to<JsonArray>();

    if (networkCount < 0)
    {
        doc["status"] = "failed";
    }
    else
    {
        doc["status"] = "complete";
        String scanSsids[MAX_WIFI_SCAN_RESULTS];
        int scanRssis[MAX_WIFI_SCAN_RESULTS];
        bool scanSecure[MAX_WIFI_SCAN_RESULTS];
        int resultCount = 0;

        for (int i = 0; i < networkCount; i++)
        {
            String ssid = WiFi.SSID(i);

            if (ssid.isEmpty())
                continue;

            int rssi = WiFi.RSSI(i);
            bool secure = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
            int existingIndex = -1;

            for (int j = 0; j < resultCount; j++)
            {
                if (scanSsids[j] == ssid)
                {
                    existingIndex = j;
                    break;
                }
            }

            if (existingIndex >= 0)
            {
                if (rssi > scanRssis[existingIndex])
                {
                    scanRssis[existingIndex] = rssi;
                    scanSecure[existingIndex] = secure;
                }

                continue;
            }

            if (resultCount < MAX_WIFI_SCAN_RESULTS)
            {
                scanSsids[resultCount] = ssid;
                scanRssis[resultCount] = rssi;
                scanSecure[resultCount] = secure;
                resultCount++;
                continue;
            }

            int weakestIndex = 0;

            for (int j = 1; j < resultCount; j++)
            {
                if (scanRssis[j] < scanRssis[weakestIndex])
                    weakestIndex = j;
            }

            if (rssi > scanRssis[weakestIndex])
            {
                scanSsids[weakestIndex] = ssid;
                scanRssis[weakestIndex] = rssi;
                scanSecure[weakestIndex] = secure;
            }
        }

        for (int i = 0; i < resultCount - 1; i++)
        {
            for (int j = i + 1; j < resultCount; j++)
            {
                if (scanRssis[j] > scanRssis[i])
                {
                    String tempSsid = scanSsids[i];
                    int tempRssi = scanRssis[i];
                    bool tempSecure = scanSecure[i];

                    scanSsids[i] = scanSsids[j];
                    scanRssis[i] = scanRssis[j];
                    scanSecure[i] = scanSecure[j];

                    scanSsids[j] = tempSsid;
                    scanRssis[j] = tempRssi;
                    scanSecure[j] = tempSecure;
                }
            }
        }

        for (int i = 0; i < resultCount; i++)
        {
            JsonObject network = networks.add<JsonObject>();
            network["ssid"] = scanSsids[i];
            network["rssi"] = scanRssis[i];
            network["secure"] = scanSecure[i];
        }
    }

    String scanResults;
    serializeJson(doc, scanResults);
    publishScanResults(scanResults);
    WiFi.scanDelete();
}

void BleProvisioner::setStatus(const String &status)
{
    if (statusCharacteristic == nullptr || status == currentStatus)
        return;

    currentStatus = status;
    statusCharacteristic->setValue(status.c_str());
    statusCharacteristic->notify();
}

const String &BleProvisioner::getDeviceId() const
{
    return deviceId;
}

const String &BleProvisioner::getPairingToken() const
{
    return pairingToken;
}

void BleProvisioner::publishScanResults(const String &scanResults)
{
    if (scanResultsCharacteristic == nullptr)
        return;

    scanResultsCharacteristic->setValue(scanResults.c_str());
    scanResultsCharacteristic->notify();
}

String BleProvisioner::buildDeviceId() const
{
    char deviceId[13];
    snprintf(deviceId, sizeof(deviceId), "%012llX", static_cast<unsigned long long>(ESP.getEfuseMac()));
    return String(deviceId);
}

String BleProvisioner::loadPairingToken() const
{
    Preferences preferences;
    preferences.begin(PREFERENCES_NAMESPACE, false);

    String token = preferences.getString(PAIRING_TOKEN_KEY, "");

    if (token.isEmpty())
    {
        token = createPairingToken();
        preferences.putString(PAIRING_TOKEN_KEY, token);
    }

    preferences.end();
    return token;
}

String BleProvisioner::createPairingToken() const
{
    char token[33];

    for (int i = 0; i < 4; i++)
    {
        snprintf(token + (i * 8), 9, "%08lX", static_cast<unsigned long>(esp_random()));
    }

    token[32] = '\0';
    return String(token);
}
