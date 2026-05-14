import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Generates a certificate PDF
 * @param {Object} options - Certificate options
 * @param {string} options.recipientName - Name of the certificate recipient
 * @param {string} options.certCode - Unique certificate code
 * @param {string} options.courseName - Name of the course/achievement
 * @param {string} options.issueDate - Date of issuance (ISO format)
 * @param {string} options.expiryDate - Expiration date (ISO format) - optional
 * @param {string} options.issuerName - Name of the issuer organization
 * @param {string} options.issuerLogo - Path to issuer logo image - optional
 * @param {string} options.outputPath - Path where PDF will be saved
 * @returns {Promise<string>} Path to generated PDF file
 */
export async function generateCertificatePDF(options) {
  return new Promise((resolve, reject) => {
    const {
      recipientName,
      certCode,
      courseName,
      issueDate,
      expiryDate = null,
      issuerName = "Certificate Authority",
      issuerLogo = null,
      outputPath,
    } = options;

    try {
      // Create a document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        layout: "landscape",
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add background color
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f5f5f5");

      // Add decorative border
      doc
        .moveTo(40, 40)
        .lineTo(doc.page.width - 40, 40)
        .lineTo(doc.page.width - 40, doc.page.height - 40)
        .lineTo(40, doc.page.height - 40)
        .closePath()
        .strokeColor("#1a3a52")
        .lineWidth(3)
        .stroke();

      // Inner decorative border
      doc
        .moveTo(55, 55)
        .lineTo(doc.page.width - 55, 55)
        .lineTo(doc.page.width - 55, doc.page.height - 55)
        .lineTo(55, doc.page.height - 55)
        .closePath()
        .strokeColor("#d4af37")
        .lineWidth(1.5)
        .stroke();

      // Add logo if provided
      if (issuerLogo && fs.existsSync(issuerLogo)) {
        doc.image(issuerLogo, doc.page.width / 2 - 30, 70, {
          width: 60,
          height: 60,
        });
      }

      // Add title
      doc
        .fontSize(48)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text("CERTIFICATE OF ACHIEVEMENT", 100, 150, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add decorative line
      doc
        .moveTo(150, 210)
        .lineTo(doc.page.width - 150, 210)
        .strokeColor("#d4af37")
        .lineWidth(2)
        .stroke();

      // Add introductory text
      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("#000000")
        .text("This certificate is proudly presented to", 100, 240, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add recipient name
      doc
        .fontSize(32)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(recipientName, 100, 270, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add achievement text
      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("#000000")
        .text("for successfully completing", 100, 330, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add course name
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(courseName, 100, 360, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add date information
      const issueDateObj = new Date(issueDate);
      const formattedIssueDate = issueDateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#000000")
        .text(`Issued on: ${formattedIssueDate}`, 100, 420, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add expiry date if provided
      if (expiryDate) {
        const expiryDateObj = new Date(expiryDate);
        const formattedExpiryDate = expiryDateObj.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
        doc.text(`Valid until: ${formattedExpiryDate}`, 100, 445, {
          align: "center",
          width: doc.page.width - 200,
        });
      }

      // Add certificate code
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Certificate ID: ${certCode}`, 100, doc.page.height - 120, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add issuer information
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(issuerName, doc.page.width - 250, doc.page.height - 100, {
          align: "center",
          width: 200,
        });

      // Add signature line
      doc
        .moveTo(doc.page.width - 280, doc.page.height - 80)
        .lineTo(doc.page.width - 220, doc.page.height - 80)
        .strokeColor("#1a3a52")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000")
        .text("Authorized Signature", doc.page.width - 250, doc.page.height - 75, {
          align: "center",
          width: 200,
        });

      // Finalize PDF
      doc.end();

      // Handle stream events
      stream.on("finish", () => {
        resolve(outputPath);
      });

      stream.on("error", (err) => {
        reject(new Error(`Failed to write PDF: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to generate certificate PDF: ${error.message}`));
    }
  });
}

/**
 * Generates certificate PDF and returns as buffer
 * Useful for sending directly in HTTP response
 * @param {Object} options - Same as generateCertificatePDF
 * @returns {Promise<Buffer>} PDF as buffer
 */
export async function generateCertificatePDFBuffer(options) {
  return new Promise((resolve, reject) => {
    const {
      recipientName,
      certCode,
      courseName,
      issueDate,
      expiryDate = null,
      issuerName = "Certificate Authority",
      issuerLogo = null,
    } = options;

    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        layout: "landscape",
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      // Add background color
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f5f5f5");

      // Add decorative border
      doc
        .moveTo(40, 40)
        .lineTo(doc.page.width - 40, 40)
        .lineTo(doc.page.width - 40, doc.page.height - 40)
        .lineTo(40, doc.page.height - 40)
        .closePath()
        .strokeColor("#1a3a52")
        .lineWidth(3)
        .stroke();

      // Inner decorative border
      doc
        .moveTo(55, 55)
        .lineTo(doc.page.width - 55, 55)
        .lineTo(doc.page.width - 55, doc.page.height - 55)
        .lineTo(55, doc.page.height - 55)
        .closePath()
        .strokeColor("#d4af37")
        .lineWidth(1.5)
        .stroke();

      // Add logo if provided
      if (issuerLogo && fs.existsSync(issuerLogo)) {
        doc.image(issuerLogo, doc.page.width / 2 - 30, 70, {
          width: 60,
          height: 60,
        });
      }

      // Add title
      doc
        .fontSize(48)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text("CERTIFICATE OF ACHIEVEMENT", 100, 150, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add decorative line
      doc
        .moveTo(150, 210)
        .lineTo(doc.page.width - 150, 210)
        .strokeColor("#d4af37")
        .lineWidth(2)
        .stroke();

      // Add introductory text
      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("#000000")
        .text("This certificate is proudly presented to", 100, 240, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add recipient name
      doc
        .fontSize(32)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(recipientName, 100, 270, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add achievement text
      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("#000000")
        .text("for successfully completing", 100, 330, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add course name
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(courseName, 100, 360, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add date information
      const issueDateObj = new Date(issueDate);
      const formattedIssueDate = issueDateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#000000")
        .text(`Issued on: ${formattedIssueDate}`, 100, 420, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add expiry date if provided
      if (expiryDate) {
        const expiryDateObj = new Date(expiryDate);
        const formattedExpiryDate = expiryDateObj.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
        doc.text(`Valid until: ${formattedExpiryDate}`, 100, 445, {
          align: "center",
          width: doc.page.width - 200,
        });
      }

      // Add certificate code
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Certificate ID: ${certCode}`, 100, doc.page.height - 120, {
          align: "center",
          width: doc.page.width - 200,
        });

      // Add issuer information
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a3a52")
        .text(issuerName, doc.page.width - 250, doc.page.height - 100, {
          align: "center",
          width: 200,
        });

      // Add signature line
      doc
        .moveTo(doc.page.width - 280, doc.page.height - 80)
        .lineTo(doc.page.width - 220, doc.page.height - 80)
        .strokeColor("#1a3a52")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000")
        .text("Authorized Signature", doc.page.width - 250, doc.page.height - 75, {
          align: "center",
          width: 200,
        });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.end();
    } catch (error) {
      reject(new Error(`Failed to generate certificate PDF: ${error.message}`));
    }
  });
}
