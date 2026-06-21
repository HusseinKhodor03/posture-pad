#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <WiFiClient.h>
#include "../config/Constants.h"

class NetworkManager
{
public:
    NetworkManager(const char *ssid, const char *password, const char *host, int port);
    void connect();
    void update();
    bool isConnected();
    WiFiClient &getClient();

private:
    const char *ssid;
    const char *password;
    const char *host;
    int port;

    WiFiClient client;
    unsigned long lastWifiAttempt;
    unsigned long lastTcpAttempt;

    void ensureWifiConnected();
    void ensureTcpConnected();
};

#endif