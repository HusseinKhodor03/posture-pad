#ifndef MUX_CONTROLLER_H
#define MUX_CONTROLLER_H

#include <Arduino.h>

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
