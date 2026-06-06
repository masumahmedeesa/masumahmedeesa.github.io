import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { portfolioContent } from "../src/data/portfolio.js";
import { preparePortfolioContent } from "../src/utils/portfolioContent.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = resolve(rootDir, "public/content/portfolio-content.json");

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, `${JSON.stringify(preparePortfolioContent(portfolioContent), null, 2)}\n`, "utf8");

console.log(`Wrote ${targetPath}`);
