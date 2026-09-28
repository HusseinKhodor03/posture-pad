#include "WifiConnectionWorkflow.h"
#include "../network/NetworkManager.h"
#include "../provisioning/BleProvisioner.h"

namespace
{
    constexpr unsigned long NETWORK_CONNECT_TIMEOUT_MS = 20000;
}

void WifiConnectionWorkflow::beginSavedConnection(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
{
    if (networkManager.connectSavedCredentials())
    {
        bleProvisioner.setStatus("connecting");
        wifiConnectionPending = true;
        wifiConnectionStartedAt = millis();
    }
}

void WifiConnectionWorkflow::updateConnectionState(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
{
    handleConnectionTimeout(bleProvisioner, networkManager);
    handleSuccessfulConnection(bleProvisioner, networkManager);
}

void WifiConnectionWorkflow::handleConnectionRequest(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
{
    String provisionedSsid;
    String provisionedPassword;

    if (!bleProvisioner.takeConnectionRequest(provisionedSsid, provisionedPassword))
        return;

    rollbackCredentialsAvailable = networkManager.loadSavedCredentials(rollbackSsid, rollbackPassword);
    networkManager.connect(provisionedSsid, provisionedPassword);
    bleProvisioner.setStatus("connecting");
    wifiConnectionPending = true;
    wifiConnectionStartedAt = millis();
    saveCredentialsOnConnect = true;
}

void WifiConnectionWorkflow::handleForgetRequest(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
{
    if (!bleProvisioner.takeForgetRequest())
        return;

    networkManager.forgetCredentials();
    bleProvisioner.setStatus("unconfigured");
    wifiConnectionPending = false;
    saveCredentialsOnConnect = false;
    rollbackCredentialsAvailable = false;
    clearRollbackCredentials();
}

void WifiConnectionWorkflow::handleConnectionTimeout(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
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
        clearRollbackCredentials();
        return;
    }

    networkManager.stopConnection();
    bleProvisioner.setStatus("unconfigured");
    wifiConnectionPending = false;
}

void WifiConnectionWorkflow::handleSuccessfulConnection(BleProvisioner &bleProvisioner, NetworkManager &networkManager)
{
    if (!wifiConnectionPending || !networkManager.isWifiConnected())
        return;

    if (saveCredentialsOnConnect)
    {
        networkManager.saveCredentials();
        saveCredentialsOnConnect = false;
    }

    bleProvisioner.setStatus("connected", networkManager.getSsid());
    wifiConnectionPending = false;
    rollbackCredentialsAvailable = false;
    clearRollbackCredentials();
    Serial.println("Connected to Wi-Fi!");
}

void WifiConnectionWorkflow::clearRollbackCredentials()
{
    rollbackSsid = "";
    rollbackPassword = "";
}
