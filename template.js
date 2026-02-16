export function buildEmbedTag(baseUrl, file) {
  const jsonUrl = baseUrl + file;
  return `<div class="kattene-parts" data-json="${jsonUrl}"></div>`;
}
