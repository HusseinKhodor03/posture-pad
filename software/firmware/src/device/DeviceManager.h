#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>
#include "DeviceIdentity.h"
#include "WifiConnectionWorkflow.h"
#include "../data/RawDataTypes.h"
#include "../data/FormattedDataTypes.h"
#include "../sensors/FsrReader.h"
#include "../processing/SignalProcessor.h"
#include "../processing/MetricsCalculator.h"
#include "../processing/PostureAnalyzer.h"
#include "../data/DataFormatter.h"
#include "../data/JsonSerializer.h"
#include "../provisioning/BleProvisioner.h"
#include "../network/NetworkManager.h"

class DeviceManager
{
public:
    DeviceManager(const char *host, int port);
    void init();
    void update();

private:
    DeviceIdentity deviceIdentity;
    WifiConnectionWorkflow wifiConnectionWorkflow;
    BleProvisioner bleProvisioner;
    NetworkManager networkManager;

    FootData leftFoot;
    FootData rightFoot;
    PostureMetrics postureMetrics;
    PostureAnalysis postureAnalysis;

    FormattedFootData formattedLeftFoot;
    FormattedFootData formattedRightFoot;
    FormattedPostureMetrics formattedPostureMetrics;

    unsigned long lastBlinkTime;
    bool ledState;

    void updateLed();
};

#endif
