#include <Arduino.h>
#include "device/DeviceManager.h"

const char *host = "SERVER_IP";
const int port = 9000;

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
