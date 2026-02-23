import fs from "node:fs";
import path from "node:path";

function normalizeResourcePath(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function extractResourcePaths(content) {
  const pattern = /resourcePath\s*[:=]\s*["'](\/v1\/[^"']+)["']/g;
  const paths = new Set();
  let match = pattern.exec(content);
  while (match) {
    paths.add(normalizeResourcePath(match[1]));
    match = pattern.exec(content);
  }
  return [...paths];
}

function collectFilesRecursively(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return collectFilesRecursively(fullPath);
    }
    return [fullPath];
  });
}

const frontendRoot = process.cwd();
const sourceRoot = path.join(frontendRoot, "src");
const permissionMapFile = path.join(sourceRoot, "lib", "permission-map.ts");

if (!fs.existsSync(sourceRoot)) {
  console.error("Source directory not found:", sourceRoot);
  process.exit(1);
}
if (!fs.existsSync(permissionMapFile)) {
  console.error("Permission map file not found:", permissionMapFile);
  process.exit(1);
}

const sourceFiles = collectFilesRecursively(sourceRoot).filter((filePath) => {
  const isSourceFile = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  const isPermissionMapFile = path.resolve(filePath) === path.resolve(permissionMapFile);
  return isSourceFile && !isPermissionMapFile;
});

const usedResourcePaths = new Set();
sourceFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  extractResourcePaths(content).forEach((resourcePath) => {
    usedResourcePaths.add(resourcePath);
  });
});

const permissionMapContent = fs.readFileSync(permissionMapFile, "utf8");
const mappedResourcePaths = new Set(extractResourcePaths(permissionMapContent));

const missingPaths = [...usedResourcePaths].filter((resourcePath) => !mappedResourcePaths.has(resourcePath)).sort();

if (usedResourcePaths.size === 0) {
  console.error("No resourcePath literals were found in source files.");
  process.exit(1);
}

if (missingPaths.length > 0) {
  console.error("Missing permission-map entries for resourcePath literals:");
  missingPaths.forEach((value) => {
    console.error(`- ${value}`);
  });
  process.exit(1);
}

console.log(
  `permission-map coverage OK: ${usedResourcePaths.size} source paths mapped to ${mappedResourcePaths.size} map entries.`,
);
