const { PDFDocument, rgb, degrees } = require('pdf-lib');

/**
 * Menambahkan watermark "COPY" berulang (pola grid) secara diagonal
 * ke seluruh halaman PDF.
 * 
 * @param {Buffer} pdfBuffer - Buffer dari file PDF asli
 * @returns {Promise<Buffer>} - Buffer dari PDF yang sudah diberi watermark
 */
async function addWatermarkToPdf(pdfBuffer) {
  // Load dokumen PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Ambil semua halaman
  const pages = pdfDoc.getPages();
  
  // Warna dan gaya font untuk watermark (abu-abu semi-transparan)
  const watermarkColor = rgb(0.85, 0.85, 0.85); // Light gray
  const opacity = 0.5; // Transparansi 50%
  const fontSize = 48;
  const text = 'COPY';
  
  // Terapkan watermark ke setiap halaman
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Pola grid untuk mengulang teks watermark
    const xSpacing = 200; // Jarak antar kolom
    const ySpacing = 200; // Jarak antar baris
    
    // Mulai dari luar batas halaman agar menutupi seluruh area
    for (let x = -width; x < width * 2; x += xSpacing) {
      for (let y = -height; y < height * 2; y += ySpacing) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          color: watermarkColor,
          opacity: opacity,
          rotate: degrees(45), // Rotasi miring 45 derajat
        });
      }
    }
  }
  
  // Simpan kembali menjadi buffer
  const watermarkedPdfBytes = await pdfDoc.save();
  return Buffer.from(watermarkedPdfBytes);
}

module.exports = {
  addWatermarkToPdf
};
