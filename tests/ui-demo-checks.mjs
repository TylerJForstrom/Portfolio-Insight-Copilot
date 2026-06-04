import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "src", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "styles.css"), "utf8");

assert.match(html, /data-view="demo"/, "workspace should include a Demo Guide tab");
assert.match(html, /data-view-panel="demo"/, "workspace should include a demo view panel");
assert.match(html, /id="loadDemoPortfolio"/, "demo should expose a load scenario action");
assert.match(html, /id="runGuardrailDemo"/, "demo should expose a guardrail action");
assert.match(html, /id="copyDemoReport"/, "demo should expose report copy action");
assert.match(html, /id="demoReportPreview"/, "demo should render a report preview");

assert.match(app, /const demoPortfolio = \[/, "app should define a reusable demo portfolio");
assert.match(app, /function buildDemoReportText/, "app should generate a demo report");
assert.match(app, /function renderDemoReport/, "app should render demo metrics and report preview");
assert.match(app, /function loadDemoPortfolio/, "app should load the demo portfolio into the builder");
assert.match(app, /function runGuardrailDemo/, "app should trigger the advice guardrail demo");
assert.match(app, /function copyDemoReport/, "app should copy the website demo report");

assert.match(css, /grid-template-columns: repeat\(3, minmax\(150px, 1fr\)\)/, "workspace tabs should support three tabs");
assert.match(css, /\.demo-flow/, "demo workflow should have dedicated styling");
assert.match(css, /\.report-preview/, "demo report preview should have dedicated styling");

console.log("ui demo checks passed");
