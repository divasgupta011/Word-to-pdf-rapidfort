const path = require('path');
const fs = require('fs').promises;
const libre = require('libreoffice-convert');
libre.convertAsync = require('util').promisify(libre.convert);

const fileConvert = async (inputPath, outputPath) => {
    try {
        // Ensure the input file exists
        const docxBuf = await fs.readFile(inputPath);

        // Convert it to PDF
        const pdfBuf = await libre.convertAsync(docxBuf, '.pdf', undefined);

        // Write the PDF to the output path
        await fs.writeFile(outputPath, pdfBuf);

        console.log(`converted word to pdf: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`error converting word to pdf: ${error.message}`);
        throw error;
    }
};

module.exports = fileConvert;