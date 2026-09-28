#include "DeviceManager.h"
#include "../data/DataConfig.h"

DeviceManager::DeviceManager(const char *serverHost, int serverPort) : networkManager(serverHost, serverPort) {}

void DeviceManager::init()
{
    Serial.begin(115200);
    delay(100);

    FsrReader::init();
    deviceIdentity.begin();
    bleProvisioner.begin(deviceIdentity);
    wifiConnectionWorkflow.beginSavedConnection(bleProvisioner, networkManager);
}

void DeviceManager::update()
{
    wifiConnectionWorkflow.handleConnectionRequest(bleProvisioner, networkManager);

    if (bleProvisioner.takeScanRequest())
    {
        bleProvisioner.scanWifiNetworks();
    }

    wifiConnectionWorkflow.handleForgetRequest(bleProvisioner, networkManager);

    networkManager.update();
    wifiConnectionWorkflow.updateConnectionState(bleProvisioner, networkManager);

    FsrReader::readAll(leftFoot, rightFoot);

    for (int i = 0; i < DataConfig::NUM_SENSORS_PER_FOOT; i++)
    {
        SignalProcessor::process(leftFoot.sensors[i]);
        SignalProcessor::process(rightFoot.sensors[i]);
    }

    MetricsCalculator::calculateFootMetrics(leftFoot, false);
    MetricsCalculator::calculateFootMetrics(rightFoot, true);

    MetricsCalculator::calculatePostureMetrics(leftFoot, rightFoot, postureMetrics);

    PostureAnalyzer::analyze(postureMetrics, postureAnalysis);

    DataFormatter::formatFootData(leftFoot, formattedLeftFoot);
    DataFormatter::formatFootData(rightFoot, formattedRightFoot);
    DataFormatter::formatPostureMetrics(postureMetrics, formattedPostureMetrics);

    String json = JsonSerializer::serialize(deviceIdentity.getDeviceId(), deviceIdentity.getPairingToken(), networkManager.getSsid(), formattedLeftFoot, formattedRightFoot, formattedPostureMetrics, postureAnalysis);
    networkManager.send(json);
}
