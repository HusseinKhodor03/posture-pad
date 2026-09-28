#ifndef DEVICE_IDENTITY_H
#define DEVICE_IDENTITY_H

#include <Arduino.h>

class DeviceIdentity
{
public:
    void begin();
    const String &getDeviceId() const;
    const String &getPairingToken() const;

private:
    String deviceId;
    String pairingToken;

    String buildDeviceId() const;
    String loadPairingToken() const;
    String createPairingToken() const;
};

#endif
