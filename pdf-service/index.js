const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { jsonToFdf } = require('./lib/fdf');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow requests from frontend
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '1mb' }));

// Supported form types and their PDF files
const FORM_CONFIG = {
  'i-129f': {
    pdfFile: 'i-129f.pdf',
    displayName: 'Form I-129F'
  },
  'i-134': {
    pdfFile: 'i-134.pdf',
    displayName: 'Form I-134'
  }
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pdf-filler',
    supportedForms: Object.keys(FORM_CONFIG)
  });
});

// Main PDF filling endpoint
app.post('/fill-pdf', async (req, res) => {
  const { formType, formData } = req.body;

  // Validate request
  if (!formType) {
    return res.status(400).json({ error: 'formType is required' });
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData must be an object' });
  }

  const config = FORM_CONFIG[formType];
  if (!config) {
    return res.status(400).json({
      error: `Unsupported form type: ${formType}`,
      supportedForms: Object.keys(FORM_CONFIG)
    });
  }

  // Check if PDF file exists
  const pdfPath = path.join(__dirname, 'forms', config.pdfFile);
  if (!fs.existsSync(pdfPath)) {
    return res.status(500).json({
      error: `PDF file not found: ${config.pdfFile}`,
      hint: 'Ensure the PDF is in the forms/ directory'
    });
  }

  // Create unique temp files for this request
  const requestId = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join('/tmp', `pdf-fill-${requestId}`);
  const fdfPath = path.join(tempDir, 'form-data.fdf');
  const outputPath = path.join(tempDir, 'filled.pdf');

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Generate FDF file from form data
    const fdfContent = jsonToFdf(formData);
    fs.writeFileSync(fdfPath, fdfContent);

    // Run PDFtk to fill the form
    // Note: USCIS forms have owner password, pdftk handles this with a warning
    execSync(
      `pdftk "${pdfPath}" fill_form "${fdfPath}" output "${outputPath}"`,
      { stdio: 'pipe', timeout: 30000 }
    );

    // Read the filled PDF
    const filledPdf = fs.readFileSync(outputPath);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${config.displayName.replace(/\s+/g, '-')}-filled.pdf"`
    );

    // Send the PDF
    res.send(filledPdf);

  } catch (err) {
    console.error('PDF fill error:', err);

    // Check for specific errors
    if (err.message.includes('pdftk')) {
      return res.status(500).json({
        error: 'PDFtk execution failed',
        details: err.message
      });
    }

    return res.status(500).json({
      error: 'Failed to fill PDF',
      details: err.message
    });

  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }
});

// List available form fields (useful for debugging)
app.get('/fields/:formType', (req, res) => {
  const { formType } = req.params;

  const config = FORM_CONFIG[formType];
  if (!config) {
    return res.status(400).json({
      error: `Unsupported form type: ${formType}`,
      supportedForms: Object.keys(FORM_CONFIG)
    });
  }

  const pdfPath = path.join(__dirname, 'forms', config.pdfFile);
  if (!fs.existsSync(pdfPath)) {
    return res.status(500).json({
      error: `PDF file not found: ${config.pdfFile}`
    });
  }

  try {
    const output = execSync(
      `pdftk "${pdfPath}" dump_data_fields`,
      { encoding: 'utf-8', timeout: 30000 }
    );

    const fields = output.match(/FieldName: .+/g) || [];
    const fieldNames = fields.map(f => f.replace('FieldName: ', ''));

    res.json({
      formType,
      fieldCount: fieldNames.length,
      fields: fieldNames
    });

  } catch (err) {
    console.error('Field dump error:', err);
    return res.status(500).json({
      error: 'Failed to extract field names',
      details: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Filler service running on port ${PORT}`);
  console.log(`Supported forms: ${Object.keys(FORM_CONFIG).join(', ')}`);

  // Check if pdftk is available
  try {
    execSync('which pdftk', { stdio: 'pipe' });
    console.log('pdftk: found');
  } catch {
    console.error('WARNING: pdftk not found! Install with: apt-get install pdftk-java');
  }
});
