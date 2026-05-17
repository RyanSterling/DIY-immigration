/**
 * PDF Form Filling Spike - Technical Validation
 *
 * This script validates that we can:
 * 1. Load the I-129F PDF from USCIS
 * 2. Extract form field names
 * 3. Fill fields programmatically
 * 4. Generate a valid filled PDF
 *
 * Run with: node scripts/pdf-spike.mjs
 */

import { PDFDocument } from 'pdf-lib';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const I129F_URL = 'https://www.uscis.gov/sites/default/files/document/forms/i-129f.pdf';
const LOCAL_PDF_PATH = join(__dirname, 'i-129f.pdf');
const OUTPUT_PDF_PATH = join(__dirname, 'i-129f-filled.pdf');
const FIELDS_OUTPUT_PATH = join(__dirname, 'i-129f-fields.json');

async function downloadPdf() {
  console.log('📥 Downloading I-129F PDF from USCIS...');

  if (existsSync(LOCAL_PDF_PATH)) {
    console.log('   Using cached PDF');
    return readFileSync(LOCAL_PDF_PATH);
  }

  const response = await fetch(I129F_URL);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(LOCAL_PDF_PATH, buffer);
  console.log(`   Saved to ${LOCAL_PDF_PATH}`);

  return buffer;
}

async function extractFields(pdfDoc) {
  console.log('\n📋 Extracting form fields...');

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`   Found ${fields.length} fields`);

  const fieldInfo = fields.map(field => {
    const name = field.getName();
    const type = field.constructor.name;

    let value = null;
    let options = null;

    try {
      if (type === 'PDFTextField') {
        value = field.getText();
      } else if (type === 'PDFCheckBox') {
        value = field.isChecked();
      } else if (type === 'PDFDropdown') {
        value = field.getSelected();
        options = field.getOptions();
      } else if (type === 'PDFRadioGroup') {
        value = field.getSelected();
        options = field.getOptions();
      }
    } catch (e) {
      // Some fields may not have values
    }

    return {
      name,
      type,
      value,
      options
    };
  });

  // Group by type for summary
  const typeGroups = {};
  fieldInfo.forEach(f => {
    typeGroups[f.type] = (typeGroups[f.type] || 0) + 1;
  });

  console.log('\n   Field types:');
  Object.entries(typeGroups).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });

  return fieldInfo;
}

async function testFillFields(pdfDoc) {
  console.log('\n✏️  Testing field filling...');

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  // Find some text fields to test
  const textFields = fields.filter(f => f.constructor.name === 'PDFTextField');
  const checkboxFields = fields.filter(f => f.constructor.name === 'PDFCheckBox');

  console.log(`   Found ${textFields.length} text fields, ${checkboxFields.length} checkboxes`);

  // Test filling first few text fields
  const testValues = [
    { pattern: /familyname|lastname/i, value: 'TESTLASTNAME' },
    { pattern: /givenname|firstname/i, value: 'TESTFIRSTNAME' },
    { pattern: /middlename/i, value: 'TESTMIDDLE' },
    { pattern: /dateofbirth|dob|birthdate/i, value: '01/15/1990' },
    { pattern: /city/i, value: 'Los Angeles' },
    { pattern: /state/i, value: 'CA' },
    { pattern: /zipcode|postalcode/i, value: '90210' },
  ];

  let filledCount = 0;

  for (const field of textFields.slice(0, 20)) {
    const name = field.getName();

    for (const test of testValues) {
      if (test.pattern.test(name)) {
        try {
          field.setText(test.value);
          console.log(`   ✓ Filled "${name}" with "${test.value}"`);
          filledCount++;
          break;
        } catch (e) {
          console.log(`   ✗ Failed to fill "${name}": ${e.message}`);
        }
      }
    }
  }

  // Test checking a checkbox
  if (checkboxFields.length > 0) {
    try {
      const checkbox = checkboxFields[0];
      checkbox.check();
      console.log(`   ✓ Checked checkbox "${checkbox.getName()}"`);
      filledCount++;
    } catch (e) {
      console.log(`   ✗ Failed to check checkbox: ${e.message}`);
    }
  }

  console.log(`\n   Successfully filled ${filledCount} fields`);

  return filledCount > 0;
}

async function savePdf(pdfDoc) {
  console.log('\n💾 Saving filled PDF...');

  const pdfBytes = await pdfDoc.save();
  writeFileSync(OUTPUT_PDF_PATH, pdfBytes);
  console.log(`   Saved to ${OUTPUT_PDF_PATH}`);
  console.log(`   File size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);

  return OUTPUT_PDF_PATH;
}

async function checkForXFA(pdfDoc) {
  console.log('\n🔍 Checking for XFA (problematic format)...');

  // pdf-lib doesn't support XFA, so if we got this far without errors, it's likely AcroForm
  // But let's try to detect if there might be XFA content

  const catalog = pdfDoc.catalog;
  const acroForm = catalog.lookup(catalog.get('AcroForm'));

  if (acroForm) {
    const xfa = acroForm.get('XFA');
    if (xfa) {
      console.log('   ⚠️  XFA detected! This form may have limited compatibility.');
      console.log('   Consider using pdftk or another tool for full XFA support.');
      return true;
    }
  }

  console.log('   ✓ No XFA detected - form uses AcroForm (good!)');
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PDF Form Filling Spike - I-129F Technical Validation');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Download PDF
    const pdfBytes = await downloadPdf();

    // Step 2: Load PDF
    console.log('\n📄 Loading PDF with pdf-lib...');
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,  // USCIS forms are often encrypted but allow form filling
    });
    console.log(`   Pages: ${pdfDoc.getPageCount()}`);

    // Step 3: Check for XFA
    const hasXFA = await checkForXFA(pdfDoc);

    // Step 4: Extract fields
    const fields = await extractFields(pdfDoc);

    // Save field info to JSON
    writeFileSync(FIELDS_OUTPUT_PATH, JSON.stringify(fields, null, 2));
    console.log(`\n   Field list saved to ${FIELDS_OUTPUT_PATH}`);

    // Step 5: Test filling fields
    const fillSuccess = await testFillFields(pdfDoc);

    // Step 6: Save filled PDF
    const outputPath = await savePdf(pdfDoc);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SPIKE RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✓ PDF loaded successfully`);
    console.log(`  ${hasXFA ? '⚠️' : '✓'} Form type: ${hasXFA ? 'XFA (limited support)' : 'AcroForm (full support)'}`);
    console.log(`  ✓ Found ${fields.length} form fields`);
    console.log(`  ${fillSuccess ? '✓' : '✗'} Field filling: ${fillSuccess ? 'WORKS' : 'FAILED'}`);
    console.log(`  ✓ Output saved to: ${outputPath}`);
    const verdict = fillSuccess && !hasXFA ? '✅ PROCEED WITH IMPLEMENTATION' : '⚠️ REVIEW ISSUES ABOVE';
    console.log(`\n  VERDICT: ${verdict}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Print first 20 field names for reference
    console.log('First 20 field names (for mapping reference):');
    fields.slice(0, 20).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.type})`);
    });

  } catch (error) {
    console.error('\n❌ SPIKE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
