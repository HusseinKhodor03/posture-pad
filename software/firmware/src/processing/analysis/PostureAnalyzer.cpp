#include "PostureAnalyzer.h"
#include <math.h>

namespace
{
    constexpr float BALANCE_IMBALANCE_THRESHOLD = 15.0f;
    constexpr float FORWARD_LEAN_THRESHOLD = 0.65f;
    constexpr float BACKWARD_LEAN_THRESHOLD = 0.35f;
    constexpr float PRONATION_THRESHOLD = 1.3f;
    constexpr float SUPINATION_THRESHOLD = 0.7f;
}

void PostureAnalyzer::analyze(const PostureMetrics &metrics, PostureAnalysis &analysis)
{
    if (metrics.stabilityScore <= 0)
    {
        analysis = PostureAnalysis();
        return;
    }

    analysis.postureState = "balanced";
    analysis.postureSuggestion = "Good posture!";

    if (metrics.balanceDiff > BALANCE_IMBALANCE_THRESHOLD)
    {
        analysis.postureState = "significant_imbalance";
        if (metrics.leftPercent > (50.0f + BALANCE_IMBALANCE_THRESHOLD))
        {
            analysis.postureSuggestion = "Shift weight to your right side";
        }
        else
        {
            analysis.postureSuggestion = "Shift weight to your left side";
        }
    }
    else if (metrics.balanceDiff > (BALANCE_IMBALANCE_THRESHOLD / 2))
    {
        analysis.postureState = "slight_imbalance";
    }

    if (metrics.avgCopY > FORWARD_LEAN_THRESHOLD)
    {
        analysis.postureState = "forward_lean";
        analysis.postureSuggestion = "Lean back slightly, shift weight to heels";
    }
    else if (metrics.avgCopY < BACKWARD_LEAN_THRESHOLD)
    {
        analysis.postureState = "backward_lean";
        analysis.postureSuggestion = "Lean forward slightly, shift weight to toes";
    }

    if (metrics.medialLateralRatio > PRONATION_THRESHOLD)
    {
        analysis.postureState = "pronation";
        analysis.postureSuggestion = "Distribute weight more evenly across your feet";
    }
    else if (metrics.medialLateralRatio < SUPINATION_THRESHOLD)
    {
        analysis.postureState = "supination";
        analysis.postureSuggestion = "Distribute weight more evenly across your feet";
    }
}
