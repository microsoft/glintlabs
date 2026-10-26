import path from "node:path";
import { copyApprovedReports } from "../src/publishing/pages-export.ts";

const [reportId, ...extra] = process.argv.slice(2);
if (!reportId || extra.length) {
  throw new Error("Usage: npm run pages:export -- <approved-report-uuid>. This does not approve or deploy a report.");
}
const destination = path.join(process.cwd(), "pages-publications");
const count = await copyApprovedReports(process.cwd(), destination, reportId);
console.log(`Exported ${count} approved report to pages-publications. Review the diff and submit a PR; nothing was deployed.`);
