import geolib from "geolib";

export const getDeviceRadiusReport = (
  deviceLocation,
  authLocation,
  radius = 100
) => {
  const radiusCheck = geolib.isPointWithinRadius(
    deviceLocation,
    authLocation,
    radius
  );

  return radiusCheck;
};
