#include "SensorReader.h"

SensorReader::SensorReader(MuxController &mux) : mux(mux) {}

void SensorReader::init()
{
    mux.init();
}

void SensorReader::readAllSensors(FootData &leftFoot, FootData &rightFoot)
{
    for (int i = 0; i < NUM_SENSORS_PER_FOOT; i++)
    {
        leftFoot.sensors[i].adcRaw = mux.readLeftFootSensor(i);
        rightFoot.sensors[i].adcRaw = mux.readRightFootSensor(i);
    }
}