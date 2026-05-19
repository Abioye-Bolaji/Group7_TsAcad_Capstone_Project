const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

/**
 * @desc Feature F9 Report Export Utilities
 * Standalone — no database calls. Uses packages already in package.json.
 * - CSV export via xlsx (avoids needing json2csv install)
 * - PDF export via pdfkit (matches certificate.utils.js pattern)
 */

/**
 * Convert an array of objects into a CSV buffer.
 * @param {Array} data - Array of flat objects to export
 * @param {Array} columns - Array of { header, key } defining column order
 * @returns {Buffer} CSV file content as a buffer
 */
const exportCSV = (data, columns) => {
    const headers = columns.map((c) => c.header);
    const rows = data.map((row) => columns.map((c) => row[c.key] ?? ''));

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    return Buffer.from(csvString, 'utf-8');
};

/**
 * Generate a simple tabular PDF report and return the buffer.
 * @param {string} title - Report title
 * @param {Array} headers - Array of column header strings
 * @param {Array} rows - Array of arrays (each inner array = one row of cell values)
 * @returns {Promise<Buffer>} PDF buffer
 */
const exportPDF = (title, headers, rows) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                layout: 'landscape',
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));

            // Title
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a3a52')
                .text(title, { align: 'center' });
            doc.moveDown(0.5);

            // Timestamp
            doc.fontSize(9).font('Helvetica').fillColor('#666')
                .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
            doc.moveDown(1);

            // Table dimensions
            const startX = 40;
            const colCount = headers.length;
            const pageWidth = doc.page.width - 80;
            const colWidth = pageWidth / colCount;
            const rowHeight = 22;
            let y = doc.y;

            // Header row
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
            doc.rect(startX, y, pageWidth, rowHeight).fill('#1a3a52');
            headers.forEach((h, i) => {
                doc.fillColor('#fff')
                    .text(String(h), startX + i * colWidth + 4, y + 6, {
                        width: colWidth - 8,
                        ellipsis: true,
                    });
            });
            y += rowHeight;

            // Data rows
            doc.font('Helvetica').fontSize(8).fillColor('#333');
            rows.forEach((row, rowIdx) => {
                // New page check
                if (y + rowHeight > doc.page.height - 50) {
                    doc.addPage();
                    y = 40;
                }

                // Alternating row background
                if (rowIdx % 2 === 0) {
                    doc.rect(startX, y, pageWidth, rowHeight).fill('#f4f6f8');
                }

                doc.fillColor('#333');
                row.forEach((cell, i) => {
                    doc.text(String(cell ?? ''), startX + i * colWidth + 4, y + 6, {
                        width: colWidth - 8,
                        ellipsis: true,
                    });
                });
                y += rowHeight;
            });

            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = {
    exportCSV,
    exportPDF,
};
