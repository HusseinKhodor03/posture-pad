const DEVICE_ID_PATTERN = /^[0-9A-F]{12}$/;

export function normalizeDeviceId(deviceId) {
  if (typeof deviceId !== "string") return null;

  const normalizedDeviceId = deviceId.toUpperCase();
  return DEVICE_ID_PATTERN.test(normalizedDeviceId)
    ? normalizedDeviceId
    : null;
}
