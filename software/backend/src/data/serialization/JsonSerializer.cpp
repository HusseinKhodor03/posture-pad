#include "JsonSerializer.h"

String JsonSerializer::serialize(const String &deviceId, const FormattedFootData &leftFoot, const FormattedFootData &rightFoot,
                                 const FormattedPostureMetrics &metrics, const PostureAnalysis &analysis)
{
    JsonDocument doc;

    doc["device_id"] = deviceId;

    JsonObject left = doc["left_foot"].to<JsonObject>();
    JsonObject leftSensors = left["sensors"].to<JsonObject>();
    addSensorData(leftSensors, leftFoot.sensors, NUM_SENSORS_PER_FOOT);

    JsonObject leftMetrics = left["metrics"].to<JsonObject>();
    addFootMetrics(leftMetrics, leftFoot);

    JsonObject right = doc["right_foot"].to<JsonObject>();
    JsonObject rightSensors = right["sensors"].to<JsonObject>();
    addSensorData(rightSensors, rightFoot.sensors, NUM_SENSORS_PER_FOOT);

    JsonObject rightMetrics = right["metrics"].to<JsonObject>();
    addFootMetrics(rightMetrics, rightFoot);

    JsonObject postureMetrics = doc["posture_metrics"].to<JsonObject>();
    addPostureMetrics(postureMetrics, metrics);

    JsonObject postureAnalysis = doc["posture_analysis"].to<JsonObject>();
    addPostureAnalysis(postureAnalysis, analysis);

    String jsonString;
    serializeJson(doc, jsonString);
    return jsonString;
}

void JsonSerializer::addSensorData(JsonObject &sensorObj, const FormattedSensorData sensors[], int count)
{
    for (int i = 0; i < count; i++)
    {
        JsonObject sensor = sensorObj["sensor" + String(i)].to<JsonObject>();
        sensor["voltage"] = sensors[i].voltage;
        sensor["normalized"] = sensors[i].normalized;
    }
}

void JsonSerializer::addFootMetrics(JsonObject &metricsObj, const FormattedFootData &foot)
{
    metricsObj["total_normalized"] = foot.totalNormalized;
    metricsObj["cop_x"] = foot.copX;
    metricsObj["cop_y"] = foot.copY;
    metricsObj["forefoot_pressure"] = foot.forefootPressure;
    metricsObj["rearfoot_pressure"] = foot.rearfootPressure;
    metricsObj["medial_pressure"] = foot.medialPressure;
    metricsObj["lateral_pressure"] = foot.lateralPressure;
}

void JsonSerializer::addPostureMetrics(JsonObject &postureObj, const FormattedPostureMetrics &posture)
{
    postureObj["left_percent"] = posture.leftPercent;
    postureObj["right_percent"] = posture.rightPercent;
    postureObj["balance_ratio"] = posture.balanceRatio;
    postureObj["forefoot_rearfoot_ratio"] = posture.forefootRearfootRatio;
    postureObj["medial_lateral_ratio"] = posture.medialLateralRatio;
    postureObj["symmetry_index"] = posture.symmetryIndex;
    postureObj["stability_score"] = posture.stabilityScore;
}

void JsonSerializer::addPostureAnalysis(JsonObject &analysisObj, const PostureAnalysis &analysis)
{
    analysisObj["posture_state"] = analysis.postureState;
    analysisObj["posture_suggestion"] = analysis.postureSuggestion;
}
