import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { consolidateSessionsForRoom } from '../src/consolidator.js';
import { renderTimetableSection } from '../src/timetableRenderer.js';
import { normalizeRoomName, parseWeekDates, detectFiliere } from '../src/pdfParser.js';

// Test function simulating the full client pipeline
async function testPipeline() {
  const sampleFiles = [
    './public/samples/planning_FM1_semaine_05_10_2026.pdf',
    './public/samples/planning_ESI_ING_GI_semaine_05_10_2026.pdf',
    './public/samples/planning_FSS_IP_KIN_semaine_05_10_2026.pdf'
  ];

  const allSessions = [];
  const detectedRooms = new Map();

  for (const filePath of sampleFiles) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      str: it.str.trim(),
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      h: it.height
    })).filter(it => it.str.length > 0);

    const fullText = items.map(it => it.str).join(' ');
    const week = parseWeekDates(fullText);
    const filiere = detectFiliere(fullText, path.basename(filePath));

    // Header room
    let headerRoom = null;
    const headerMatch = fullText.match(/(?:SALLE|AMPHI|LIEU)\s*:\s*([A-Za-z0-9_\-\s]{2,25})(?=\s+(?:Semaine|Faculté|Année|\b[A-Z]{3,}\b)|$)/i);
    if (headerMatch) {
      headerRoom = headerMatch[1].trim();
      const n = normalizeRoomName(headerRoom);
      detectedRooms.set(n, (detectedRooms.get(n) || 0) + 1);
    }

    const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayPositions = [];
    for (const dName of dayNames) {
      const matchItem = items.find(it => it.str.toLowerCase() === dName.toLowerCase());
      if (matchItem) {
        dayPositions.push({ name: dName, x: matchItem.x, y: matchItem.y });
      }
    }
    dayPositions.sort((a, b) => a.x - b.x);

    const slotRegex = /^(\d{1,2}\s*[hH:]\s*\d{2})\s*[-–—à]\s*(\d{1,2}\s*[hH:]\s*\d{2})$/;
    const firstDayX = dayPositions.length > 0 ? dayPositions[0].x : 1000;
    const slotItems = items.filter(it => slotRegex.test(it.str) && it.x < firstDayX).sort((a, b) => b.y - a.y);

    const columns = [];
    for (let i = 0; i < dayPositions.length; i++) {
      const curr = dayPositions[i];
      const prevX = i > 0 ? dayPositions[i - 1].x : 0;
      const nextX = i < dayPositions.length - 1 ? dayPositions[i + 1].x : 842;
      columns.push({
        dayName: curr.name,
        xMin: i === 0 ? curr.x - 40 : (curr.x + prevX) / 2,
        xMax: i === dayPositions.length - 1 ? curr.x + 120 : (curr.x + nextX) / 2
      });
    }

    const rows = [];
    for (let j = 0; j < slotItems.length; j++) {
      const currSlot = slotItems[j];
      const prevY = j > 0 ? slotItems[j - 1].y : 595;
      const nextY = j < slotItems.length - 1 ? slotItems[j + 1].y : 0;
      rows.push({
        slotTime: currSlot.str,
        yMin: (currSlot.y + nextY) / 2,
        yMax: (prevY + currSlot.y) / 2
      });
    }

    for (const col of columns) {
      for (const row of rows) {
        const cellItems = items.filter(it => 
          it.x >= col.xMin && it.x <= col.xMax && 
          it.y >= row.yMin && it.y <= row.yMax &&
          it.str !== col.dayName && !slotRegex.test(it.str)
        );
        if (cellItems.length === 0) continue;
        cellItems.sort((a, b) => b.y - a.y);

        const cellStr = cellItems.map(it => it.str).join(' ');
        let room = headerRoom || "";
        const roomMatch = cellStr.match(/\b(AMPHI\s*[0-9A-Z]+|CD\s*\d+|SALLE\s*[0-9A-Z]+)\b/i);
        if (roomMatch) room = roomMatch[1].trim();

        if (room) {
          const n = normalizeRoomName(room);
          detectedRooms.set(n, (detectedRooms.get(n) || 0) + 1);
        }

        // Prof
        let teacher = "";
        const profMatch = cellStr.match(/(Pr\.?|Prof\.?|Dr\.?|M\.|Mme)\s+([A-Za-zÀ-ÿ\-'\s]{3,30})/i);
        if (profMatch) teacher = `${profMatch[1]} ${profMatch[2].trim()}`;

        // Session
        let sessionNumber = "";
        const sessionMatch = cellStr.match(/\(?\s*(\d{1,2}\s*\/\s*\d{1,2})\s*\)?/i);
        if (sessionMatch) sessionNumber = `(${sessionMatch[1]})`;

        // Special note
        let specialNote = "";
        if (/CC\s*N?[°o]?\s*\d*/i.test(cellStr)) specialNote = "CC N°1";
        else if (/\bTD\b/i.test(cellStr)) specialNote = "TD";
        else if (/Groupe\s+G1/i.test(cellStr)) specialNote = "Groupe G1";
        else if (/15h00\s*-\s*17h00/i.test(cellStr)) specialNote = "15h00 - 17h00";

        // Title
        const title = cellItems[0].str;

        allSessions.push({
          id: `${filiere}-${col.dayName}-${row.slotTime}`,
          filiere,
          day: col.dayName,
          date: "05/10/2026",
          slot: row.slotTime,
          room,
          title,
          sessionNumber,
          teacher,
          specialNote,
          sourceFile: path.basename(filePath)
        });
      }
    }
  }

  console.log("\n==============================================");
  console.log("TEST SALLES DÉTECTÉES :");
  for (const [r, cnt] of detectedRooms.entries()) {
    console.log(`  🏛️ ${r} : ${cnt} séances trouvées`);
  }

  // Consolidation Amphi 4
  console.log("\n==============================================");
  console.log("TEST CONSOLIDATION POUR 'AMPHI 4' :");
  const amphi4Data = consolidateSessionsForRoom(allSessions, "AMPHI 4");
  console.log(`  Total séances Amphi 4 : ${amphi4Data.totalCount}`);
  console.log(`  Créneaux uniques : ${amphi4Data.slots.join(', ')}`);

  // Consolidation CD114
  console.log("\n==============================================");
  console.log("TEST CONSOLIDATION POUR 'CD114' :");
  const cd114Data = consolidateSessionsForRoom(allSessions, "CD114");
  console.log(`  Total séances CD114 : ${cd114Data.totalCount}`);
  console.log(`  Créneaux uniques : ${cd114Data.slots.join(', ')}`);

  // HTML rendering test
  const html = renderTimetableSection(amphi4Data, { start: "05/10/2026", end: "10/10/2026" });
  console.log(`\nHTML généré avec succès (${html.length} caractères)`);
  console.log("==============================================\n");
}

testPipeline();
