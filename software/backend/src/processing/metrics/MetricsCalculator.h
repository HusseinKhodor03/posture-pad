#ifndef METRICS_CALCULATOR_H
#define METRICS_CALCULATOR_H

#include "../../config/Constants.h"
#include "../../data/models/RawDataTypes.h"

class MetricsCalculator
{
public:
    void calculateFootMetrics(FootData &foot, bool isRightFoot);
    void calculatePostureMetrics(const FootData &leftFoot, const FootData &rightFoot, PostureMetrics &metrics);

private:
    bool isMedialSensor(int index, bool isRightFoot);
};

#endif