// utils/opKpis.js
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Find a numeric field in root or inside message.result[]
function pickFirstNumeric(message, ...keys) {
  for (const k of keys) {
    const v = message?.[k];
    if (isNum(v)) return v;
  }
  const arr = Array.isArray(message?.result) ? message.result : [];
  for (const k of keys) {
    for (const item of arr) {
      const v = item?.[k];
      if (isNum(v)) return v;
    }
  }
  return null;
}

function sumNumeric(message, ...keys) {
  let sum = 0;
  for (const k of keys) {
    const v = pickFirstNumeric(message, k);
    if (isNum(v)) sum += v;
  }
  return sum || 0;
}

function secondsToMin(sec) {
  if (!isNum(sec)) return 0;
  return +(sec / 60).toFixed(2);
}

// New: seconds to hh:mm:ss or Xm Ys
function formatDuration(sec) {
  if (!isNum(sec) || sec <= 0) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function toISO(ts) {
  if (isNum(ts)) return new Date(ts * 1000).toISOString();
  return new Date().toISOString();
}

export { pickFirstNumeric, sumNumeric, secondsToMin, formatDuration, toISO, isNum };
