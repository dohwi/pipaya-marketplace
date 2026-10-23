import { loadCatalog, validate } from "./lib.ts";

const errs = validate(loadCatalog());
if (errs.length) { console.error(errs.map((e) => `- ${e}`).join("\n")); process.exit(1); }
console.log("marketplace.json ok");
