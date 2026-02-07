import fs from "fs/promises";
import path from "path";

const resolveTemplatePath = async (filePath) => {
  const candidates = [
    path.resolve(process.cwd(), "server", filePath),
    path.resolve(process.cwd(), filePath),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Calculator template file not found: ${filePath}`);
};

export const loadCalculatorTemplateConfig = async (filePath) => {
  const resolvedPath = await resolveTemplatePath(filePath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  return JSON.parse(raw);
};

export const sanitizeCalculatorConfig = (config) => {
  const cleaned = { ...config };
  delete cleaned.id;
  delete cleaned.cid;
  delete cleaned.version;

  if (Array.isArray(cleaned.selectors)) {
    cleaned.selectors = cleaned.selectors.map((selector) => {
      if (!selector || typeof selector !== "object") return selector;
      const normalized = { ...selector };
      if (!normalized.type && normalized.expression) {
        normalized.type = "expression";
      }
      if (normalized.type === "geofences_transit") {
        if (normalized.from !== undefined && normalized.from_geofence_id === undefined) {
          normalized.from_geofence_id = normalized.from;
          delete normalized.from;
        }
        if (normalized.to !== undefined && normalized.to_geofence_id === undefined) {
          normalized.to_geofence_id = normalized.to;
          delete normalized.to;
        }
      }
      return normalized;
    });
  }

  if (Array.isArray(cleaned.counters)) {
    cleaned.counters = cleaned.counters
      .map((counter) => {
        if (!counter || typeof counter !== "object") return counter;

        const normalized = { ...counter };

        if (normalized.method === "avg") {
          normalized.method = "average";
        }
        if (normalized.method === "max") {
          normalized.method = "maximum";
        }
        if (normalized.method === "min") {
          normalized.method = "minimum";
        }
        if (normalized.method === "sum") {
          normalized.method = "summary";
        }

        if (normalized.type === "duration") {
          normalized.type = "interval";
          normalized.expression = normalized.expression || "duration";
        }

        if (normalized.type === "parameter" && normalized.format) {
          delete normalized.format;
        }

        if (normalized.type === "expression" && !normalized.method) {
          normalized.method = "last";
        }

        if (normalized.type === "calc") {
          const calcId = Number(normalized.calc_id);
          if (!Number.isFinite(calcId) || calcId < 1) {
            return null;
          }
          normalized.calc_id = calcId;
        }

        return normalized;
      })
      .filter(Boolean);
  }

  return cleaned;
};
