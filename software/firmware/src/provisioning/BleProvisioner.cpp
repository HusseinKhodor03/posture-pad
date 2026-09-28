#include "BleProvisioner.h"
#include "ProvisioningProtocol.h"

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
    const char *SETUP_SESSION_UUID = "0ad025b5-07ca-49a8-b3f7-03865f5f924f";
    const char *PREFERENCES_NAMESPACE = "posture-pad";
    const char *PAIRING_TOKEN_KEY = "pairing_token";
    const unsigned long SETUP_SESSION_TIMEOUT_MS = 15000;
}

BleProvisioner::BleProvisioner() : started(false), activeSetupSessionLastSeen(0), connectionRequested(false), scanRequested(false), forgetRequested(false), statusCharacteristic(nullptr), scanResultsCharacteristic(nullptr), setupSessionCharacteristic(nullptr), scanResultCount(0) {}

void BleProvisioner::begin()
{
    if (started)
        return;

    deviceId = buildDeviceId();
    pairingToken = loadPairingToken();
    String deviceName = "PosturePad-" + deviceId.substring(6);

    NimBLEDevice::init(deviceName.c_str());

    NimBLEServer *server = NimBLEDevice::createServer();
    server->setCallbacks(this);
    server->advertiseOnDisconnect(true);

    NimBLEService *service = server->createService(SERVICE_UUID);
    NimBLECharacteristic *deviceIdCharacteristic = service->createCharacteristic(DEVICE_ID_UUID, NIMBLE_PROPERTY::READ);
    NimBLECharacteristic *pairingTokenCharacteristic = service->createCharacteristic(PAIRING_TOKEN_UUID, NIMBLE_PROPERTY::READ, 32);
    NimBLECharacteristic *wifiSsidCharacteristic = service->createCharacteristic(WIFI_SSID_UUID, NIMBLE_PROPERTY::WRITE, 32);
    NimBLECharacteristic *wifiPasswordCharacteristic = service->createCharacteristic(WIFI_PASSWORD_UUID, NIMBLE_PROPERTY::WRITE, 64);
    NimBLECharacteristic *commandCharacteristic = service->createCharacteristic(COMMAND_UUID, NIMBLE_PROPERTY::WRITE, 24);
    statusCharacteristic = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 64);
    scanResultsCharacteristic = service->createCharacteristic(WIFI_SCAN_RESULTS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 512);
    setupSessionCharacteristic = service->createCharacteristic(SETUP_SESSION_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 24);

    wifiSsidCharacteristic->setCallbacks(this);
    wifiPasswordCharacteristic->setCallbacks(this);
    commandCharacteristic->setCallbacks(this);

    deviceIdCharacteristic->setValue(deviceId.c_str());
    pairingTokenCharacteristic->setValue(pairingToken.c_str());
    statusCharacteristic->setValue(ProvisioningProtocol::STATUS_UNCONFIGURED);
    scanResultsCharacteristic->setValue(ProvisioningProtocol::SCAN_RESULTS_IDLE);
    setupSessionCharacteristic->setValue(ProvisioningProtocol::SETUP_SESSION_AVAILABLE);
    currentStatus = ProvisioningProtocol::STATUS_UNCONFIGURED;

    NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
    advertising->setName(deviceName.c_str());
    advertising->addServiceUUID(SERVICE_UUID);
    advertising->enableScanResponse(true);
    advertising->start();

    started = true;
    Serial.printf("BLE device available as %s\n", deviceName.c_str());
}

void BleProvisioner::onConnect(NimBLEServer *server, NimBLEConnInfo &)
{
    server->stopAdvertising();
}

void BleProvisioner::onDisconnect(NimBLEServer *, NimBLEConnInfo &, int)
{
    releaseSetupSession();
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
        String command = value.c_str();

        String claimSession = ProvisioningProtocol::getClaimSession(command);
        String releaseSession = ProvisioningProtocol::getReleaseSession(command);
        String pingSession = ProvisioningProtocol::getPingSession(command);
        String scanSession = ProvisioningProtocol::getScanSession(command);
        String scanPageSession;
        int scanPage = 0;
        String connectSession = ProvisioningProtocol::getConnectSession(command);
        String forgetSession = ProvisioningProtocol::getForgetSession(command);

        if (!claimSession.isEmpty())
        {
            claimSetupSession(claimSession);
        }
        else if (!releaseSession.isEmpty() && setupSessionMatches(releaseSession))
        {
            releaseSetupSession();
        }
        else if (!pingSession.isEmpty() && setupSessionMatches(pingSession))
        {
            activeSetupSessionLastSeen = millis();
            publishSetupSessionStatus(ProvisioningProtocol::formatClaimedSetupSessionStatus(activeSetupSession));
        }
        else if (!scanSession.isEmpty() && setupSessionMatches(scanSession))
        {
            activeSetupSessionLastSeen = millis();
            scanRequested = true;
            Serial.println("Wi-Fi scan requested");
        }
        else if (ProvisioningProtocol::parseScanPageCommand(command, scanPageSession, scanPage) && setupSessionMatches(scanPageSession))
        {
            activeSetupSessionLastSeen = millis();
            publishScanPage(scanPage);
        }
        else if (!connectSession.isEmpty() && setupSessionMatches(connectSession) && !pendingSsid.isEmpty())
        {
            connectionRequested = true;
            Serial.println("Wi-Fi connection requested");
        }
        else if (!connectSession.isEmpty() && setupSessionMatches(connectSession))
        {
            Serial.println("Ignored connect command: no Wi-Fi SSID received");
        }
        else if (!forgetSession.isEmpty() && setupSessionMatches(forgetSession))
        {
            forgetRequested = true;
        }
    }
}

bool BleProvisioner::takeConnectionRequest(String &ssid, String &password)
{
    if (setupSessionExpired())
        releaseSetupSession();

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
    if (setupSessionExpired())
        releaseSetupSession();

    if (!scanRequested)
        return false;

    activeSetupSessionLastSeen = millis();
    scanRequested = false;
    return true;
}

bool BleProvisioner::takeForgetRequest()
{
    if (setupSessionExpired())
        releaseSetupSession();

    if (!forgetRequested)
        return false;

    forgetRequested = false;
    return true;
}

void BleProvisioner::scanWifiNetworks()
{
    activeSetupSessionLastSeen = millis();
    publishScanResults(ProvisioningProtocol::SCAN_RESULTS_SCANNING);

    WiFi.mode(WIFI_STA);
    int networkCount = WiFi.scanNetworks();
    activeSetupSessionLastSeen = millis();

    if (networkCount < 0)
    {
        scanResultCount = 0;
        publishScanResults(ProvisioningProtocol::SCAN_RESULTS_FAILED);
        WiFi.scanDelete();
        return;
    }

    scanResultCount = 0;

    for (int i = 0; i < networkCount; i++)
    {
        String ssid = WiFi.SSID(i);

        if (ssid.isEmpty())
            continue;

        int rssi = WiFi.RSSI(i);
        bool secure = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
        int existingIndex = -1;

        for (int j = 0; j < scanResultCount; j++)
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

        if (scanResultCount < MAX_WIFI_SCAN_RESULTS)
        {
            scanSsids[scanResultCount] = ssid;
            scanRssis[scanResultCount] = rssi;
            scanSecure[scanResultCount] = secure;
            scanResultCount++;
            continue;
        }

        int weakestIndex = 0;

        for (int j = 1; j < scanResultCount; j++)
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

    for (int i = 0; i < scanResultCount - 1; i++)
    {
        for (int j = i + 1; j < scanResultCount; j++)
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

    publishScanPage(0);
    WiFi.scanDelete();
}

void BleProvisioner::setStatus(const String &status)
{
    setStatus(status, "");
}

void BleProvisioner::setStatus(const String &status, const String &wifiSsid)
{
    if (statusCharacteristic == nullptr)
        return;

    String statusValue = status;
    if (status == ProvisioningProtocol::STATUS_CONNECTED && !wifiSsid.isEmpty())
    {
        statusValue += ":";
        statusValue += wifiSsid;
    }

    if (statusValue == currentStatus)
        return;

    currentStatus = statusValue;
    statusCharacteristic->setValue(statusValue.c_str());
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

void BleProvisioner::publishScanPage(int page)
{
    activeSetupSessionLastSeen = millis();

    if (page < 0)
        page = 0;

    int startIndex = page * WIFI_SCAN_PAGE_SIZE;
    int endIndex = min(startIndex + WIFI_SCAN_PAGE_SIZE, scanResultCount);

    JsonDocument doc;
    doc["status"] = ProvisioningProtocol::SCAN_STATUS_COMPLETE;
    doc["page"] = page;
    doc["has_more"] = endIndex < scanResultCount;
    JsonArray networks = doc["networks"].to<JsonArray>();

    for (int i = startIndex; i < endIndex; i++)
    {
        JsonObject network = networks.add<JsonObject>();
        network["ssid"] = scanSsids[i];
        network["rssi"] = scanRssis[i];
        network["secure"] = scanSecure[i];
    }

    String scanResults;
    serializeJson(doc, scanResults);
    publishScanResults(scanResults);
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

bool BleProvisioner::setupSessionExpired() const
{
    return !activeSetupSession.isEmpty() && millis() - activeSetupSessionLastSeen > SETUP_SESSION_TIMEOUT_MS;
}

bool BleProvisioner::setupSessionMatches(const String &sessionId)
{
    if (setupSessionExpired())
    {
        releaseSetupSession();
        return false;
    }

    return !sessionId.isEmpty() && sessionId == activeSetupSession;
}

void BleProvisioner::claimSetupSession(const String &sessionId)
{
    if (sessionId.isEmpty())
    {
        publishSetupSessionStatus(ProvisioningProtocol::SETUP_SESSION_BUSY);
        return;
    }

    if (setupSessionExpired())
        releaseSetupSession();

    if (activeSetupSession.isEmpty() || activeSetupSession == sessionId)
    {
        activeSetupSession = sessionId;
        activeSetupSessionLastSeen = millis();
        publishSetupSessionStatus(ProvisioningProtocol::formatClaimedSetupSessionStatus(activeSetupSession));
        return;
    }

    publishSetupSessionStatus(ProvisioningProtocol::SETUP_SESSION_BUSY);
}

void BleProvisioner::releaseSetupSession()
{
    if (activeSetupSession.isEmpty())
    {
        publishSetupSessionStatus(ProvisioningProtocol::SETUP_SESSION_AVAILABLE);
        return;
    }

    activeSetupSession = "";
    activeSetupSessionLastSeen = 0;
    pendingSsid = "";
    pendingPassword = "";
    connectionRequested = false;
    scanRequested = false;
    forgetRequested = false;
    publishSetupSessionStatus(ProvisioningProtocol::SETUP_SESSION_AVAILABLE);
}

void BleProvisioner::publishSetupSessionStatus(const String &status)
{
    if (setupSessionCharacteristic == nullptr)
        return;

    setupSessionCharacteristic->setValue(status.c_str());
    setupSessionCharacteristic->notify();
}
