#ifndef JSON_SERIALIZER_H
#define JSON_SERIALIZER_H

#include <ArduinoJson.h>
#include "../models/RawDataTypes.h"
#include "../models/FormattedDataTypes.h"

class JsonSerializer
{
public:
    String serialize(const String &deviceId, const FormattedFootData &leftFoot, const FormattedFootData &rightFoot,
                     const FormattedPostureMetrics &metrics, const PostureAnalysis &analysis);

private:
    void addSensorData(JsonObject &sensorsObj, const FormattedSensorData sensors[], int count);
    void addFootMetrics(JsonObject &metricsObj, const FormattedFootData &foot);
    void addPostureMetrics(JsonObject &postureObj, const FormattedPostureMetrics &posture);
    void addPostureAnalysis(JsonObject &analysisObj, const PostureAnalysis &analysis);
};

#endif
