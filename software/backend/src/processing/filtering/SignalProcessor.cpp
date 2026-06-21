#include "SignalProcessor.h"
#include <math.h>

float SignalProcessor::applyEma(float currentValue, float newValue, float alpha)
{
    return (alpha * newValue) + ((1.0f - alpha) * currentValue);
}

float SignalProcessor::adcToVoltage(int adcValue)
{
    return (float)adcValue * (VREF / ADC_MAX);
}

void SignalProcessor::process(SensorData &sensor)
{
    sensor.adcFiltered = applyEma(sensor.adcFiltered, (float)sensor.adcRaw, EMA_ALPHA);
    sensor.voltage = adcToVoltage(sensor.adcFiltered);

    if (sensor.voltage < sensor.voltageMin)
        sensor.voltageMin = sensor.voltage;
    else
        sensor.voltageMin = applyEma(sensor.voltageMin, sensor.voltage, NORMALIZATION_DECAY_RATE);

    if (sensor.voltage > sensor.voltageMax)
        sensor.voltageMax = sensor.voltage;
    else
        sensor.voltageMax = applyEma(sensor.voltageMax, sensor.voltage, NORMALIZATION_DECAY_RATE);

    float range = sensor.voltageMax - sensor.voltageMin;
    if (range < MIN_VOLTAGE_RANGE)
        range = MIN_VOLTAGE_RANGE;

    sensor.normalized = (sensor.voltage - sensor.voltageMin) / range;
    sensor.normalized = sqrt(sensor.normalized);

    if (sensor.normalized < 0.0f)
        sensor.normalized = 0.0f;
    if (sensor.normalized > 1.0f)
        sensor.normalized = 1.0f;
}