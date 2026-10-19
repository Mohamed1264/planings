import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

const TIME_REGEX = /(?:De\s+)?(\d{1,2}\s*[hH:]\s*\d{2})\s*(?:à|-|–|—)\s*(\d{1,2}\s*[hH:]\s*\d{2})/i;
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function normalizeSlot(str) {
  const m = str.match(TIME_REGEX);
  if (m) {
    let t1 = m[1].replace(':', 'h').replace(/\s+/g, '');
    let t2 = m[2].replace(':', 'h').replace(/\s+/g, '');
    if (t1.length === 4) t1 = '0' + t1;
    if (t2.length === 4) t2 = '0' + t2;
    return `${t1} - ${t2}`;
  }
  return str;
}

async function testExtractUm6ss() {
  const filePath = path.resolve('./public/samples/planning_um6ss_infirmier_polyvalent.pdf');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  const rawItems = textContent.items.map(it => ({
    str: it.str.trim(),
    x: Math.round(it.transform[4]),
    y: Math.round(it.transform[5])
  })).filter(it => it.str.length > 0);

  const fullText = rawItems.map(it => it.str).join(' ');

  // 1. Détection des jours
  const dayPositions = [];
  for (let dIdx = 0; dIdx < DAY_NAMES.length; dIdx++) {
    const dName = DAY_NAMES[dIdx];
    const matchItem = rawItems.find(it => it.str.toLowerCase() === dName.toLowerCase());
    if (matchItem) {
      let dayDate = "";
      const dateUnder = rawItems.find(it => 
        Math.abs(it.x - matchItem.x) < 45 && 
        matchItem.y - it.y > 0 && 
        matchItem.y - it.y < 40 && 
        /\d{1,2}[\/\.-]\d{1,2}/.test(it.str)
      );
      if (dateUnder) dayDate = dateUnder.str;

      dayPositions.push({
        name: dName,
        x: matchItem.x,
        y: matchItem.y,
        date: dayDate
      });
    }
  }
  dayPositions.sort((a, b) => a.x - b.x);

  const colWidth = dayPositions.length > 1 ? (dayPositions[1].x - dayPositions[0].x) : 100;
  const headerY = dayPositions[0].y;

  const sessions = [];
  const detectedRooms = new Map();

  // Pour chaque colonne de jour
  for (let i = 0; i < dayPositions.length; i++) {
    const day = dayPositions[i];
    const xMin = day.x - colWidth / 2;
    const xMax = day.x + colWidth / 2;

    // Items dans cette colonne sous l'en-tête
    const colItems = rawItems.filter(it => 
      it.x >= xMin && it.x < xMax && 
      it.y < (headerY - 20) &&
      it.str !== day.name &&
      it.str !== day.date
    );

    colItems.sort((a, b) => b.y - a.y); // du haut vers le bas

    // Identifier les débuts de créneau (ex: "De 08h30 à 10h30", "De 11h00 à 13h00")
    const slotAnchorIndices = [];
    for (let k = 0; k < colItems.length; k++) {
      if (TIME_REGEX.test(colItems[k].str)) {
        slotAnchorIndices.push(k);
      }
    }

    for (let sIdx = 0; sIdx < slotAnchorIndices.length; sIdx++) {
      const startIdx = slotAnchorIndices[sIdx];
      const endIdx = sIdx < slotAnchorIndices.length - 1 ? slotAnchorIndices[sIdx + 1] : colItems.length;
      const sessionItems = colItems.slice(startIdx, endIdx);

      const timeItem = sessionItems[0];
      const slotTime = normalizeSlot(timeItem.str);

      const otherItems = sessionItems.slice(1);
      const cellFull = otherItems.map(it => it.str).join(' ');

      // Salle
      let room = "";
      const roomMatch = cellFull.match(/\b(AMPHI\s*[0-9A-Z]+|CD\s*\d+[A-Z]?|SALLE\s*(?:DE\s*)?[0-9A-Z_\-]+|LABO\s*[0-9A-Z_\-]+)\b/i);
      if (roomMatch) {
        room = roomMatch[1].trim().toUpperCase().replace(/\s+/g, ' ');
      }

      // Séance
      let sessionNumber = "";
      const numMatch = cellFull.match(/\(?\s*(\d{1,2}\s*\/\s*\d{1,2})\s*\)?/);
      if (numMatch) {
        sessionNumber = `(${numMatch[1].replace(/\s+/g, '')})`;
      }

      // Titre du cours
      const titleLines = otherItems.filter(it => {
        if (roomMatch && it.str.toUpperCase().includes(roomMatch[1].toUpperCase())) return false;
        if (numMatch && it.str.includes(numMatch[1])) return false;
        return it.str.length > 2;
      });
      const title = titleLines.length > 0 ? titleLines.map(t => t.str).join(' ') : "Cours";

      if (room) {
        detectedRooms.set(room, (detectedRooms.get(room) || 0) + 1);
      }

      sessions.push({
        day: day.name,
        date: day.date,
        slot: slotTime,
        room,
        title,
        sessionNumber,
        filiere: "IP"
      });
    }
  }

  console.log(`\nRÉSULTATS D'EXTRACTION DU PLANNING RÉEL UM6SS :`);
  console.log(`Total séances extraites : ${sessions.length}`);
  console.log(`Salles détectées :`);
  for (const [r, cnt] of detectedRooms.entries()) {
    console.log(`  🏛️ ${r} : ${cnt} séances`);
  }
  console.log("\nDétail des premières séances :");
  sessions.slice(0, 5).forEach(s => {
    console.log(`  • [${s.day} ${s.slot}] Salle: ${s.room} | Cours: "${s.title}" ${s.sessionNumber}`);
  });
}

testExtractUm6ss();
