export function isStagingReader(repository = process.env.GITHUB_REPOSITORY) {
  return repository === "microsoft/glintlabs_staging";
}

export function readerBasePath(repository = process.env.GITHUB_REPOSITORY) {
  return isStagingReader(repository) ? "" : "/glintlabs";
}
