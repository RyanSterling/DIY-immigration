/**
 * Convert JSON form data to FDF format for PDFtk
 *
 * FDF (Forms Data Format) is Adobe's format for representing
 * form data that can be imported into PDF forms.
 *
 * @param {Object} formData - Key-value pairs of field names and values
 * @returns {string} FDF file content
 */
function jsonToFdf(formData) {
  let fdf = '%FDF-1.2\n';
  fdf += '1 0 obj\n';
  fdf += '<<\n';
  fdf += '/FDF\n';
  fdf += '<<\n';
  fdf += '/Fields [\n';

  for (const [fieldName, value] of Object.entries(formData)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Escape special characters in the value
    const escapedValue = String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    fdf += `<< /T (${fieldName}) /V (${escapedValue}) >>\n`;
  }

  fdf += ']\n';
  fdf += '>>\n';
  fdf += '>>\n';
  fdf += 'endobj\n';
  fdf += 'trailer\n';
  fdf += '<< /Root 1 0 R >>\n';
  fdf += '%%EOF\n';

  return fdf;
}

module.exports = { jsonToFdf };
