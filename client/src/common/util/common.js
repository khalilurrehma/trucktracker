export function parseGeoJSON(jsonObj) {
  if (jsonObj.selectors && Array.isArray(jsonObj.selectors)) {
    jsonObj.selectors.forEach((selector) => {
      if (selector.type === "geofence" && Array.isArray(selector.geofences)) {
        selector.geofences.forEach((geofence) => {
          if (typeof geofence.radius === "string") {
            geofence.radius = parseFloat(geofence.radius);
          }
          if (typeof geofence.width === "string") {
            geofence.width = parseFloat(geofence.width);
          }
          if (geofence.center && typeof geofence.center.lat === "string") {
            geofence.center.lat = parseFloat(geofence.center.lat);
          }
          if (geofence.center && typeof geofence.center.lon === "string") {
            geofence.center.lon = parseFloat(geofence.center.lon);
          }
          if (geofence.mapType) {
            delete geofence.mapType;
          }

          if (geofence.path && Array.isArray(geofence.path)) {
            geofence.path.forEach((point) => {
              if (typeof point.lat === "string") {
                point.lat = parseFloat(point.lat);
              }
              if (typeof point.lon === "string") {
                point.lon = parseFloat(point.lon);
              }
            });
          }
        });
      }
    });
  }

  if (jsonObj.counters && Array.isArray(jsonObj.counters)) {
    jsonObj.counters.forEach((counter) => {
      if (counter.hasOwnProperty("dataType")) {
        delete counter.dataType;
      }
    });
  }

  return jsonObj;
}
