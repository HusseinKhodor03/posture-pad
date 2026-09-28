#ifndef DATA_FORMATTER_H
#define DATA_FORMATTER_H

#include "RawDataTypes.h"
#include "FormattedDataTypes.h"

namespace DataFormatter
{
    void formatSensorData(const SensorData &source, FormattedSensorData &dest);
    void formatFootData(const FootData &source, FormattedFootData &dest);
    void formatPostureMetrics(const PostureMetrics &source, FormattedPostureMetrics &dest);
}

#endif
