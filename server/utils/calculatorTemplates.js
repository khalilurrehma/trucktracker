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
  return cleaned;
};
