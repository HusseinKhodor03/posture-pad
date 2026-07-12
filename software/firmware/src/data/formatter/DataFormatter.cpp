#include "DataFormatter.h"
#include <math.h>

float DataFormatter::roundToDecimals(float value, int decimals)
{
    float multiplier = powf(10.0f, (float)decimals);
    return roundf(value * multiplier) / multiplier;
}

void DataFormatter::formatSensorData(const SensorData &source, FormattedSensorData &dest)
{
    dest.voltage = roundToDecimals(source.voltage, VOLTAGE_DECIMALS);
    dest.normalized = roundToDecimals(source.normalized, NORMALIZED_DECIMALS);
}

void DataFormatter::formatFootData(const FootData &source, FormattedFootData &dest)
{
    for (int i = 0; i < NUM_SENSORS_PER_FOOT; i++)
    {
        formatSensorData(source.sensors[i], dest.sensors[i]);
    }

    dest.totalNormalized = roundToDecimals(source.totalNormalized, SCORE_DECIMALS);
    dest.copX = roundToDecimals(source.copX, RATIO_DECIMALS);
    dest.copY = roundToDecimals(source.copY, RATIO_DECIMALS);
    dest.forefootPressure = roundToDecimals(source.forefootPressure, PRESSURE_DECIMALS);
    dest.rearfootPressure = roundToDecimals(source.rearfootPressure, PRESSURE_DECIMALS);
    dest.medialPressure = roundToDecimals(source.medialPressure, PRESSURE_DECIMALS);
    dest.lateralPressure = roundToDecimals(source.lateralPressure, PRESSURE_DECIMALS);
}

void DataFormatter::formatPostureMetrics(const PostureMetrics &source, FormattedPostureMetrics &dest)
{
    dest.leftPercent = roundToDecimals(source.leftPercent, PERCENTAGE_DECIMALS);
    dest.rightPercent = roundToDecimals(source.rightPercent, PERCENTAGE_DECIMALS);
    dest.balanceRatio = roundToDecimals(source.balanceRatio, RATIO_DECIMALS);
    dest.forefootRearfootRatio = roundToDecimals(source.forefootRearfootRatio, RATIO_DECIMALS);
    dest.medialLateralRatio = roundToDecimals(source.medialLateralRatio, RATIO_DECIMALS);
    dest.symmetryIndex = roundToDecimals(source.symmetryIndex, PERCENTAGE_DECIMALS);
    dest.stabilityScore = roundToDecimals(source.stabilityScore, SCORE_DECIMALS);
}