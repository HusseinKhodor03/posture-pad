#ifndef BLE_PROVISIONER_H
#define BLE_PROVISIONER_H

#include <Arduino.h>
#include <NimBLEDevice.h>

class BleProvisioner : private NimBLECharacteristicCallbacks
{
public:
    BleProvisioner();
    void begin();
    bool takeConnectionRequest(String &ssid, String &password);
    bool takeScanRequest();
    bool takeForgetRequest();
    void scanWifiNetworks();
    void setStatus(const String &status);
    const String &getDeviceId() const;
    const String &getPairingToken() const;

private:
    bool started;
    String activeSetupSession;
    unsigned long activeSetupSessionLastSeen;
    String pendingSsid;
    String pendingPassword;
    bool connectionRequested;
    bool scanRequested;
    bool forgetRequested;
    NimBLECharacteristic *statusCharacteristic;
    NimBLECharacteristic *scanResultsCharacteristic;
    NimBLECharacteristic *setupSessionCharacteristic;
    String currentStatus;
    String deviceId;
    String pairingToken;

    String buildDeviceId() const;
    String loadPairingToken() const;
    String createPairingToken() const;
    bool setupSessionExpired() const;
    bool setupSessionMatches(const String &sessionId);
    String getCommandSession(const String &command, const String &prefix) const;
    void claimSetupSession(const String &sessionId);
    void releaseSetupSession();
    void publishScanResults(const String &scanResults);
    void publishSetupSessionStatus(const String &status);
    void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connectionInfo) override;
};

#endif
