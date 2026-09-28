#include "NetworkManager.h"

#include <Preferences.h>

namespace
{
    constexpr const char *PREFERENCES_NAMESPACE = "posture-pad";
    constexpr const char *WIFI_SSID_KEY = "wifi_ssid";
    constexpr const char *WIFI_PASSWORD_KEY = "wifi_password";
    constexpr unsigned long WIFI_RETRY_MS = 3000;
    constexpr unsigned long TCP_RETRY_MS = 3000;
}

NetworkManager::NetworkManager(const char *serverHost, int serverPort) : serverHost(serverHost), serverPort(serverPort), lastWifiAttempt(0), lastTcpAttempt(0) {}

void NetworkManager::connect(const String &newSsid, const String &newPassword)
{
    client.stop();
    WiFi.disconnect();

    ssid = newSsid;
    password = newPassword;
    lastWifiAttempt = millis();
    lastTcpAttempt = 0;

    WiFi.begin(ssid.c_str(), password.c_str());
}

bool NetworkManager::connectSavedCredentials()
{
    String savedSsid;
    String savedPassword;

    if (!loadSavedCredentials(savedSsid, savedPassword))
        return false;

    connect(savedSsid, savedPassword);
    return true;
}

bool NetworkManager::loadSavedCredentials(String &savedSsid, String &savedPassword) const
{
    Preferences preferences;

    if (!preferences.begin(PREFERENCES_NAMESPACE, true))
        return false;

    savedSsid = preferences.getString(WIFI_SSID_KEY, "");
    savedPassword = preferences.getString(WIFI_PASSWORD_KEY, "");
    preferences.end();

    if (savedSsid.isEmpty())
    {
        return false;
    }

    return true;
}

void NetworkManager::saveCredentials()
{
    Preferences preferences;

    if (!preferences.begin(PREFERENCES_NAMESPACE, false))
    {
        return;
    }

    preferences.putString(WIFI_SSID_KEY, ssid);
    preferences.putString(WIFI_PASSWORD_KEY, password);
    preferences.end();
}

void NetworkManager::stopConnection()
{
    client.stop();
    WiFi.disconnect();

    ssid = "";
    password = "";
    lastWifiAttempt = 0;
    lastTcpAttempt = 0;
}

void NetworkManager::forgetCredentials()
{
    stopConnection();

    Preferences preferences;

    if (!preferences.begin(PREFERENCES_NAMESPACE, false))
    {
        return;
    }

    preferences.remove(WIFI_SSID_KEY);
    preferences.remove(WIFI_PASSWORD_KEY);
    preferences.end();
}

void NetworkManager::update()
{
    ensureWifiConnected();
    ensureTcpConnected();
}

bool NetworkManager::send(const String &data)
{
    if (!client.connected())
        return false;

    size_t bytesWritten = client.println(data);
    if (bytesWritten == 0)
    {
        client.stop();
        return false;
    }

    return true;
}

bool NetworkManager::isWifiConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

bool NetworkManager::isConnected()
{
    return (WiFi.status() == WL_CONNECTED) && client.connected();
}

const String &NetworkManager::getSsid() const
{
    return ssid;
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
    client.connect(serverHost, serverPort);
}
