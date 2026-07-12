#include "NetworkManager.h"

#include <Preferences.h>

namespace
{
    const char *PREFERENCES_NAMESPACE = "posture-pad";
    const char *WIFI_SSID_KEY = "wifi_ssid";
    const char *WIFI_PASSWORD_KEY = "wifi_password";
}

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

bool NetworkManager::connectSavedCredentials()
{
    Preferences preferences;

    if (!preferences.begin(PREFERENCES_NAMESPACE, true))
        return false;

    String savedSsid = preferences.getString(WIFI_SSID_KEY, "");
    String savedPassword = preferences.getString(WIFI_PASSWORD_KEY, "");
    preferences.end();

    if (savedSsid.isEmpty())
    {
        Serial.println("No saved Wi-Fi credentials");
        return false;
    }

    connect(savedSsid, savedPassword);
    return true;
}

void NetworkManager::saveCredentials()
{
    Preferences preferences;

    if (!preferences.begin(PREFERENCES_NAMESPACE, false))
    {
        Serial.println("Could not open Wi-Fi credential storage");
        return;
    }

    preferences.putString(WIFI_SSID_KEY, ssid);
    preferences.putString(WIFI_PASSWORD_KEY, password);
    preferences.end();

    Serial.println("Saved Wi-Fi credentials");
}

void NetworkManager::update()
{
    ensureWifiConnected();
    ensureTcpConnected();
}

bool NetworkManager::isWifiConnected()
{
    return WiFi.status() == WL_CONNECTED;
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
