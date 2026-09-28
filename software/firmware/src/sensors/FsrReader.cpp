#include "FsrReader.h"
#include "../data/DataConfig.h"

#include <Arduino.h>

namespace
{
    constexpr int MUX_S0 = 14;
    constexpr int MUX_S1 = 27;
    constexpr int MUX_S2 = 26;
    constexpr int MUX_S3 = 25;
    constexpr int RIGHT_FOOT_MUX = 32;
    constexpr int LEFT_FOOT_MUX = 33;

    void setMuxChannel(int channel)
    {
        digitalWrite(MUX_S0, channel & 0x01);
        digitalWrite(MUX_S1, (channel >> 1) & 0x01);
        digitalWrite(MUX_S2, (channel >> 2) & 0x01);
        digitalWrite(MUX_S3, (channel >> 3) & 0x01);
    }

    int readLeftFootFsr(int channel)
    {
        setMuxChannel(channel);
        return analogRead(LEFT_FOOT_MUX);
    }

    int readRightFootFsr(int channel)
    {
        setMuxChannel(channel);
        return analogRead(RIGHT_FOOT_MUX);
    }
}

void FsrReader::init()
{
    pinMode(MUX_S0, OUTPUT);
    pinMode(MUX_S1, OUTPUT);
    pinMode(MUX_S2, OUTPUT);
    pinMode(MUX_S3, OUTPUT);

    pinMode(RIGHT_FOOT_MUX, INPUT);
    pinMode(LEFT_FOOT_MUX, INPUT);
}

void FsrReader::readAll(FootData &leftFoot, FootData &rightFoot)
{
    for (int i = 0; i < DataConfig::NUM_SENSORS_PER_FOOT; i++)
    {
        leftFoot.sensors[i].adcRaw = readLeftFootFsr(i);
        rightFoot.sensors[i].adcRaw = readRightFootFsr(i);
    }
}
