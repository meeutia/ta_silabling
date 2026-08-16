import { readFileSync } from 'fs';
import { buildSampleReceiptForms } from './src/components/admin/permohonan/adminPermohonanUtils.js';

const content = readFileSync('../../backend/detail.json', 'utf16le');
const firstBrace = content.indexOf('{');
const jsonString = content.substring(firstBrace);
const requestItem = JSON.parse(jsonString);

const forms = buildSampleReceiptForms(requestItem);
console.log(JSON.stringify(forms, null, 2));
