#include "MuxController.h"

void MuxController::init()
{
    pinMode(MUX_S0, OUTPUT);
    pinMode(MUX_S1, OUTPUT);
    pinMode(MUX_S2, OUTPUT);
    pinMode(MUX_S3, OUTPUT);

    pinMode(RIGHT_FOOT_MUX, INPUT);
    pinMode(LEFT_FOOT_MUX, INPUT);
}

void MuxController::setMuxChannel(int channel)
{
    digitalWrite(MUX_S0, channel & 0x01);
    digitalWrite(MUX_S1, (channel >> 1) & 0x01);
    digitalWrite(MUX_S2, (channel >> 2) & 0x01);
    digitalWrite(MUX_S3, (channel >> 3) & 0x01);
}

int MuxController::readLeftFootSensor(int channel)
{
    setMuxChannel(channel);
    return analogRead(LEFT_FOOT_MUX);
}

int MuxController::readRightFootSensor(int channel)
{
    setMuxChannel(channel);
    return analogRead(RIGHT_FOOT_MUX);
}