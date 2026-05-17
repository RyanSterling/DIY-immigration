#!/usr/bin/env node
/**
 * Test script to verify PDFtk can fill USCIS forms
 *
 * Prerequisites:
 *   brew install pdftk-java
 *
 * Usage:
 *   node scripts/test-pdftk.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Sample form data - mimics what we store in the database
const sampleFormData = {
  'form1[0].#subform[0].Pt1Line1a_FamilyName[0]': 'Smith',
  'form1[0].#subform[0].Pt1Line1b_GivenName[0]': 'John',
  'form1[0].#subform[0].Pt1Line2_MiddleName[0]': 'Michael',
  'form1[0].#subform[0].Pt1Line3_DateofBirth[0]': '01/15/1990',
  // Add more fields as needed for testing
};

// Convert JSON form data to FDF format
function jsonToFdf(formData) {
  let fdf = '%FDF-1.2\n';
  fdf += '1 0 obj\n';
  fdf += '<<\n';
  fdf += '/FDF\n';
  fdf += '<<\n';
  fdf += '/Fields [\n';

  for (const [fieldName, value] of Object.entries(formData)) {
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

async function main() {
  const pdfPath = path.join(__dirname, '../frontend/public/assets/forms/i-129f.pdf');
  const fdfPath = path.join(__dirname, 'test-form-data.fdf');
  const outputPath = path.join(__dirname, 'i-129f-filled.pdf');

  // Check if PDF exists
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found at:', pdfPath);
    console.log('Make sure the I-129F PDF is in frontend/public/assets/forms/');
    process.exit(1);
  }

  // Check if pdftk is installed
  try {
    execSync('which pdftk', { stdio: 'pipe' });
    console.log('✓ pdftk found');
  } catch {
    console.error('❌ pdftk not found. Install with: brew install pdftk-java');
    process.exit(1);
  }

  // Step 1: Dump the field names from the PDF (useful for debugging)
  console.log('\n📋 Dumping PDF field names...');
  try {
    const fields = execSync(`pdftk "${pdfPath}" dump_data_fields`, { encoding: 'utf-8' });
    const fieldNames = fields.match(/FieldName: .+/g) || [];
    console.log(`Found ${fieldNames.length} fields in the PDF`);

    // Save field names to a file for reference
    fs.writeFileSync(
      path.join(__dirname, 'i-129f-fields.txt'),
      fieldNames.join('\n')
    );
    console.log('✓ Field names saved to scripts/i-129f-fields.txt');

    // Show first 10 fields as sample
    console.log('\nSample field names:');
    fieldNames.slice(0, 10).forEach(f => console.log('  ' + f));
  } catch (err) {
    console.error('❌ Failed to dump fields:', err.message);
  }

  // Step 2: Generate FDF file
  console.log('\n📝 Generating FDF file...');
  const fdfContent = jsonToFdf(sampleFormData);
  fs.writeFileSync(fdfPath, fdfContent);
  console.log('✓ FDF file created:', fdfPath);

  // Step 3: Fill the PDF
  console.log('\n📄 Filling PDF with pdftk...');
  try {
    execSync(`pdftk "${pdfPath}" fill_form "${fdfPath}" output "${outputPath}"`, {
      stdio: 'inherit'
    });
    console.log('✓ Filled PDF created:', outputPath);
    console.log('\n🎉 SUCCESS! PDFtk works with this form.');
    console.log('Open the filled PDF to verify the fields are populated correctly.');
  } catch (err) {
    console.error('❌ Failed to fill PDF:', err.message);
    console.log('\nThis might mean:');
    console.log('1. The PDF uses XFA format that pdftk cannot handle');
    console.log('2. The field names in sampleFormData do not match the PDF');
    console.log('3. Check scripts/i-129f-fields.txt for correct field names');
    process.exit(1);
  }

  // Cleanup
  // fs.unlinkSync(fdfPath); // Uncomment to auto-delete FDF file
}

main().catch(console.error);
