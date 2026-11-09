export function readerBasePath(repository = process.env.GITHUB_REPOSITORY) {
  return repository === "microsoft/glintlabs_staging" ? "" : "/glintlabs";
}
