#ifndef POSTURE_ANALYZER_H
#define POSTURE_ANALYZER_H

#include "../../config/Constants.h"
#include "../../data/models/RawDataTypes.h"

class PostureAnalyzer
{
public:
    void analyze(const PostureMetrics &metrics, PostureAnalysis &analysis);
};

#endif