#ifndef BLE_PROVISIONER_H
#define BLE_PROVISIONER_H

#include <Arduino.h>

class BleProvisioner
{
public:
    BleProvisioner();
    void begin();

private:
    bool started;

    String buildDeviceId() const;
};

#endif
