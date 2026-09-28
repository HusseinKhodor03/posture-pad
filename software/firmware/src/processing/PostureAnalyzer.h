#ifndef POSTURE_ANALYZER_H
#define POSTURE_ANALYZER_H

#include "../data/RawDataTypes.h"

namespace PostureAnalyzer
{
    void analyze(const PostureMetrics &metrics, PostureAnalysis &analysis);
}

#endif
