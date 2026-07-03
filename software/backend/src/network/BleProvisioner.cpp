#include "BleProvisioner.h"

#include <NimBLEDevice.h>

namespace
{
    const char *SERVICE_UUID = "e1a87d62-5df4-42f4-9cf9-fe3b312a8d85";
    const char *DEVICE_ID_UUID = "31c794a4-7189-4023-beb7-f908f31e6224";
    const char *WIFI_SSID_UUID = "426b1b2a-c11b-49c2-9053-1ba2afc1f6c1";
    const char *WIFI_PASSWORD_UUID = "ff386352-081f-4803-b256-c0fba4085d2d";
    const char *COMMAND_UUID = "1d831e2f-0ca5-4bf4-9f84-39487ad6b635";
    const char *STATUS_UUID = "079a5b9b-eb37-49ff-b11b-fa3c68efd8f8";

    class ProvisioningCallbacks : public NimBLECharacteristicCallbacks
    {
    public:
        void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &) override
        {
            const NimBLEUUID &uuid = characteristic->getUUID();
            const NimBLEAttValue &value = characteristic->getValue();

            if (uuid == NimBLEUUID(WIFI_SSID_UUID))
            {
                Serial.printf("Received Wi-Fi SSID: %.*s\n", static_cast<int>(value.length()), value.c_str());
            }
            else if (uuid == NimBLEUUID(WIFI_PASSWORD_UUID))
            {
                Serial.printf("Received Wi-Fi password (%u bytes)\n", static_cast<unsigned int>(value.length()));
            }
            else if (uuid == NimBLEUUID(COMMAND_UUID))
            {
                Serial.printf("Received BLE command: %.*s\n", static_cast<int>(value.length()), value.c_str());
            }
        }
    };

    ProvisioningCallbacks provisioningCallbacks;
}

BleProvisioner::BleProvisioner() : started(false) {}

void BleProvisioner::begin()
{
    if (started)
        return;

    String deviceId = buildDeviceId();
    String deviceName = "PosturePad-" + deviceId.substring(6);

    NimBLEDevice::init(deviceName.c_str());

    NimBLEServer *server = NimBLEDevice::createServer();
    NimBLEService *service = server->createService(SERVICE_UUID);
    NimBLECharacteristic *deviceIdCharacteristic = service->createCharacteristic(DEVICE_ID_UUID, NIMBLE_PROPERTY::READ);
    NimBLECharacteristic *wifiSsidCharacteristic = service->createCharacteristic(WIFI_SSID_UUID, NIMBLE_PROPERTY::WRITE, 32);
    NimBLECharacteristic *wifiPasswordCharacteristic = service->createCharacteristic(WIFI_PASSWORD_UUID, NIMBLE_PROPERTY::WRITE, 64);
    NimBLECharacteristic *commandCharacteristic = service->createCharacteristic(COMMAND_UUID, NIMBLE_PROPERTY::WRITE, 16);
    NimBLECharacteristic *statusCharacteristic = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY, 24);

    wifiSsidCharacteristic->setCallbacks(&provisioningCallbacks);
    wifiPasswordCharacteristic->setCallbacks(&provisioningCallbacks);
    commandCharacteristic->setCallbacks(&provisioningCallbacks);

    deviceIdCharacteristic->setValue(deviceId.c_str());
    statusCharacteristic->setValue("unconfigured");
    service->start();

    NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
    advertising->setName(deviceName.c_str());
    advertising->addServiceUUID(SERVICE_UUID);
    advertising->enableScanResponse(true);
    advertising->start();

    started = true;
    Serial.printf("BLE device available as %s\n", deviceName.c_str());
}

String BleProvisioner::buildDeviceId() const
{
    char deviceId[13];
    snprintf(deviceId, sizeof(deviceId), "%012llX", static_cast<unsigned long long>(ESP.getEfuseMac()));
    return String(deviceId);
}
