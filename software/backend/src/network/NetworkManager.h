#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <WiFiClient.h>
#include "../config/Constants.h"

class NetworkManager
{
public:
    NetworkManager(const char *host, int port);
    void connect(const String &ssid, const String &password);
    void update();
    bool isWifiConnected();
    bool isConnected();
    WiFiClient &getClient();

private:
    String ssid;
    String password;
    const char *host;
    int port;

    WiFiClient client;
    unsigned long lastWifiAttempt;
    unsigned long lastTcpAttempt;

    void ensureWifiConnected();
    void ensureTcpConnected();
};

#endif
