#include "MetricsCalculator.h"
#include <math.h>

void MetricsCalculator::calculateFootMetrics(FootData &foot, bool isRightFoot)
{
    const float (*positions)[2] = isRightFoot ? RIGHT_FOOT_POSITIONS : LEFT_FOOT_POSITIONS;

    foot.totalNormalized = 0.0f;
    foot.forefootPressure = 0.0f;
    foot.rearfootPressure = 0.0f;
    foot.medialPressure = 0.0f;
    foot.lateralPressure = 0.0f;

    float momentX = 0.0f;
    float momentY = 0.0f;

    for (int i = 0; i < NUM_SENSORS_PER_FOOT; i++)
    {
        float pressure = foot.sensors[i].normalized;
        foot.totalNormalized += pressure;

        if (i <= 3)
            foot.forefootPressure += pressure;
        else
            foot.rearfootPressure += pressure;

        if (isMedialSensor(i, isRightFoot))
            foot.medialPressure += pressure;
        else
            foot.lateralPressure += pressure;

        momentX += pressure * positions[i][0];
        momentY += pressure * positions[i][1];
    }

    if (foot.totalNormalized > 0.01f)
    {
        foot.copX = momentX / foot.totalNormalized;
        foot.copY = momentY / foot.totalNormalized;
    }
    else
    {
        foot.copX = isRightFoot ? 0.53f : 0.47f;
        foot.copY = 0.47f;
    }
}

void MetricsCalculator::calculatePostureMetrics(const FootData &leftFoot, const FootData &rightFoot, PostureMetrics &metrics)
{
    float totalPressure = leftFoot.totalNormalized + rightFoot.totalNormalized;

    if (totalPressure > MIN_PRESSURE_TO_ANALYZE)
    {
        metrics.leftPercent = (leftFoot.totalNormalized / totalPressure) * 100.0f;
        metrics.rightPercent = (rightFoot.totalNormalized / totalPressure) * 100.0f;
        metrics.balanceRatio = leftFoot.totalNormalized / rightFoot.totalNormalized;
        metrics.symmetryIndex = fabs(leftFoot.totalNormalized - rightFoot.totalNormalized) / totalPressure * 100.0f;

        metrics.balanceDiff = fabs(metrics.leftPercent - 50.0f);
        metrics.avgCopY = (leftFoot.copY + rightFoot.copY) / 2.0f;

        float totalForefoot = leftFoot.forefootPressure + rightFoot.forefootPressure;
        float totalRearfoot = leftFoot.rearfootPressure + rightFoot.rearfootPressure;
        metrics.forefootRearfootRatio = totalForefoot / (totalRearfoot + 0.001f);

        float totalMedial = leftFoot.medialPressure + rightFoot.medialPressure;
        float totalLateral = leftFoot.lateralPressure + rightFoot.lateralPressure;
        metrics.medialLateralRatio = totalMedial / (totalLateral + 0.001f);

        float symmetryScore = 1.0f - (metrics.symmetryIndex / 100.0f);
        float copScore = 1.0f - fabs(metrics.avgCopY - 0.5f) * 2.0f;
        metrics.stabilityScore = (symmetryScore + copScore) / 2.0f;
    }
}

bool MetricsCalculator::isMedialSensor(int index, bool isRightFoot)
{
    return (index == 0 || index == 1 || index == 4 || index == 6 || index == 8);
}