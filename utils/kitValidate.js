import fs from "fs";
import path from "path";

const REQUIRED_ROOT_FILES = ["lamatic.config.ts", "agent.md", "README.md"];
const REQUIRED_CONSTITUTION = path.join("constitutions", "default.md");

function detectType(configContents) {
  if (/['"]kit['"]/.test(configContents)) return "kit";
  if (/['"]bundle['"]/.test(configContents)) return "bundle";
  if (/['"]template['"]/.test(configContents)) return "template";
  return null;
}

export function validateKitStructure(kitPath) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(kitPath) || !fs.statSync(kitPath).isDirectory()) {
    return { status: "invalid", errors: [`Path does not exist or is not a directory: ${kitPath}`], warnings: [] };
  }

  for (const file of REQUIRED_ROOT_FILES) {
    if (!fs.existsSync(path.join(kitPath, file))) {
      errors.push(`Missing ${file}`);
    }
  }

  if (!fs.existsSync(path.join(kitPath, REQUIRED_CONSTITUTION))) {
    errors.push("Missing constitutions/default.md");
  }

  const flowsDir = path.join(kitPath, "flows");
  if (!fs.existsSync(flowsDir)) {
    errors.push("Missing flows/ directory");
  } else {
    const flowFiles = fs.readdirSync(flowsDir).filter((f) => f.endsWith(".ts"));
    if (flowFiles.length === 0) {
      errors.push("No .ts flow files found in flows/ — each flow must be a .ts file exported from Lamatic Studio");
    }
    const flowSubdirs = fs.readdirSync(flowsDir).filter((f) => fs.statSync(path.join(flowsDir, f)).isDirectory());
    for (const dir of flowSubdirs) {
      warnings.push(`Old-style flow subdirectory found: flows/${dir}/ — flows should be .ts files, not folders. Re-export from Lamatic Studio.`);
    }
  }

  const configPath = path.join(kitPath, "lamatic.config.ts");
  let kitType = null;
  if (fs.existsSync(configPath)) {
    const configContents = fs.readFileSync(configPath, "utf8");
    kitType = detectType(configContents);

    if (!kitType) {
      errors.push('lamatic.config.ts is missing a valid type field ("kit", "bundle", or "template")');
    } else {
      if (kitType === "kit") {
        if (!fs.existsSync(path.join(kitPath, "apps", "package.json"))) {
          errors.push("Kit is missing apps/package.json — kits must include a Next.js app");
        }
        if (!fs.existsSync(path.join(kitPath, "apps", ".env.example"))) {
          errors.push("Kit is missing apps/.env.example");
        }
      }
      if (kitType === "kit" || kitType === "bundle") {
        if (!fs.existsSync(path.join(kitPath, ".env.example"))) {
          warnings.push("Missing .env.example — bundles and kits should include one");
        }
      }
      const kitName = path.basename(kitPath);
      if (!configContents.includes(`kits/${kitName}`)) {
        warnings.push(`lamatic.config.ts — links.github should point to kits/${kitName}`);
      }
    }
  }

  for (const envFile of [".env", ".env.local"]) {
    if (fs.existsSync(path.join(kitPath, envFile))) {
      errors.push(`Committed env file found: ${envFile} — never commit .env or .env.local, only .env.example`);
    }
    if (fs.existsSync(path.join(kitPath, "apps", envFile))) {
      errors.push(`Committed env file found: apps/${envFile} — never commit .env or .env.local, only .env.example`);
    }
  }

  if (fs.existsSync(flowsDir)) {
    const refPattern = /@(prompts|scripts|model-configs|constitutions|triggers\/widgets|memory|tools)\/[^"'\s]+\.(md|ts)/g;
    const flowFiles = fs.readdirSync(flowsDir).filter((f) => f.endsWith(".ts"));
    for (const flowFile of flowFiles) {
      const contents = fs.readFileSync(path.join(flowsDir, flowFile), "utf8");
      const matches = contents.match(refPattern) || [];
      for (const ref of matches) {
        const refPath = path.join(kitPath, ref.replace(/^@/, ""));
        if (!fs.existsSync(refPath)) {
          errors.push(`Flow ${flowFile} references "${ref}" but the file does not exist in the kit`);
        }
      }
    }
  }

  return {
    status: errors.length > 0 ? "invalid" : "valid",
    type: kitType,
    errors,
    warnings,
  };
}
