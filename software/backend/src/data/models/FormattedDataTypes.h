#ifndef FORMATTED_DATA_TYPES_H
#define FORMATTED_DATA_TYPES_H

#include "config/Constants.h"

struct FormattedSensorData
{
    float voltage;
    float normalized;

    FormattedSensorData() : voltage(0.0f), normalized(0.0f) {}
};

struct FormattedFootData
{
    FormattedSensorData sensors[NUM_SENSORS_PER_FOOT];
    float totalNormalized;
    float copX;
    float copY;
    float forefootPressure;
    float rearfootPressure;
    float medialPressure;
    float lateralPressure;

    FormattedFootData() : totalNormalized(0.0f), copX(0.0f), copY(0.0f),
                          forefootPressure(0.0f), rearfootPressure(0.0f),
                          medialPressure(0.0f), lateralPressure(0.0f) {}
};

struct FormattedPostureMetrics
{
    float leftPercent;
    float rightPercent;
    float balanceRatio;
    float forefootRearfootRatio;
    float medialLateralRatio;
    float symmetryIndex;
    float stabilityScore;

    FormattedPostureMetrics() : leftPercent(50.0f), rightPercent(50.0f),
                                balanceRatio(1.0f), forefootRearfootRatio(0.0f),
                                medialLateralRatio(0.0f), symmetryIndex(0.0f), stabilityScore(0.0f) {}
};

#endif