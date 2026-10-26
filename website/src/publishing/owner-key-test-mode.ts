export function ownerKeySkippedForTesting() {
  return process.env.GLINT_LABS_SKIP_OWNER_KEY === "1"
    && process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1";
}
