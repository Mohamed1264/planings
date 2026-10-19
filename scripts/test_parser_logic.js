import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

// Helper to normalize room name
function normalizeRoom(r) {
  if (!r) return '';
  return r.toUpperCase().replace(/\s+/g, ' ').trim();
}

// Helper to parse dates
function parseDatesFromText(text) {
  const match = text.match(/Semaine\s+du\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+au\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i);
  if (match) {
    let d1 = match[1].replace(/[\.-]/g, '/');
    let d2 = match[2].replace(/[\.-]/g, '/');
    return { start: d1, end: d2 };
  }
  return null;
}

// Days detector
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

async function parsePdf(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const allSessions = [];
  const detectedRooms = new Set();

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      str: it.str.trim(),
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      h: it.height
    })).filter(it => it.str.length > 0);

    const fullText = items.map(it => it.str).join(' ');
    const week = parseDatesFromText(fullText);

    // Filiere
    let filiere = "Tronc Commun";
    if (/MÉDECINE\s*1/i.test(fullText) || /FM1\b/i.test(fullText)) filiere = "FM1";
    else if (/MÉDECINE\s*2/i.test(fullText) || /FM2\b/i.test(fullText)) filiere = "FM2";
    else if (/MÉDECINE\s*3/i.test(fullText) || /FM3\b/i.test(fullText)) filiere = "FM3";
    else if (/GÉNIE\s*INFORMATIQUE/i.test(fullText) || /ING\s*GI/i.test(fullText)) filiere = "ING GI";
    else if (/INFIRMIER\s*POLYVALENT/i.test(fullText) && /KINÉSITHÉRAPIE/i.test(fullText)) filiere = "IP & KIN";
    else if (/INFIRMIER\s*POLYVALENT|IP\b/i.test(fullText)) filiere = "IP";
    else if (/KINÉSITHÉRAPIE|KIN\b/i.test(fullText)) filiere = "KIN";

    // Header room
    let headerRoom = null;
    const headerRoomMatch = fullText.match(/(?:SALLE|AMPHI|LIEU)\s*:\s*([A-Za-z0-9_\-\s]+?)(?:Semaine|\b[A-Z]{3,}\b|$)/i);
    if (headerRoomMatch) {
      headerRoom = headerRoomMatch[1].trim();
      detectedRooms.add(normalizeRoom(headerRoom));
    }

    // Days columns
    const dayItems = items.filter(it => DAY_NAMES.some(d => d.toLowerCase() === it.str.toLowerCase()));
    dayItems.sort((a, b) => a.x - b.x);

    // Slots items
    const slotRegex = /^(\d{1,2}\s*[hH:]\s*\d{2})\s*[-–—à]\s*(\d{1,2}\s*[hH:]\s*\d{2})$/;
    const slotItems = items.filter(it => slotRegex.test(it.str) && (dayItems.length === 0 || it.x < dayItems[0].x));
    slotItems.sort((a, b) => b.y - a.y); // top to bottom

    console.log(`File: ${path.basename(filePath)} | Filiere: ${filiere} | HeaderRoom: ${headerRoom} | Days: ${dayItems.length} | Slots: ${slotItems.length}`);
  }
}

async function run() {
  await parsePdf('./public/samples/planning_FM1_semaine_05_10_2026.pdf');
  await parsePdf('./public/samples/planning_ESI_ING_GI_semaine_05_10_2026.pdf');
  await parsePdf('./public/samples/planning_FSS_IP_KIN_semaine_05_10_2026.pdf');
}

run();
