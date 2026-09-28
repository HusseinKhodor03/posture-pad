#ifndef JSON_SERIALIZER_H
#define JSON_SERIALIZER_H

#include <ArduinoJson.h>
#include "RawDataTypes.h"
#include "FormattedDataTypes.h"

namespace JsonSerializer
{
    String serialize(const String &deviceId, const String &pairingToken, const String &wifiSsid, const FormattedFootData &leftFoot, const FormattedFootData &rightFoot,
                     const FormattedPostureMetrics &metrics, const PostureAnalysis &analysis);
}

#endif
