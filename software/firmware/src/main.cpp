#include <Arduino.h>
#include "device/DeviceManager.h"

namespace
{
  constexpr const char *SERVER_HOST = "tokaido.proxy.rlwy.net";
  constexpr int SERVER_PORT = 45762;

  DeviceManager deviceManager(SERVER_HOST, SERVER_PORT);
}

void setup()
{
  deviceManager.init();
}

void loop()
{
  deviceManager.update();
}
