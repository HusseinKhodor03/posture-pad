#ifndef WIFI_SCAN_RESULTS_H
#define WIFI_SCAN_RESULTS_H

#include <Arduino.h>

class WifiScanResults
{
public:
    void clear();
    void addOrUpdate(const String &ssid, int rssi, bool secure);
    void sortBySignalStrength();
    String buildPage(int page) const;

private:
    static const int MAX_WIFI_SCAN_RESULTS = 15;
    static const int WIFI_SCAN_PAGE_SIZE = 2;

    String ssids[MAX_WIFI_SCAN_RESULTS];
    int rssis[MAX_WIFI_SCAN_RESULTS];
    bool secure[MAX_WIFI_SCAN_RESULTS];
    int count = 0;

    int findSsidIndex(const String &ssid) const;
    int findWeakestIndex() const;
};

#endif
