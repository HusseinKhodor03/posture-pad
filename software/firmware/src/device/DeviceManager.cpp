#include "DeviceManager.h"

DeviceManager::DeviceManager(const char *host, int port) : sensorReader(muxController), networkManager(host, port), tcpClient(networkManager.getClient()), lastBlinkTime(0), wifiConnectionStartedAt(0), ledState(false), wifiConnectionPending(false), saveCredentialsOnConnect(false), rollbackCredentialsAvailable(false) {}

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
        wifiConnectionStartedAt = millis();
    }

    Serial.println("Posture Pad Initialized!");
}

void DeviceManager::update()
{
    String provisionedSsid;
    String provisionedPassword;

    if (bleProvisioner.takeConnectionRequest(provisionedSsid, provisionedPassword))
    {
        rollbackCredentialsAvailable = networkManager.loadSavedCredentials(rollbackSsid, rollbackPassword);
        networkManager.connect(provisionedSsid, provisionedPassword);
        bleProvisioner.setStatus("connecting");
        wifiConnectionPending = true;
        wifiConnectionStartedAt = millis();
        saveCredentialsOnConnect = true;
    }

    if (bleProvisioner.takeScanRequest())
    {
        bleProvisioner.scanWifiNetworks();
    }

    if (bleProvisioner.takeForgetRequest())
    {
        networkManager.forgetCredentials();
        bleProvisioner.setStatus("unconfigured");
        wifiConnectionPending = false;
        saveCredentialsOnConnect = false;
        rollbackCredentialsAvailable = false;
        rollbackSsid = "";
        rollbackPassword = "";
    }

    networkManager.update();
    handleNetworkConnectionTimeout();

    if (wifiConnectionPending && networkManager.isWifiConnected())
    {
        if (saveCredentialsOnConnect)
        {
            networkManager.saveCredentials();
            saveCredentialsOnConnect = false;
        }

        bleProvisioner.setStatus("connected", networkManager.getSsid());
        wifiConnectionPending = false;
        rollbackCredentialsAvailable = false;
        rollbackSsid = "";
        rollbackPassword = "";
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

    String json = jsonSerializer.serialize(bleProvisioner.getDeviceId(), bleProvisioner.getPairingToken(), networkManager.getSsid(), formattedLeftFoot, formattedRightFoot, formattedPostureMetrics, postureAnalysis);
    tcpClient.send(json);
}

void DeviceManager::handleNetworkConnectionTimeout()
{
    if (!wifiConnectionPending || !saveCredentialsOnConnect)
        return;

    if (millis() - wifiConnectionStartedAt < NETWORK_CONNECT_TIMEOUT_MS)
        return;

    saveCredentialsOnConnect = false;

    if (rollbackCredentialsAvailable)
    {
        networkManager.connect(rollbackSsid, rollbackPassword);
        bleProvisioner.setStatus("connecting");
        wifiConnectionStartedAt = millis();
        rollbackCredentialsAvailable = false;
        rollbackSsid = "";
        rollbackPassword = "";
        return;
    }

    networkManager.stopConnection();
    bleProvisioner.setStatus("unconfigured");
    wifiConnectionPending = false;
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
