#ifndef SETUP_SESSION_H
#define SETUP_SESSION_H

#include <Arduino.h>

class SetupSession
{
public:
    bool isClaimed() const;
    const String &getSessionId() const;
    bool owns(const String &sessionId) const;
    bool claim(const String &sessionId, unsigned long now);
    bool release();
    bool ping(const String &sessionId, unsigned long now);
    bool expireIfTimedOut(unsigned long now);
    void recordActivity(unsigned long now);

private:
    String sessionId;
    unsigned long lastActivityMs = 0;

    bool isTimedOut(unsigned long now) const;
};

#endif
