import { LISTING_FILE, type Listings, readJson, validateListings } from "./lib.ts";

const errs = validateListings(readJson<Listings>(LISTING_FILE));
if (errs.length) { console.error(errs.map((e) => `- ${e}`).join("\n")); process.exit(1); }
console.log("marketplace.json ok");
