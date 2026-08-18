import {
  buildClaimCommand,
  buildClaimedSetupSessionStatus,
  buildPingCommand,
  buildReleaseCommand,
} from "./ble-provisioning-protocol.js";

const SETUP_SESSION_HEARTBEAT_MS = 5000;

export class SetupSession {
  constructor({ bleTransport }) {
    this.bleTransport = bleTransport;
    this.sessionId = "";
    this.heartbeat = null;
    this.heartbeatSuspended = false;
  }

  async claim(deviceId) {
    this.sessionId = this.createSetupSessionId();

    await this.bleTransport.writeText(
      "command",
      buildClaimCommand(this.sessionId),
    );

    const sessionStatus = await this.bleTransport.readText("setupSession");
    const expectedStatus = buildClaimedSetupSessionStatus(this.sessionId);

    if (sessionStatus !== expectedStatus) {
      console.warn(
        `Posture Pad ${deviceId} setup session rejected: ${sessionStatus}`,
      );
      this.clearLocal();
      return false;
    }

    this.startHeartbeat();
    return true;
  }

  async release() {
    if (!this.bleTransport.hasEndpoint("command") || !this.hasSession()) {
      return;
    }

    try {
      await this.bleTransport.writeText(
        "command",
        buildReleaseCommand(this.sessionId),
      );
    } catch {
      // The page may already be unloading or the BLE link may already be gone.
    }
  }

  clearLocal() {
    this.stopHeartbeat();
    this.sessionId = "";
    this.heartbeatSuspended = false;
  }

  getSessionId() {
    return this.sessionId;
  }

  hasSession() {
    return this.sessionId.length > 0;
  }

  setHeartbeatSuspended(isSuspended) {
    this.heartbeatSuspended = isSuspended;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = window.setInterval(() => {
      this.sendHeartbeat();
    }, SETUP_SESSION_HEARTBEAT_MS);
  }

  stopHeartbeat() {
    if (!this.heartbeat) {
      return;
    }

    window.clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  async sendHeartbeat() {
    if (
      !this.bleTransport.hasEndpoint("command") ||
      !this.hasSession() ||
      this.heartbeatSuspended
    ) {
      return;
    }

    try {
      await this.bleTransport.writeText(
        "command",
        buildPingCommand(this.sessionId),
      );
    } catch (error) {
      console.error("Could not refresh BLE setup session:", error);
    }
  }

  createSetupSessionId() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
}
