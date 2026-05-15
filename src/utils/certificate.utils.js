const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * @desc Certificate Utilities
 * Handles PDF generation and unique code generation for exam certificates.
 * Scoped to individual candidates within a tenant.
 */

/**
 * Generate a unique, readable certificate code.
 * Example: CERT-ABCD-1234
 */
const generateCertCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    let code = 'CERT-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
        code += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return code;
};

/**
 * Validate a certificate code format.
 */
const isValidCertCode = (code) => {
    return /^CERT-[A-Z]{4}-\d{4}$/.test(code);
};

/**
 * Generates a certificate PDF and returns the buffer.
 * Useful for sending directly in HTTP response or saving to cloud storage.
 */
const generateCertificatePDFBuffer = async (options) => {
    return new Promise((resolve, reject) => {
        const {
            recipientName,
            certCode,
            courseName,
            issueDate,
            expiryDate = null,
            issuerName = 'CBT Platform Authority',
            issuerLogo = null,
        } = options;

        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                layout: 'landscape',
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));

            // Background
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fdfdfd');

            // Borders
            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
                .strokeColor('#1a3a52')
                .lineWidth(5)
                .stroke();
            
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
                .strokeColor('#d4af37')
                .lineWidth(2)
                .stroke();

            // Content
            doc.fontSize(40).font('Helvetica-Bold').fillColor('#1a3a52').text('CERTIFICATE OF ACHIEVEMENT', 0, 150, { align: 'center' });
            
            doc.fontSize(16).font('Helvetica').fillColor('#333').text('This is to certify that', 0, 220, { align: 'center' });
            
            doc.fontSize(32).font('Helvetica-Bold').fillColor('#d4af37').text(recipientName, 0, 260, { align: 'center' });
            
            doc.fontSize(16).font('Helvetica').fillColor('#333').text('has successfully completed the examination', 0, 320, { align: 'center' });
            
            doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a3a52').text(courseName, 0, 350, { align: 'center' });

            // Date & Code
            const dateStr = new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.fontSize(12).font('Helvetica').fillColor('#666').text(`Issued on: ${dateStr}`, 100, 450);
            doc.fontSize(12).font('Helvetica').fillColor('#666').text(`Certificate ID: ${certCode}`, 100, 470);

            // Signature area
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a3a52').text(issuerName, doc.page.width - 300, 450, { align: 'center', width: 200 });
            doc.moveTo(doc.page.width - 300, 445).lineTo(doc.page.width - 100, 445).stroke();
            doc.fontSize(10).font('Helvetica').fillColor('#666').text('Authorized Authority', doc.page.width - 300, 470, { align: 'center', width: 200 });

            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateCertCode,
    isValidCertCode,
    generateCertificatePDFBuffer,
};
