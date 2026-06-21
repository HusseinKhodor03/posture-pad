#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include "../config/Constants.h"
#include "../data/models/RawDataTypes.h"
#include "MuxController.h"

class SensorReader
{
public:
    SensorReader(MuxController &mux);
    void init();
    void readAllSensors(FootData &leftFoot, FootData &rightFoot);

private:
    MuxController &mux;
};

#endif