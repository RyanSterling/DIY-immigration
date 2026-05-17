/**
 * FDF (Forms Data Format) generator for use with pdftk.
 * FDF is Adobe's format for transferring form data to/from PDFs.
 */

/**
 * Generate an FDF file content for the given field values.
 * FDF is used by pdftk to fill PDF form fields.
 */
export function generateFdf(fields: Record<string, string | boolean>): string {
  const header = `%FDF-1.2
1 0 obj
<<
/FDF
<<
/Fields [`;

  const footer = `]
>>
>>
endobj
trailer
<<
/Root 1 0 R
>>
%%EOF`;

  const fieldEntries: string[] = [];

  for (const [name, value] of Object.entries(fields)) {
    // Escape special characters in field name and value
    const escapedName = escapeFdfString(name);

    if (typeof value === "boolean") {
      // Checkboxes: use "Yes"/"Off" or "1"/"0"
      const escapedValue = value ? "Yes" : "Off";
      fieldEntries.push(`<< /T (${escapedName}) /V /${escapedValue} >>`);
    } else {
      // Text and other fields
      const escapedValue = escapeFdfString(value);
      fieldEntries.push(`<< /T (${escapedName}) /V (${escapedValue}) >>`);
    }
  }

  return `${header}\n${fieldEntries.join("\n")}\n${footer}`;
}

/**
 * Escape special characters for FDF string values.
 * FDF uses parentheses for strings, so we need to escape them.
 */
function escapeFdfString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Backslash first
    .replace(/\(/g, "\\(") // Open paren
    .replace(/\)/g, "\\)") // Close paren
    .replace(/\r\n/g, "\\r\\n") // Windows newline
    .replace(/\r/g, "\\r") // Mac newline
    .replace(/\n/g, "\\n"); // Unix newline
}

/**
 * Generate an XFDF (XML Forms Data Format) file content.
 * XFDF is an XML-based alternative to FDF that some tools prefer.
 */
export function generateXfdf(
  fields: Record<string, string | boolean>,
  pdfFilename?: string
): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <f href="${pdfFilename || ""}" />
  <fields>`;

  const footer = `  </fields>
</xfdf>`;

  const fieldEntries: string[] = [];

  for (const [name, value] of Object.entries(fields)) {
    const escapedName = escapeXml(name);
    const escapedValue =
      typeof value === "boolean"
        ? value
          ? "Yes"
          : "Off"
        : escapeXml(String(value));

    fieldEntries.push(
      `    <field name="${escapedName}"><value>${escapedValue}</value></field>`
    );
  }

  return `${header}\n${fieldEntries.join("\n")}\n${footer}`;
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
