#include "WifiScanResults.h"
#include "ProvisioningProtocol.h"

#include <ArduinoJson.h>

void WifiScanResults::clear()
{
    count = 0;
}

void WifiScanResults::addOrUpdate(const String &ssid, int rssi, bool isSecure)
{
    if (ssid.isEmpty())
        return;

    int existingIndex = findSsidIndex(ssid);

    if (existingIndex >= 0)
    {
        if (rssi > rssis[existingIndex])
        {
            rssis[existingIndex] = rssi;
            secure[existingIndex] = isSecure;
        }

        return;
    }

    if (count < MAX_WIFI_SCAN_RESULTS)
    {
        ssids[count] = ssid;
        rssis[count] = rssi;
        secure[count] = isSecure;
        count++;
        return;
    }

    int weakestIndex = findWeakestIndex();

    if (rssi > rssis[weakestIndex])
    {
        ssids[weakestIndex] = ssid;
        rssis[weakestIndex] = rssi;
        secure[weakestIndex] = isSecure;
    }
}

void WifiScanResults::sortBySignalStrength()
{
    for (int i = 0; i < count - 1; i++)
    {
        for (int j = i + 1; j < count; j++)
        {
            if (rssis[j] > rssis[i])
            {
                String tempSsid = ssids[i];
                int tempRssi = rssis[i];
                bool tempSecure = secure[i];

                ssids[i] = ssids[j];
                rssis[i] = rssis[j];
                secure[i] = secure[j];

                ssids[j] = tempSsid;
                rssis[j] = tempRssi;
                secure[j] = tempSecure;
            }
        }
    }
}

String WifiScanResults::buildPage(int page) const
{
    if (page < 0)
        page = 0;

    int startIndex = page * WIFI_SCAN_PAGE_SIZE;
    int endIndex = min(startIndex + WIFI_SCAN_PAGE_SIZE, count);

    JsonDocument doc;
    doc["status"] = ProvisioningProtocol::SCAN_STATUS_COMPLETE;
    doc["page"] = page;
    doc["has_more"] = endIndex < count;
    JsonArray networks = doc["networks"].to<JsonArray>();

    for (int i = startIndex; i < endIndex; i++)
    {
        JsonObject network = networks.add<JsonObject>();
        network["ssid"] = ssids[i];
        network["rssi"] = rssis[i];
        network["secure"] = secure[i];
    }

    String scanResults;
    serializeJson(doc, scanResults);
    return scanResults;
}

int WifiScanResults::findSsidIndex(const String &ssid) const
{
    for (int i = 0; i < count; i++)
    {
        if (ssids[i] == ssid)
            return i;
    }

    return -1;
}

int WifiScanResults::findWeakestIndex() const
{
    int weakestIndex = 0;

    for (int i = 1; i < count; i++)
    {
        if (rssis[i] < rssis[weakestIndex])
            weakestIndex = i;
    }

    return weakestIndex;
}
