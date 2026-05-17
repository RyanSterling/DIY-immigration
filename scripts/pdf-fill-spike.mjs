/**
 * PDF Form Filling Spike - Simplified Approach
 *
 * Tests filling an AcroForm PDF using pdf-lib
 *
 * Run with: node scripts/pdf-fill-spike.mjs
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const I129F_URL = 'https://www.uscis.gov/sites/default/files/document/forms/i-129f.pdf';
const LOCAL_PDF_PATH = join(__dirname, 'i-129f.pdf');
const OUTPUT_PDF_PATH = join(__dirname, 'i-129f-filled-test.pdf');

async function downloadPdf() {
  console.log('📥 Downloading I-129F PDF...');

  if (existsSync(LOCAL_PDF_PATH)) {
    console.log('   Using cached PDF');
    return readFileSync(LOCAL_PDF_PATH);
  }

  const response = await fetch(I129F_URL);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(LOCAL_PDF_PATH, buffer);
  console.log('   Downloaded successfully');

  return buffer;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PDF Form Filling Spike');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const pdfBytes = await downloadPdf();

    console.log('\n📄 Loading PDF with pdf-lib...');

    // Try loading with various options
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });

    console.log(`   Loaded! Pages: ${pdfDoc.getPageCount()}`);

    // Get form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`   Form fields found: ${fields.length}`);

    // Try to fill some fields
    console.log('\n✏️  Attempting to fill fields...\n');

    const testData = [
      { pattern: /Pt1Line6a_FamilyName/, value: 'TESTLASTNAME', type: 'text' },
      { pattern: /Pt1Line6b_GivenName/, value: 'TESTFIRSTNAME', type: 'text' },
      { pattern: /Pt1Line6c_MiddleName/, value: 'TESTMIDDLE', type: 'text' },
      { pattern: /Pt1Line1_AlienNumber/, value: '123456789', type: 'text' },
      { pattern: /Pt1Line8_StreetNumberName/, value: '123 Main Street', type: 'text' },
      { pattern: /Pt1Line8_CityOrTown/, value: 'Los Angeles', type: 'text' },
      { pattern: /Pt1Line8_ZipCode/, value: '90210', type: 'text' },
    ];

    let filledCount = 0;
    let failedCount = 0;

    for (const test of testData) {
      for (const field of fields) {
        const name = field.getName();
        if (test.pattern.test(name)) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              field.setText(test.value);
              console.log(`   ✓ Filled: ${name.split('.').pop()} = "${test.value}"`);
              filledCount++;
            }
          } catch (err) {
            console.log(`   ✗ Failed: ${name.split('.').pop()}: ${err.message}`);
            failedCount++;
          }
          break;
        }
      }
    }

    // Try a checkbox
    for (const field of fields) {
      if (field.constructor.name === 'PDFCheckBox') {
        const name = field.getName();
        try {
          field.check();
          console.log(`   ✓ Checked: ${name.split('.').pop()}`);
          filledCount++;
          break;
        } catch (err) {
          console.log(`   ✗ Failed to check: ${err.message}`);
          failedCount++;
        }
      }
    }

    console.log(`\n   Filled: ${filledCount}, Failed: ${failedCount}`);

    // Save the filled PDF
    console.log('\n💾 Saving filled PDF...');
    const filledPdfBytes = await pdfDoc.save();
    writeFileSync(OUTPUT_PDF_PATH, filledPdfBytes);
    console.log(`   Saved to: ${OUTPUT_PDF_PATH}`);
    console.log(`   Size: ${(filledPdfBytes.length / 1024 / 1024).toFixed(2)} MB`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SPIKE RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✓ PDF loaded successfully`);
    console.log(`  ✓ Found ${fields.length} form fields`);
    console.log(`  ${filledCount > 0 ? '✓' : '✗'} Field filling: ${filledCount > 0 ? 'WORKS' : 'FAILED'}`);
    console.log(`  ✓ Output saved to: ${OUTPUT_PDF_PATH}`);
    console.log(`\n  VERDICT: ${filledCount > 0 ? '✅ PROCEED WITH IMPLEMENTATION' : '⚠️ NEEDS ALTERNATIVE APPROACH'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Next step: Open the output PDF in Adobe Reader to verify fields are filled.');

  } catch (error) {
    console.error('\n❌ SPIKE FAILED:', error.message);

    if (error.message.includes('encrypted')) {
      console.log('\n💡 The PDF is encrypted. Options:');
      console.log('   1. Use a PDF service/API that can handle encrypted PDFs');
      console.log('   2. Use pdftk to decrypt first: pdftk input.pdf output decrypted.pdf');
      console.log('   3. Use a different library like muhammara');
    }

    if (error.message.includes('Invalid object') || error.message.includes('XFA')) {
      console.log('\n💡 The PDF has complex structure. Options:');
      console.log('   1. The form wizard approach still works (React forms + generate PDF)');
      console.log('   2. Use a server-side PDF service');
      console.log('   3. Use browser-based form filling (let user fill in browser)');
    }

    process.exit(1);
  }
}

main();
