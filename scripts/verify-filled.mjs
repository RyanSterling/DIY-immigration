/**
 * Verify filled PDF values using PDF.js
 */

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const filledPdfPath = join(__dirname, 'i-129f-filled-pdftk.pdf');
  const pdfData = new Uint8Array(readFileSync(filledPdfPath));

  console.log('Loading filled PDF...');
  const loadingTask = getDocument({ data: pdfData, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;

  console.log(`Pages: ${pdfDoc.numPages}`);

  // Check page 1 for our test fields
  const page = await pdfDoc.getPage(1);
  const annotations = await page.getAnnotations();

  console.log('\nChecking filled fields on page 1:\n');

  const testFields = [
    'Pt1Line6a_FamilyName',
    'Pt1Line6b_GivenName',
    'Pt1Line6c_MiddleName',
    'Pt1Line8_StreetNumberName',
    'Pt1Line8_CityOrTown',
    'Pt1Line8_ZipCode',
  ];

  for (const ann of annotations) {
    if (ann.fieldType === 'Tx') {
      const name = ann.fieldName || ann.fullName || '';
      const shortName = name.split('.').pop();

      for (const testField of testFields) {
        if (name.includes(testField)) {
          console.log(`${shortName}:`);
          console.log(`  Value: "${ann.fieldValue || '(empty)'}"`);
          console.log('');
        }
      }
    }
  }
}

main().catch(console.error);
