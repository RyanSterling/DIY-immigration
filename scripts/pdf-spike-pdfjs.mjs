/**
 * PDF Form Inspection Spike using PDF.js
 *
 * PDF.js (pdfjs-dist) is Mozilla's PDF library used in Firefox.
 * It tends to handle complex government PDFs better than pdf-lib.
 *
 * Run with: node scripts/pdf-spike-pdfjs.mjs
 */

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const I129F_URL = 'https://www.uscis.gov/sites/default/files/document/forms/i-129f.pdf';
const LOCAL_PDF_PATH = join(__dirname, 'i-129f.pdf');
const FIELDS_OUTPUT_PATH = join(__dirname, 'i-129f-fields-pdfjs.json');

async function downloadPdf() {
  console.log('📥 Checking for I-129F PDF...');

  if (existsSync(LOCAL_PDF_PATH)) {
    console.log('   Using cached PDF');
    return new Uint8Array(readFileSync(LOCAL_PDF_PATH));
  }

  console.log('   Downloading from USCIS...');
  const response = await fetch(I129F_URL);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(LOCAL_PDF_PATH, buffer);
  console.log(`   Saved to ${LOCAL_PDF_PATH}`);

  return new Uint8Array(buffer);
}

async function extractFormFields(pdfDoc) {
  console.log('\n📋 Extracting form fields...');

  const allFields = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();

    const formFields = annotations.filter(
      ann => ann.subtype === 'Widget' && ann.fieldType
    );

    for (const field of formFields) {
      allFields.push({
        page: pageNum,
        name: field.fieldName || field.fullName || 'unnamed',
        type: field.fieldType,
        value: field.fieldValue,
        options: field.options || null,
        rect: field.rect,
        maxLen: field.maxLen,
        readOnly: field.readOnly || false,
        required: field.required || false,
      });
    }
  }

  return allFields;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PDF Form Inspection Spike (PDF.js)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const pdfData = await downloadPdf();

    console.log('\n📄 Loading PDF with PDF.js...');
    const loadingTask = getDocument({
      data: pdfData,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    console.log(`   Pages: ${pdfDoc.numPages}`);

    // Get metadata
    const metadata = await pdfDoc.getMetadata();
    console.log(`   Title: ${metadata.info?.Title || 'N/A'}`);
    console.log(`   Producer: ${metadata.info?.Producer || 'N/A'}`);

    // Check if it's XFA
    const xfaData = await pdfDoc.getXFAData?.() || null;
    const isXFA = xfaData && Object.keys(xfaData).length > 0;
    console.log(`\n🔍 Form Type: ${isXFA ? 'XFA (Dynamic)' : 'AcroForm (Static)'}`);

    if (isXFA) {
      console.log('   ⚠️  XFA forms require special handling');
      console.log('   XFA data types found:', Object.keys(xfaData));
    }

    // Extract fields
    const fields = await extractFormFields(pdfDoc);

    console.log(`\n   Found ${fields.length} form fields`);

    // Group by type
    const typeGroups = {};
    fields.forEach(f => {
      typeGroups[f.type] = (typeGroups[f.type] || 0) + 1;
    });

    console.log('\n   Field types:');
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    // Save field info
    writeFileSync(FIELDS_OUTPUT_PATH, JSON.stringify(fields, null, 2));
    console.log(`\n   Field list saved to ${FIELDS_OUTPUT_PATH}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✓ PDF loaded: ${pdfDoc.numPages} pages`);
    console.log(`  ${isXFA ? '⚠️ XFA form' : '✓ AcroForm'}`);
    console.log(`  ✓ Found ${fields.length} form fields`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Show first 30 fields
    console.log('First 30 field names:');
    fields.slice(0, 30).forEach((f, i) => {
      const maxLen = f.maxLen ? ` (max: ${f.maxLen})` : '';
      const req = f.required ? ' *' : '';
      console.log(`  ${i + 1}. [${f.type}] ${f.name}${maxLen}${req}`);
    });

    if (fields.length > 30) {
      console.log(`  ... and ${fields.length - 30} more fields`);
    }

  } catch (error) {
    console.error('\n❌ SPIKE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
