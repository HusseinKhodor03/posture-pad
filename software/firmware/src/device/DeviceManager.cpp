#include "DeviceManager.h"
#include "../data/DataConfig.h"

DeviceManager::DeviceManager(const char *host, int port) : sensorReader(muxController), networkManager(host, port), lastBlinkTime(0), ledState(false) {}

void DeviceManager::init()
{
    Serial.begin(115200);
    delay(100);

    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);

    sensorReader.init();
    deviceIdentity.begin();
    bleProvisioner.begin(deviceIdentity);
    wifiConnectionWorkflow.beginSavedConnection(bleProvisioner, networkManager);

    Serial.println("Posture Pad Initialized!");
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

    updateLed();

    sensorReader.readAllSensors(leftFoot, rightFoot);

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

void DeviceManager::updateLed()
{
    unsigned long now = millis();

    if (networkManager.isConnected())
    {
        digitalWrite(LED_BUILTIN, HIGH);
        ledState = true;
    }
    else
    {
        if (now - lastBlinkTime > 1000)
        {
            ledState = !ledState;
            digitalWrite(LED_BUILTIN, ledState ? HIGH : LOW);
            lastBlinkTime = now;
        }
    }
}
