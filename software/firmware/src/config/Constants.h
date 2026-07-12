#ifndef CONSTANTS_H
#define CONSTANTS_H

// Formatting constants
const int VOLTAGE_DECIMALS = 3;
const int NORMALIZED_DECIMALS = 3;
const int SCORE_DECIMALS = 2;
const int RATIO_DECIMALS = 2;
const int PERCENTAGE_DECIMALS = 1;
const int PRESSURE_DECIMALS = 2;

// Hardware pin definitions
const int MUX_S0 = 14;
const int MUX_S1 = 27;
const int MUX_S2 = 26;
const int MUX_S3 = 25;

const int RIGHT_FOOT_MUX = 32;
const int LEFT_FOOT_MUX = 33;

// Sensor configuration
const int NUM_SENSORS_PER_FOOT = 9;
const int ADC_MAX = 4095;
const float VREF = 3.3f;

// Filtering parameters
const float EMA_ALPHA = 0.3f;
const float NORMALIZATION_DECAY_RATE = 0.0005f;
const float MIN_VOLTAGE_RANGE = 0.1f;

// Posture analysis thresholds
const float MIN_PRESSURE_TO_ANALYZE = 0.1f;
const float BALANCE_IMBALANCE_THRESHOLD = 15.0f;
const float FORWARD_LEAN_THRESHOLD = 0.65f;
const float BACKWARD_LEAN_THRESHOLD = 0.35f;
const float PRONATION_THRESHOLD = 1.3f;
const float SUPINATION_THRESHOLD = 0.7f;

// Network constants
const unsigned long WIFI_RETRY_MS = 3000;
const unsigned long TCP_RETRY_MS = 3000;

// Foot position maps
const float RIGHT_FOOT_POSITIONS[9][2] = {
    {0.26, 0.10},  // sensor0 - big toe
    {0.45, 0.14},  // sensor1
    {0.63, 0.18},  // sensor2
    {0.81, 0.22},  // sensor3 - pinky toe
    {0.30, 0.38},  // sensor4 - midfoot left
    {0.80, 0.38},  // sensor5 - midfoot right
    {0.27, 0.613}, // sensor6 - lower left
    {0.77, 0.613}, // sensor7 - lower right
    {0.51, 0.85}   // sensor8 - heel
};

const float LEFT_FOOT_POSITIONS[9][2] = {
    {0.74, 0.10},  // sensor0 - big toe
    {0.55, 0.14},  // sensor1
    {0.37, 0.18},  // sensor2
    {0.19, 0.22},  // sensor3 - pinky toe
    {0.20, 0.38},  // sensor4 - midfoot left
    {0.70, 0.38},  // sensor5 - midfoot right
    {0.23, 0.613}, // sensor6 - lower left
    {0.73, 0.613}, // sensor7 - lower right
    {0.49, 0.85}   // sensor8 - heel
};

#endif