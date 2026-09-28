#include "ProvisioningProtocol.h"

namespace
{
    String getCommandSession(const String &command, const String &prefix)
    {
        if (!command.startsWith(prefix))
            return "";

        return command.substring(prefix.length());
    }
}

namespace ProvisioningProtocol
{
    String getClaimSession(const String &command)
    {
        return getCommandSession(command, CLAIM_COMMAND_PREFIX);
    }

    String getReleaseSession(const String &command)
    {
        return getCommandSession(command, RELEASE_COMMAND_PREFIX);
    }

    String getPingSession(const String &command)
    {
        return getCommandSession(command, PING_COMMAND_PREFIX);
    }

    String getScanSession(const String &command)
    {
        return getCommandSession(command, SCAN_COMMAND_PREFIX);
    }

    String getConnectSession(const String &command)
    {
        return getCommandSession(command, CONNECT_COMMAND_PREFIX);
    }

    String getForgetSession(const String &command)
    {
        return getCommandSession(command, FORGET_COMMAND_PREFIX);
    }

    String formatClaimedSetupSessionStatus(const String &sessionId)
    {
        return String(SETUP_SESSION_CLAIMED_PREFIX) + sessionId;
    }

    bool parseScanPageCommand(const String &command, String &sessionId, int &page)
    {
        String value = getCommandSession(command, SCAN_PAGE_COMMAND_PREFIX);

        if (value.isEmpty())
            return false;

        int separatorIndex = value.indexOf(':');

        if (separatorIndex < 0)
            return false;

        sessionId = value.substring(0, separatorIndex);
        page = value.substring(separatorIndex + 1).toInt();
        return true;
    }
}
