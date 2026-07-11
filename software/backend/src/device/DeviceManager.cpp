#include "DeviceManager.h"

DeviceManager::DeviceManager(const char *host, int port) : sensorReader(muxController), networkManager(host, port), tcpClient(networkManager.getClient()), lastBlinkTime(0), ledState(false), wifiConnectionPending(false), saveCredentialsOnConnect(false) {}

void DeviceManager::init()
{
    Serial.begin(115200);
    delay(100);

    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);

    sensorReader.init();
    bleProvisioner.begin();

    if (networkManager.connectSavedCredentials())
    {
        bleProvisioner.setStatus("connecting");
        wifiConnectionPending = true;
    }

    Serial.println("Posture Pad Initialized!");
}

void DeviceManager::update()
{
    String provisionedSsid;
    String provisionedPassword;

    if (bleProvisioner.takeConnectionRequest(provisionedSsid, provisionedPassword))
    {
        networkManager.connect(provisionedSsid, provisionedPassword);
        bleProvisioner.setStatus("connecting");
        wifiConnectionPending = true;
        saveCredentialsOnConnect = true;
    }

    networkManager.update();

    if (wifiConnectionPending && networkManager.isWifiConnected())
    {
        if (saveCredentialsOnConnect)
        {
            networkManager.saveCredentials();
            saveCredentialsOnConnect = false;
        }

        bleProvisioner.setStatus("connected");
        wifiConnectionPending = false;
        Serial.println("Connected to Wi-Fi!");
    }

    updateLed();

    sensorReader.readAllSensors(leftFoot, rightFoot);

    for (int i = 0; i < NUM_SENSORS_PER_FOOT; i++)
    {
        signalProcessor.process(leftFoot.sensors[i]);
        signalProcessor.process(rightFoot.sensors[i]);
    }

    metricsCalculator.calculateFootMetrics(leftFoot, false);
    metricsCalculator.calculateFootMetrics(rightFoot, true);

    metricsCalculator.calculatePostureMetrics(leftFoot, rightFoot, postureMetrics);

    postureAnalyzer.analyze(postureMetrics, postureAnalysis);

    dataFormatter.formatFootData(leftFoot, formattedLeftFoot);
    dataFormatter.formatFootData(rightFoot, formattedRightFoot);
    dataFormatter.formatPostureMetrics(postureMetrics, formattedPostureMetrics);

    String json = jsonSerializer.serialize(bleProvisioner.getDeviceId(), formattedLeftFoot, formattedRightFoot, formattedPostureMetrics, postureAnalysis);
    tcpClient.send(json);
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
