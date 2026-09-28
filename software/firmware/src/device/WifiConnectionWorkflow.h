#ifndef WIFI_CONNECTION_WORKFLOW_H
#define WIFI_CONNECTION_WORKFLOW_H

#include <Arduino.h>

class BleProvisioner;
class NetworkManager;

class WifiConnectionWorkflow
{
public:
    void beginSavedConnection(BleProvisioner &bleProvisioner, NetworkManager &networkManager);
    void handleConnectionRequest(BleProvisioner &bleProvisioner, NetworkManager &networkManager);
    void handleForgetRequest(BleProvisioner &bleProvisioner, NetworkManager &networkManager);
    void updateConnectionState(BleProvisioner &bleProvisioner, NetworkManager &networkManager);

private:
    unsigned long wifiConnectionStartedAt = 0;
    bool wifiConnectionPending = false;
    bool saveCredentialsOnConnect = false;
    bool rollbackCredentialsAvailable = false;
    String rollbackSsid;
    String rollbackPassword;

    void handleConnectionTimeout(BleProvisioner &bleProvisioner, NetworkManager &networkManager);
    void handleSuccessfulConnection(BleProvisioner &bleProvisioner, NetworkManager &networkManager);
    void clearRollbackCredentials();
};

#endif
