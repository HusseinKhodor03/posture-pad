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
    void scanWifiNetworks();
    void setStatus(const String &status);
    const String &getDeviceId() const;

private:
    bool started;
    String pendingSsid;
    String pendingPassword;
    bool connectionRequested;
    bool scanRequested;
    NimBLECharacteristic *statusCharacteristic;
    NimBLECharacteristic *scanResultsCharacteristic;
    String currentStatus;
    String deviceId;

    String buildDeviceId() const;
    void publishScanResults(const String &scanResults);
    void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connectionInfo) override;
};

#endif
