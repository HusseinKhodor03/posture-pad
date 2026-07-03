#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>
#include "../config/Constants.h"
#include "../data/models/RawDataTypes.h"
#include "../data/models/FormattedDataTypes.h"
#include "../sensors/SensorReader.h"
#include "../processing/filtering/SignalProcessor.h"
#include "../processing/metrics/MetricsCalculator.h"
#include "../processing/analysis/PostureAnalyzer.h"
#include "../data/formatter/DataFormatter.h"
#include "../data/serialization/JsonSerializer.h"
#include "../network/BleProvisioner.h"
#include "../network/NetworkManager.h"
#include "../network/TcpClient.h"

class DeviceManager
{
public:
    DeviceManager(const char *host, int port);
    void init();
    void update();

private:
    MuxController muxController;
    SensorReader sensorReader;
    SignalProcessor signalProcessor;
    MetricsCalculator metricsCalculator;
    PostureAnalyzer postureAnalyzer;
    DataFormatter dataFormatter;
    JsonSerializer jsonSerializer;
    BleProvisioner bleProvisioner;
    NetworkManager networkManager;
    TcpClient tcpClient;

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
