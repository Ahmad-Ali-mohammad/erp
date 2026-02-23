import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function normalizeResourcePath(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function extractResourcePaths(content: string): string[] {
  const paths = new Set<string>();
  const pattern = /resourcePath\s*[:=]\s*["'](\/v1\/[^"']+)["']/g;
  let match: RegExpExecArray | null = pattern.exec(content);
  while (match) {
    paths.add(normalizeResourcePath(match[1]));
    match = pattern.exec(content);
  }
  return [...paths];
}

function collectFilesRecursively(directoryPath: string): string[] {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return collectFilesRecursively(fullPath);
    }
    return [fullPath];
  });
}

test.describe("Permission map coverage", () => {
  test("maps every source resourcePath literal to permission-map", () => {
    const frontendRoot = path.resolve(__dirname, "..", "..", "..");
    const sourceRoot = path.join(frontendRoot, "src");
    const permissionMapFile = path.join(frontendRoot, "src", "lib", "permission-map.ts");

    const sourceFiles = collectFilesRecursively(sourceRoot).filter((filePath) => {
      const isSourceFile = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
      const isPermissionMapFile = path.resolve(filePath) === path.resolve(permissionMapFile);
      return isSourceFile && !isPermissionMapFile;
    });
    const usedResourcePaths = new Set<string>();

    sourceFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      extractResourcePaths(content).forEach((resourcePath) => {
        usedResourcePaths.add(resourcePath);
      });
    });

    const permissionMapContent = fs.readFileSync(permissionMapFile, "utf8");
    const mappedResourcePaths = new Set<string>(extractResourcePaths(permissionMapContent));

    const missingPaths = [...usedResourcePaths].filter((resourcePath) => !mappedResourcePaths.has(resourcePath)).sort();

    expect(usedResourcePaths.size).toBeGreaterThan(0);
    expect(
      missingPaths,
      `Missing permission-map entries for resourcePath literals: ${missingPaths.join(", ")}`,
    ).toEqual([]);
  });
});
