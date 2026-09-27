#ifndef SIGNAL_PROCESSOR_H
#define SIGNAL_PROCESSOR_H

#include "../data/RawDataTypes.h"

class SignalProcessor
{
public:
    void process(SensorData &sensor);

private:
    float applyEma(float currentValue, float newValue, float alpha);
    float adcToVoltage(int adcValue);
};

#endif
