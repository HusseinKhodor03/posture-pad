#include <Arduino.h>
#include "device/DeviceManager.h"

const char *ssid = "WIFI_SSID";
const char *password = "WIFI_PASSWORD";
const char *host = "SERVER_IP";
const int port = 9000;

DeviceManager deviceManager(ssid, password, host, port);

void setup()
{
  deviceManager.init();
}

void loop()
{
  deviceManager.update();
  delay(50);
}