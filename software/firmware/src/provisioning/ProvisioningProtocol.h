#ifndef PROVISIONING_PROTOCOL_H
#define PROVISIONING_PROTOCOL_H

#include <Arduino.h>

namespace ProvisioningProtocol
{
    constexpr const char *CLAIM_COMMAND_PREFIX = "claim:";
    constexpr const char *RELEASE_COMMAND_PREFIX = "release:";
    constexpr const char *PING_COMMAND_PREFIX = "ping:";
    constexpr const char *SCAN_COMMAND_PREFIX = "scan:";
    constexpr const char *SCAN_PAGE_COMMAND_PREFIX = "scan_page:";
    constexpr const char *CONNECT_COMMAND_PREFIX = "connect:";
    constexpr const char *FORGET_COMMAND_PREFIX = "forget:";

    constexpr const char *STATUS_UNCONFIGURED = "unconfigured";
    constexpr const char *STATUS_CONNECTED = "connected";
    constexpr const char *SETUP_SESSION_AVAILABLE = "available";
    constexpr const char *SETUP_SESSION_BUSY = "busy";
    constexpr const char *SETUP_SESSION_CLAIMED_PREFIX = "claimed:";

    constexpr const char *SCAN_RESULTS_IDLE = "{\"status\":\"idle\",\"networks\":[]}";
    constexpr const char *SCAN_RESULTS_SCANNING = "{\"status\":\"scanning\",\"networks\":[]}";
    constexpr const char *SCAN_RESULTS_FAILED = "{\"status\":\"failed\",\"networks\":[]}";
    constexpr const char *SCAN_STATUS_COMPLETE = "complete";

    String getClaimSession(const String &command);
    String getReleaseSession(const String &command);
    String getPingSession(const String &command);
    String getScanSession(const String &command);
    String getConnectSession(const String &command);
    String getForgetSession(const String &command);
    String formatClaimedSetupSessionStatus(const String &sessionId);
    bool parseScanPageCommand(const String &command, String &sessionId, int &page);
}

#endif
