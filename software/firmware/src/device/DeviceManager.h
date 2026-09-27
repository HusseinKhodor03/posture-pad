#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>
#include "../data/RawDataTypes.h"
#include "../data/FormattedDataTypes.h"
#include "../sensors/SensorReader.h"
#include "../processing/SignalProcessor.h"
#include "../processing/MetricsCalculator.h"
#include "../processing/PostureAnalyzer.h"
#include "../data/DataFormatter.h"
#include "../data/JsonSerializer.h"
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
    unsigned long wifiConnectionStartedAt;
    bool ledState;
    bool wifiConnectionPending;
    bool saveCredentialsOnConnect;
    bool rollbackCredentialsAvailable;
    String rollbackSsid;
    String rollbackPassword;

    void updateLed();
    void handleNetworkConnectionTimeout();
};

#endif
