#include "NetworkManager.h"

NetworkManager::NetworkManager(const char *host, int port) : host(host), port(port), lastWifiAttempt(0), lastTcpAttempt(0) {}

void NetworkManager::connect(const String &newSsid, const String &newPassword)
{
    client.stop();
    WiFi.disconnect();

    ssid = newSsid;
    password = newPassword;
    lastWifiAttempt = millis();
    lastTcpAttempt = 0;

    WiFi.begin(ssid.c_str(), password.c_str());
    Serial.printf("Connecting to Wi-Fi network: %s\n", ssid.c_str());
}

void NetworkManager::update()
{
    ensureWifiConnected();
    ensureTcpConnected();
}

bool NetworkManager::isConnected()
{
    return (WiFi.status() == WL_CONNECTED) && client.connected();
}

WiFiClient &NetworkManager::getClient()
{
    return client;
}

void NetworkManager::ensureWifiConnected()
{
    if (ssid.isEmpty())
        return;

    if (WiFi.status() == WL_CONNECTED)
        return;

    unsigned long now = millis();
    if (now - lastWifiAttempt < WIFI_RETRY_MS)
        return;

    lastWifiAttempt = now;
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid.c_str(), password.c_str());
}

void NetworkManager::ensureTcpConnected()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    if (client.connected())
        return;

    unsigned long now = millis();
    if (now - lastTcpAttempt < TCP_RETRY_MS)
        return;

    lastTcpAttempt = now;
    client.stop();
    delay(100);
    client.connect(host, port);
}
