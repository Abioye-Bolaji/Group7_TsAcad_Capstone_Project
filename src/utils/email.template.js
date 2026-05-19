/**
 * Generates a clean, professional HTML layout for system emails.
 */
const generateEmailTemplate = (subject, messageBody, tenantName = 'CBT Platform') => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border: 1px solid #dddddd;
                border-radius: 8px;
                overflow: hidden;
            }
            .header {
                background-color: #1e3a8a;
                color: #ffffff;
                padding: 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 22px;
            }
            .content {
                padding: 30px;
            }
            .footer {
                background-color: #f3f4f6;
                color: #6b7280;
                text-align: center;
                padding: 15px;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${tenantName}</h1>
            </div>
            <div class="content">
                <h2>${subject}</h2>
                <p>${messageBody}</p>
            </div>
            <div class="footer">
                <p>This is an automated operational transmission from the examination portal.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = {
    generateEmailTemplate
};