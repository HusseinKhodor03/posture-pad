#ifndef BLE_PROVISIONER_H
#define BLE_PROVISIONER_H

#include <Arduino.h>
#include <NimBLEDevice.h>

class BleProvisioner : private NimBLECharacteristicCallbacks, private NimBLEServerCallbacks
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
    static const int MAX_WIFI_SCAN_RESULTS = 15;
    static const int WIFI_SCAN_PAGE_SIZE = 2;

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
    String scanSsids[MAX_WIFI_SCAN_RESULTS];
    int scanRssis[MAX_WIFI_SCAN_RESULTS];
    bool scanSecure[MAX_WIFI_SCAN_RESULTS];
    int scanResultCount;

    String buildDeviceId() const;
    String loadPairingToken() const;
    String createPairingToken() const;
    bool setupSessionExpired() const;
    bool setupSessionMatches(const String &sessionId);
    String getCommandSession(const String &command, const String &prefix) const;
    bool parseScanPageCommand(const String &command, String &sessionId, int &page) const;
    void claimSetupSession(const String &sessionId);
    void releaseSetupSession();
    void publishScanPage(int page);
    void publishScanResults(const String &scanResults);
    void publishSetupSessionStatus(const String &status);
    void onConnect(NimBLEServer *server, NimBLEConnInfo &connectionInfo) override;
    void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connectionInfo, int reason) override;
    void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connectionInfo) override;
};

#endif
