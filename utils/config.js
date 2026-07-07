import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".lamatic");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function readRawConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveNamespace(namespace, data) {
  const current = readRawConfig();
  current[namespace] = { ...(current[namespace] || {}), ...data };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2));
}

export function getKitConfig() {
  return readRawConfig().kit || {};
}

export function saveKitConfig(data) {
  saveNamespace("kit", data);
}
