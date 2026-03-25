import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const candidates = [
  path.join(root, "apps", "mobile", "node_modules", "expo", "node_modules", "@expo", "metro", "node_modules", "metro-config", "src", "loadConfig.js"),
  path.join(root, "node_modules", "expo", "node_modules", "@expo", "metro", "node_modules", "metro-config", "src", "loadConfig.js")
];

for (const filePath of candidates) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes("await import(pathToFileURL(absolutePath).href)")) {
    continue;
  }
  if (!source.includes("await import(absolutePath)")) {
    continue;
  }

  let patched = source;

  if (!patched.includes('require("url")')) {
    patched = patched.replace(
      'var path = _interopRequireWildcard(require("path"));',
      'var path = _interopRequireWildcard(require("path"));\nvar _url = require("url");'
    );
  }

  patched = patched.replace(
    "const configModule = await import(absolutePath);",
    "const configModule = await import(_url.pathToFileURL(absolutePath).href);"
  );
  patched = patched.replace(
    "const configModule = await import(pathToFileURL(absolutePath).href);",
    "const configModule = await import(_url.pathToFileURL(absolutePath).href);"
  );

  if (patched !== source) {
    fs.writeFileSync(filePath, patched, "utf8");
    console.log(`Patched Metro config loader: ${path.relative(root, filePath)}`);
  }
}
