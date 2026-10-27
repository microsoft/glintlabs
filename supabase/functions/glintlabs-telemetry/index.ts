import { createHandler } from "./handler.ts";

Deno.serve(createHandler({
  env: name => Deno.env.get(name),
  fetch,
  log: message => console.error(`[Glint Labs analytics] ${message}`),
}));
