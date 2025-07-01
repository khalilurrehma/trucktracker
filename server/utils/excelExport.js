import JSZip from "jszip";

const COLUMN_KEYS = [
  "battery.voltage",
  "can.engine.ignition.status",
  "can.fuel.consumed",
  "can.vehicle.mileage",
  "device.name",
  "din",
  "dout",
  "event.enum",
  "external.powersource.voltage",
  "fuel.flow.meter.fuel.consumed",
  "gsm.cellid",
  "gsm.signal.dbm",
  "ident",
  "movement.status",
  "position.altitude",
  "position.direction",
  "position.hdop",
  "position.latitude",
  "position.longitude",
  "position.satellites",
  "position.speed",
  "rfid.code",
  "timestamp",
  "vehicle.mileage",
];

function mapMessageForCsv(msg) {
  return COLUMN_KEYS.map((key) =>
    msg.hasOwnProperty(key) && msg[key] != null ? msg[key] : ""
  );
}

export async function messagesToCsvZipBuffer(messages, csvFilename) {
  const csvRows = [];

  csvRows.push(COLUMN_KEYS.join(","));

  for (const msg of messages) {
    const values = mapMessageForCsv(msg);
    const escaped = values.map((val) =>
      typeof val === "string" &&
      (val.includes(",") || val.includes('"') || val.includes("\n"))
        ? `"${val.replace(/"/g, '""')}"`
        : val
    );
    csvRows.push(escaped.join(","));
  }

  const csvString = csvRows.join("\n");

  const zip = new JSZip();
  zip.file(csvFilename, csvString);

  return await zip.generateAsync({ type: "nodebuffer" });
}
