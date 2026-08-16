const muhammara = require('muhammara');
const path = require('path');
const crypto = require('crypto');

/**
 * Protects a PDF from being edited or copied by applying an owner password and restricting permissions.
 * @param {string} sourcePath - Absolute path to the original PDF.
 * @param {string} destPath - Absolute path to save the protected PDF.
 */
function protectPdf(sourcePath, destPath) {
    const ownerPassword = crypto.randomBytes(16).toString('hex');

    // Permissions bitmask for PDF (UserAccessPermissions)
    // Bit 3 = Print (4)
    // Bit 12 = High Resolution Print (2048)
    // We explicitly omit Bit 4 (Modify), Bit 5 (Copy), Bit 6 (Add/Modify Annotations)
    const protectionFlag = 4 | 2048;

    const pdfWriter = muhammara.createWriterToModify(sourcePath, {
        modifiedFilePath: destPath,
        log: 'error',
        userPassword: '', // No password required to open
        ownerPassword: ownerPassword,
        userProtectionFlag: protectionFlag
    });

    pdfWriter.end();
}

module.exports = {
    protectPdf
};
