function parseHoursFromText(text) {
  if (!text) return 0;
  const trimmed = text.trim().toLowerCase();

  const minMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(хв|мін|min)/);
  if (minMatch) {
    const minutes = parseFloat(minMatch[1].replace(',', '.'));
    return Math.round((minutes / 60) * 100) / 100;
  }

  const hourMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(год|г\b|h\b|hour)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1].replace(',', '.'));
  }

  const num = parseFloat(trimmed.replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

module.exports = { parseHoursFromText };
