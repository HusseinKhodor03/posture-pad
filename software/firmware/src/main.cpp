#include <Arduino.h>
#include "device/DeviceManager.h"

const char *host = "tokaido.proxy.rlwy.net";
const int port = 45762;

DeviceManager deviceManager(host, port);

void setup()
{
  deviceManager.init();
}

void loop()
{
  deviceManager.update();
  delay(50);
}
