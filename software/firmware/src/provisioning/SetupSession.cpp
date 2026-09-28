#include "SetupSession.h"

namespace
{
    constexpr unsigned long SETUP_SESSION_TIMEOUT_MS = 15000;
}

bool SetupSession::isClaimed() const
{
    return !sessionId.isEmpty();
}

const String &SetupSession::getSessionId() const
{
    return sessionId;
}

bool SetupSession::owns(const String &candidateSessionId) const
{
    return !candidateSessionId.isEmpty() && candidateSessionId == sessionId;
}

bool SetupSession::claim(const String &candidateSessionId, unsigned long now)
{
    if (candidateSessionId.isEmpty())
        return false;

    if (sessionId.isEmpty() || sessionId == candidateSessionId)
    {
        sessionId = candidateSessionId;
        lastActivityMs = now;
        return true;
    }

    return false;
}

bool SetupSession::release()
{
    if (sessionId.isEmpty())
        return false;

    sessionId = "";
    lastActivityMs = 0;
    return true;
}

bool SetupSession::ping(const String &candidateSessionId, unsigned long now)
{
    if (!owns(candidateSessionId))
        return false;

    lastActivityMs = now;
    return true;
}

bool SetupSession::expireIfTimedOut(unsigned long now)
{
    if (!isTimedOut(now))
        return false;

    release();
    return true;
}

void SetupSession::recordActivity(unsigned long now)
{
    if (!sessionId.isEmpty())
        lastActivityMs = now;
}

bool SetupSession::isTimedOut(unsigned long now) const
{
    return !sessionId.isEmpty() && now - lastActivityMs > SETUP_SESSION_TIMEOUT_MS;
}
