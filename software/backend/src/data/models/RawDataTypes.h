#ifndef DATA_TYPES_H
#define DATA_TYPES_H

#include <Arduino.h>
#include "config/Constants.h"

struct SensorData
{
    int adcRaw;
    float adcFiltered;
    float voltage;
    float voltageMin;
    float voltageMax;
    float normalized;

    SensorData() : adcRaw(0), adcFiltered(0.0f), voltage(0.0f),
                   voltageMin(VREF), voltageMax(0.0f), normalized(0.0f) {}
};

struct FootData
{
    SensorData sensors[NUM_SENSORS_PER_FOOT];
    float totalNormalized;
    float copX;
    float copY;
    float forefootPressure;
    float rearfootPressure;
    float medialPressure;
    float lateralPressure;

    FootData() : totalNormalized(0.0f), copX(0.0f), copY(0.0f),
                 forefootPressure(0.0f), rearfootPressure(0.0f),
                 medialPressure(0.0f), lateralPressure(0.0f) {}
};

struct PostureMetrics
{
    float leftPercent;
    float rightPercent;
    float balanceRatio;
    float forefootRearfootRatio;
    float medialLateralRatio;
    float symmetryIndex;
    float balanceDiff;
    float avgCopY;
    float stabilityScore;

    PostureMetrics() : leftPercent(50.0f), rightPercent(50.0f),
                       balanceRatio(1.0f), forefootRearfootRatio(0.0f),
                       medialLateralRatio(0.0f), symmetryIndex(0.0f),
                       balanceDiff(0.0f), avgCopY(0.0f), stabilityScore(0.0f) {}
};

struct PostureAnalysis
{
    String postureState;
    String postureSuggestion;

    PostureAnalysis() : postureState("not_standing"),
                        postureSuggestion("Please stand on the mat") {}
};

#endif