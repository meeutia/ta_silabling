const ExcelJS = require('exceljs');

async function readExcel() {
  const filePath = 'd:/Unand/TA/1. Project TA/backend/docs/Hasil_Testing_Lampiran_SILABLING_Lulus.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  workbook.eachSheet(function(worksheet, sheetId) {
    console.log(`\n=== SHEET: ${worksheet.name} ===\n`);
    worksheet.eachRow(function(row, rowNumber) {
      console.log(`Row ${rowNumber}: ` + JSON.stringify(row.values));
    });
  });
}

readExcel().catch(console.error);
