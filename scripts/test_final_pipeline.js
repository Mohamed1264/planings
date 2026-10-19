import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { parsePdfFile } from '../src/pdfParser.js';
import { consolidateSessionsForRoom } from '../src/consolidator.js';

async function testFull() {
  const filePath = path.resolve('./public/samples/planning_um6ss_infirmier_polyvalent.pdf');
  const buffer = fs.readFileSync(filePath);
  const parsed = await parsePdfFile(buffer, 'planning_um6ss_infirmier_polyvalent.pdf');

  console.log(`Document: ${parsed.fileName}`);
  console.log(`Filiere: ${parsed.filiere}`);
  console.log(`Semaine: ${parsed.week.start} au ${parsed.week.end}`);
  console.log(`Total séances: ${parsed.allSessions.length}`);
  console.log(`Salles détectées:`, parsed.detectedRoomsList);

  const amphi4 = consolidateSessionsForRoom(parsed.allSessions, 'AMPHI 4');
  console.log(`\nConsolidation Amphi 4 : ${amphi4.totalCount} séances`);
  console.log(`Créneaux Amphi 4 :`, amphi4.slots);

  const amphi5 = consolidateSessionsForRoom(parsed.allSessions, 'AMPHI 5');
  console.log(`\nConsolidation Amphi 5 : ${amphi5.totalCount} séances`);
  console.log(`Créneaux Amphi 5 :`, amphi5.slots);
}

testFull();
