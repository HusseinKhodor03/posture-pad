#ifndef METRICS_CALCULATOR_H
#define METRICS_CALCULATOR_H

#include "../data/RawDataTypes.h"

namespace MetricsCalculator
{
    void calculateFootMetrics(FootData &foot, bool isRightFoot);
    void calculatePostureMetrics(const FootData &leftFoot, const FootData &rightFoot, PostureMetrics &metrics);
}

#endif
