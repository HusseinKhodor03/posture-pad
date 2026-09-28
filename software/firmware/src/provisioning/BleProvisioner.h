#ifndef BLE_PROVISIONER_H
#define BLE_PROVISIONER_H

#include "SetupSession.h"
#include "WifiScanResults.h"

#include <Arduino.h>
#include <NimBLEDevice.h>

class DeviceIdentity;

class BleProvisioner : private NimBLECharacteristicCallbacks, private NimBLEServerCallbacks
{
public:
    BleProvisioner();
    void begin(const DeviceIdentity &identity);
    bool takeConnectionRequest(String &ssid, String &password);
    bool takeScanRequest();
    bool takeForgetRequest();
    void scanWifiNetworks();
    void setStatus(const String &status);
    void setStatus(const String &status, const String &wifiSsid);

private:
    bool started;
    SetupSession setupSession;
    WifiScanResults wifiScanResults;
    String pendingSsid;
    String pendingPassword;
    bool connectionRequested;
    bool scanRequested;
    bool forgetRequested;
    NimBLECharacteristic *statusCharacteristic;
    NimBLECharacteristic *scanResultsCharacteristic;
    NimBLECharacteristic *setupSessionCharacteristic;
    String currentStatus;

    bool expireSetupSessionIfTimedOut();
    bool setupSessionMatches(const String &sessionId);
    bool pingSetupSession(const String &sessionId);
    void recordSetupSessionActivity();
    void claimSetupSession(const String &sessionId);
    void releaseSetupSession();
    void clearSetupSessionWorkflowState();
    void publishScanPage(int page);
    void publishScanResults(const String &scanResults);
    void publishSetupSessionStatus(const String &status);
    void onConnect(NimBLEServer *server, NimBLEConnInfo &connectionInfo) override;
    void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connectionInfo, int reason) override;
    void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connectionInfo) override;
};

#endif
