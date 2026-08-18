const WIFI_SSID_MAX_BYTES = 32;
const WIFI_PASSWORD_MAX_BYTES = 64;

export function buildClaimCommand(sessionId) {
  return `claim:${sessionId}`;
}

export function buildReleaseCommand(sessionId) {
  return `release:${sessionId}`;
}

export function buildPingCommand(sessionId) {
  return `ping:${sessionId}`;
}

export function buildScanCommand(sessionId) {
  return `scan:${sessionId}`;
}

export function buildScanPageCommand(sessionId, page) {
  return `scan_page:${sessionId}:${page}`;
}

export function buildConnectCommand(sessionId) {
  return `connect:${sessionId}`;
}

export function buildForgetCommand(sessionId) {
  return `forget:${sessionId}`;
}

export function buildClaimedSetupSessionStatus(sessionId) {
  return `claimed:${sessionId}`;
}

export function parseWifiStatus(statusValue) {
  if (!statusValue.startsWith("connected:")) {
    return { status: statusValue, wifiSsid: "" };
  }

  return {
    status: "connected",
    wifiSsid: statusValue.substring("connected:".length),
  };
}

export function parseScanResults(scanResultText) {
  return JSON.parse(scanResultText);
}

export function validateWifiCredentials(ssid, password) {
  const encoder = new TextEncoder();
  const ssidByteLength = encoder.encode(ssid).length;
  const passwordByteLength = encoder.encode(password).length;

  if (ssidByteLength === 0) {
    return { isValid: false, reason: "emptySsid" };
  }

  if (
    ssidByteLength > WIFI_SSID_MAX_BYTES ||
    passwordByteLength > WIFI_PASSWORD_MAX_BYTES
  ) {
    return { isValid: false, reason: "tooLong" };
  }

  return { isValid: true };
}
