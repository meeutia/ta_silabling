const XLSX = require('xlsx');

function readExcel() {
  const filePath = 'd:/Unand/TA/1. Project TA/backend/docs/Hasil_Testing_Lampiran_SILABLING_Lulus.xlsx';
  const workbook = XLSX.readFile(filePath);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== SHEET: ${sheetName} ===\n`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    data.forEach((row, rowIndex) => {
      if (row.length > 0) {
        console.log(`Row ${rowIndex + 1}: ${JSON.stringify(row)}`);
      }
    });
  });
}

try {
  readExcel();
} catch (e) {
  console.error(e);
}
