#ifndef MUX_CONTROLLER_H
#define MUX_CONTROLLER_H

#include <Arduino.h>
#include "../config/Constants.h"

class MuxController
{
public:
    void init();
    int readLeftFootSensor(int channel);
    int readRightFootSensor(int channel);

private:
    void setMuxChannel(int channel);
};

#endif