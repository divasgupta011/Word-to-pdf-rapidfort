const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fileConvert = require('./components/convert.js');

const app = express();
const port = 8000;

// Middleware
app.use(cors());

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Create output directory for converted files
if (!fs.existsSync('converted')) {
    fs.mkdirSync('converted');
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

// File filter to only allow DOCX files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
    } else {
        cb(new Error('Only .docx files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

// Convert file handler
async function convertFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const inputPath = req.file.path;
        const outputFileName = path.basename(inputPath, '.docx') + '.pdf';
        const outputPath = path.join('converted', outputFileName);

        // Convert the file
        await fileConvert(inputPath, outputPath);

        // Send the converted file
        res.download(outputPath, outputFileName, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                // Clean up files even if sending fails
                cleanup(inputPath, outputPath);
                return res.status(500).json({ error: 'Error sending converted file' });
            }

            // Clean up files after successful send
            cleanup(inputPath, outputPath);
        });

    } catch (error) {
        console.error('Conversion error:', error);
        // Clean up input file if conversion fails
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(500).json({ error: 'File conversion failed' });
    }
}

// Cleanup function to remove temporary files
function cleanup(inputPath, outputPath) {
    // Remove input file
    fs.unlink(inputPath, (err) => {
        if (err) console.error('Error removing input file:', err);
    });

    // Remove output file
    fs.unlink(outputPath, (err) => {
        if (err) console.error('Error removing output file:', err);
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File upload error' });
    }
    if (err.message === 'Only .docx files are allowed!') {
        return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

// Routes
app.post('/convert', upload.single('file'), convertFile);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});