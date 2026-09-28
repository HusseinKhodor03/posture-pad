#include "DeviceIdentity.h"

#include <Preferences.h>
#include <esp_system.h>

namespace
{
    const char *PREFERENCES_NAMESPACE = "posture-pad";
    const char *PAIRING_TOKEN_KEY = "pairing_token";
}

void DeviceIdentity::begin()
{
    deviceId = buildDeviceId();
    pairingToken = loadPairingToken();
}

const String &DeviceIdentity::getDeviceId() const
{
    return deviceId;
}

const String &DeviceIdentity::getPairingToken() const
{
    return pairingToken;
}

String DeviceIdentity::buildDeviceId() const
{
    char deviceId[13];
    snprintf(deviceId, sizeof(deviceId), "%012llX", static_cast<unsigned long long>(ESP.getEfuseMac()));
    return String(deviceId);
}

String DeviceIdentity::loadPairingToken() const
{
    Preferences preferences;
    preferences.begin(PREFERENCES_NAMESPACE, false);

    String token = preferences.getString(PAIRING_TOKEN_KEY, "");

    if (token.isEmpty())
    {
        token = createPairingToken();
        preferences.putString(PAIRING_TOKEN_KEY, token);
    }

    preferences.end();
    return token;
}

String DeviceIdentity::createPairingToken() const
{
    char token[33];

    for (int i = 0; i < 4; i++)
    {
        snprintf(token + (i * 8), 9, "%08lX", static_cast<unsigned long>(esp_random()));
    }

    token[32] = '\0';
    return String(token);
}
