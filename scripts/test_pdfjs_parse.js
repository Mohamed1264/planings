import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

async function testParse() {
  const filePath = path.resolve('./public/samples/planning_FM1_semaine_05_10_2026.pdf');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  console.log(`Pages: ${doc.numPages}`);
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  console.log(`Found ${textContent.items.length} text items`);
  textContent.items.slice(0, 15).forEach(item => {
    console.log(`Text: "${item.str}" at (${Math.round(item.transform[4])}, ${Math.round(item.transform[5])})`);
  });
}

testParse();
