#ifndef DATA_FORMATTER_H
#define DATA_FORMATTER_H

#include "../../config/Constants.h"
#include "../models/RawDataTypes.h"
#include "../models/FormattedDataTypes.h"

class DataFormatter
{
public:
    static void formatSensorData(const SensorData &source, FormattedSensorData &dest);
    static void formatFootData(const FootData &source, FormattedFootData &dest);
    static void formatPostureMetrics(const PostureMetrics &source, FormattedPostureMetrics &dest);

private:
    static float roundToDecimals(float value, int decimals);
};

#endif