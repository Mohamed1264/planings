import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

async function inspectPdf() {
  const filePath = path.resolve('./public/samples/planning_um6ss_infirmier_polyvalent.pdf');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  const items = textContent.items.map(it => ({
    str: it.str.trim(),
    x: Math.round(it.transform[4]),
    y: Math.round(it.transform[5])
  })).filter(it => it.str.length > 0);

  console.log(`Extracted ${items.length} items from UM6SS PDF:`);
  items.forEach(it => {
    console.log(`[x=${it.x}, y=${it.y}] "${it.str}"`);
  });
}

inspectPdf();
