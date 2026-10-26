import { getOwnerKey, ownerKeyPath } from "../src/publishing/owner-access.ts";

await getOwnerKey();
console.log(`Your publishing owner key is stored privately at: ${ownerKeyPath}`);
console.log("Use that key to unlock publishing in Studio. Do not share it with report viewers.");
