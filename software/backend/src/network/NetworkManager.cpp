#include "NetworkManager.h"

NetworkManager::NetworkManager(const char *ssid, const char *password, const char *host, int port) : ssid(ssid), password(password), host(host), port(port), lastWifiAttempt(0), lastTcpAttempt(0) {}

void NetworkManager::connect()
{
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("Connecting to WiFi...");
        delay(500);
    }
    Serial.println("Connected to WiFi!");

    while (!client.connect(host, port))
    {
        Serial.println("Connecting to Node TCP server...");
        delay(500);
    }
    Serial.println("Connected to Node TCP server!");
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
    if (WiFi.status() == WL_CONNECTED)
        return;

    unsigned long now = millis();
    if (now - lastWifiAttempt < WIFI_RETRY_MS)
        return;

    lastWifiAttempt = now;
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid, password);
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