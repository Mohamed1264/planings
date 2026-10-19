import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    console.warn("WorkerSrc setup fallback:", e);
  }
}

export const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Regex universelle pour les créneaux horaires UM6SS
// Accepte: "De 08h30 à 10h30", "08h30 - 10h30", "08:30-10:30", "11h00 à 13h00", "14h00-16h00", etc.
export const TIME_REGEX = /(?:De\s+)?(\d{1,2}\s*[hH:]\s*\d{2})\s*(?:à|-|–|—)\s*(\d{1,2}\s*[hH:]\s*\d{2})/i;

const MONTH_NAMES_FR = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12
};

export function normalizeRoomName(name) {
  if (!name) return "";
  let norm = name.trim().replace(/\s+/g, " ").toUpperCase();
  // Nettoyage des préfixes
  norm = norm.replace(/^SALLE\s+(CD\s*\d+[A-Z]?)$/i, '$1');
  norm = norm.replace(/^SALLE\s+(AMPHI\s*[0-9A-Z]+)$/i, '$1');
  norm = norm.replace(/^AMPHI\s*:\s*/i, 'AMPHI ');
  norm = norm.replace(/^SALLE\s*:\s*/i, 'SALLE ');
  norm = norm.replace(/\s+/g, ' ').trim();
  if (/^CD\s+\d+/i.test(norm)) {
    norm = norm.replace(/^CD\s+/i, 'CD');
  }
  return norm;
}

export function normalizeSlotString(str) {
  const m = str.match(TIME_REGEX);
  if (m) {
    let t1 = m[1].replace(':', 'h').replace(/\s+/g, '');
    let t2 = m[2].replace(':', 'h').replace(/\s+/g, '');
    if (t1.length === 4) t1 = '0' + t1;
    if (t2.length === 4) t2 = '0' + t2;
    return `${t1} - ${t2}`;
  }
  return str.trim();
}

export function normalizeDateString(dateStr, fallbackYear = 2026) {
  if (!dateStr) return "";
  const clean = dateStr.trim().replace(/[\.-]/g, '/');
  const parts = clean.split('/');
  
  if (parts.length === 2) {
    let [d, m] = parts.map(n => parseInt(n, 10));
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${fallbackYear}`;
  }

  if (parts.length >= 3) {
    let [p1, p2, yr] = parts;
    let n1 = parseInt(p1, 10);
    let n2 = parseInt(p2, 10);
    let nYear = parseInt(yr, 10);
    if (nYear < 100) nYear += 2000;

    if (n1 > 12) {
      return `${String(n1).padStart(2, '0')}/${String(n2).padStart(2, '0')}/${nYear}`;
    }
    if (n2 > 12) {
      return `${String(n2).padStart(2, '0')}/${String(n1).padStart(2, '0')}/${nYear}`;
    }
    return `${String(n1).padStart(2, '0')}/${String(n2).padStart(2, '0')}/${nYear}`;
  }

  return dateStr;
}

export function addDaysToDate(dateStr, daysToAdd) {
  if (!dateStr || !dateStr.includes('/')) return "";
  const [d, m, y] = dateStr.split('/').map(Number);
  if (!d || !m || !y) return "";
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + daysToAdd);
  const resD = String(dateObj.getDate()).padStart(2, '0');
  const resM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const resY = dateObj.getFullYear();
  return `${resD}/${resM}/${resY}`;
}

export function parseWeekDates(fullText) {
  const mRange = fullText.match(/(?:Semaine\s+du|Du|Période\s+du)\s+(\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?)\s+au\s+(\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?)/i);
  if (mRange) {
    let d1 = mRange[1];
    let d2 = mRange[2];
    
    let year = 2026;
    const yMatch = fullText.match(/\b(202[4-9]|203[0-5])\b/);
    if (yMatch) year = parseInt(yMatch[1], 10);

    const p1 = d1.split(/[\/\.-]/).map(Number);
    const p2 = d2.split(/[\/\.-]/).map(Number);

    if (p1[0] === p2[0] && p1[1] < p2[1] && p1[1] <= 31 && p2[1] <= 31) {
      const month = p1[0];
      const y1 = p1[2] ? (p1[2] < 100 ? p1[2] + 2000 : p1[2]) : year;
      return {
        start: `${String(p1[1]).padStart(2, '0')}/${String(month).padStart(2, '0')}/${y1}`,
        end: `${String(p2[1]).padStart(2, '0')}/${String(month).padStart(2, '0')}/${y1}`,
        detected: true
      };
    }

    return {
      start: normalizeDateString(d1, year),
      end: normalizeDateString(d2, year),
      detected: true
    };
  }

  const mFrench = fullText.match(/(?:Semaine\s+du|Du)\s+(\d{1,2})\s+au\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
  if (mFrench) {
    const d1 = parseInt(mFrench[1], 10);
    const d2 = parseInt(mFrench[2], 10);
    const monthStr = mFrench[3].toLowerCase();
    const year = parseInt(mFrench[4], 10);
    const monthNum = MONTH_NAMES_FR[monthStr] || 1;
    return {
      start: `${String(d1).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`,
      end: `${String(d2).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`,
      detected: true
    };
  }

  return { start: "", end: "", detected: false };
}

export function detectFiliere(fullText, filename = "") {
  const combined = (fullText + " " + filename).toUpperCase();
  
  const filierePatterns = [
    { pattern: /\b(FM1|MÉDECINE\s*1|MEDECINE\s*1)\b/i, code: "FM1" },
    { pattern: /\b(FM2|MÉDECINE\s*2|MEDECINE\s*2)\b/i, code: "FM2" },
    { pattern: /\b(FM3|MÉDECINE\s*3|MEDECINE\s*3)\b/i, code: "FM3" },
    { pattern: /\b(FM4|MÉDECINE\s*4|MEDECINE\s*4)\b/i, code: "FM4" },
    { pattern: /\b(FM5|MÉDECINE\s*5|MEDECINE\s*5)\b/i, code: "FM5" },
    { pattern: /\b(ING\s*GI|GÉNIE\s*INFORMATIQUE|GENIE\s*INFORMATIQUE)\b/i, code: "ING GI" },
    { pattern: /\b(ING\s*GC|GÉNIE\s*CIVIL|GENIE\s*CIVIL)\b/i, code: "ING GC" },
    { pattern: /\b(CPI\s*1|PRÉPA\s*1|PREPA\s*1)\b/i, code: "CPI1" },
    { pattern: /\b(CPI\s*2|PRÉPA\s*2|PREPA\s*2)\b/i, code: "CPI2" },
    { pattern: /\bINFIRMIER\s*POLYVALENT\b/i, code: "IP" },
    { pattern: /\bKINÉSITHÉRAPIE\b|\bKINESITHERAPIE\b/i, code: "KIN" },
    { pattern: /\b(IAR|ANESTHÉSIE|ANESTHESIE)\b/i, code: "IAR" },
    { pattern: /\b(IBO|BIOMÉDICAL|BIOMEDICAL)\b/i, code: "IBO" },
    { pattern: /\b(LINF|SCIENCES\s*INFIRMIÈRES)\b/i, code: "LINF" },
    { pattern: /\bPHARMACIE\b|\bPHARMA\b/i, code: "PHARMA" },
    { pattern: /\bMÉDECINE\s*DENTAIRE\b|\bDENTAIRE\b/i, code: "DENTAIRE" }
  ];

  if (combined.includes("INFIRMIER") && combined.includes("KINÉ")) {
    return "IP & KIN";
  }

  for (const item of filierePatterns) {
    if (item.pattern.test(combined)) {
      return item.code;
    }
  }

  const filMatch = fullText.match(/Option\s*:\s*([A-Za-zÀ-ÿ0-9_\-\s]{2,30})/i) || 
                   fullText.match(/FILIÈRE\s*:\s*([A-Za-zÀ-ÿ0-9_\-\s]{2,30})/i);
  if (filMatch) {
    const rawOpt = filMatch[1].trim();
    if (/INFIRMIER/i.test(rawOpt)) return "IP";
    if (/KINÉ/i.test(rawOpt)) return "KIN";
    return rawOpt;
  }

  const cleanName = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
  return cleanName || "Filière UM6SS";
}

/**
 * Analyse et extrait toutes les séances d'un fichier PDF (spatial coordinates)
 */
export async function parsePdfFile(fileOrBuffer, fileName = "document.pdf") {
  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer && fileOrBuffer.buffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
  } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error("Format de fichier ou buffer non supporté");
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/',
    cMapPacked: true
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const result = {
    fileName,
    numPages,
    pages: [],
    allSessions: [],
    detectedRooms: new Set(),
    filiere: "UM6SS",
    week: { start: "", end: "", detected: false }
  };

  for (let pageIndex = 1; pageIndex <= numPages; pageIndex++) {
    const page = await pdfDoc.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1.5 });

    const textContent = await page.getTextContent();
    const rawItems = textContent.items
      .map(it => ({
        str: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        w: Math.round(it.width),
        h: Math.round(it.height)
      }))
      .filter(it => it.str.length > 0);

    const fullPageText = rawItems.map(it => it.str).join(" ");
    
    // Détection dates
    const pageWeek = parseWeekDates(fullPageText);
    if (!result.week.detected && pageWeek.detected) {
      result.week = pageWeek;
    }

    // Détection filière
    const pageFiliere = detectFiliere(fullPageText, fileName);
    if (result.filiere === "UM6SS" && pageFiliere !== "UM6SS") {
      result.filiere = pageFiliere;
    }

    // Détection salle dans l'en-tête (ex "SALLE : CD114")
    let headerRoom = null;
    const headerMatch = fullPageText.match(/(?:SALLE|AMPHI|LIEU|ESPACE|LOCAL)\s*:\s*([A-Za-z0-9_\-\s]{2,25})(?=\s+(?:Semaine|Faculté|École|Année|\b[A-Z]{3,}\b)|$)/i);
    if (headerMatch) {
      const cand = headerMatch[1].trim();
      if (!cand.toLowerCase().includes("semaine") && !cand.toLowerCase().includes("horaire")) {
        headerRoom = cand;
        result.detectedRooms.add(normalizeRoomName(headerRoom));
      }
    }

    // Détection des colonnes (Jours)
    const dayPositions = [];
    for (let dIdx = 0; dIdx < DAY_NAMES.length; dIdx++) {
      const dName = DAY_NAMES[dIdx];
      const matchItem = rawItems.find(it => it.str.toLowerCase() === dName.toLowerCase());
      if (matchItem) {
        let dayDate = "";
        const dateUnder = rawItems.find(it => 
          Math.abs(it.x - matchItem.x) < 55 && 
          matchItem.y - it.y > 0 && 
          matchItem.y - it.y < 45 && 
          /\d{1,2}[\/\.-]\d{1,2}/.test(it.str)
        );

        if (dateUnder) {
          dayDate = normalizeDateString(dateUnder.str);
        } else if (result.week.start) {
          dayDate = addDaysToDate(result.week.start, dIdx);
        }

        dayPositions.push({
          name: dName,
          dayIndex: dIdx,
          x: matchItem.x,
          y: matchItem.y,
          date: dayDate
        });
      }
    }

    if (!result.week.detected && dayPositions.some(d => d.date)) {
      const datesFound = dayPositions.filter(d => d.date).map(d => d.date);
      if (datesFound.length > 0) {
        result.week = {
          start: datesFound[0],
          end: datesFound[datesFound.length - 1],
          detected: true
        };
      }
    }

    dayPositions.sort((a, b) => a.x - b.x);

    const pageSessions = [];

    if (dayPositions.length > 0) {
      // Déterminer la largeur des colonnes
      const firstDayX = dayPositions[0].x;
      const colWidth = dayPositions.length > 1 ? (dayPositions[1].x - dayPositions[0].x) : 100;
      const headerY = dayPositions[0].y;

      // Vérifier si des créneaux sont placés dans une colonne dédiée à gauche (Layout A)
      const leftSlotItems = rawItems.filter(it => TIME_REGEX.test(it.str) && it.x < (firstDayX - 30));

      if (leftSlotItems.length > 0) {
        // === LAYOUT A : Créneaux dans la colonne de gauche ===
        leftSlotItems.sort((a, b) => b.y - a.y);

        const columns = [];
        for (let i = 0; i < dayPositions.length; i++) {
          const curr = dayPositions[i];
          const prevX = i > 0 ? dayPositions[i - 1].x : 0;
          const nextX = i < dayPositions.length - 1 ? dayPositions[i + 1].x : viewport.width;
          columns.push({
            dayName: curr.name,
            date: curr.date,
            xMin: i === 0 ? (curr.x - 45) : (curr.x + prevX) / 2,
            xMax: i === dayPositions.length - 1 ? (curr.x + 130) : (curr.x + nextX) / 2
          });
        }

        const rows = [];
        for (let j = 0; j < leftSlotItems.length; j++) {
          const currSlot = leftSlotItems[j];
          const prevY = j > 0 ? leftSlotItems[j - 1].y : viewport.height;
          const nextY = j < leftSlotItems.length - 1 ? leftSlotItems[j + 1].y : 0;
          rows.push({
            slotTime: normalizeSlotString(currSlot.str),
            yMin: (currSlot.y + nextY) / 2,
            yMax: (prevY + currSlot.y) / 2
          });
        }

        for (const col of columns) {
          for (const row of rows) {
            const cellItems = rawItems.filter(it => 
              it.x >= col.xMin && it.x <= col.xMax && 
              it.y >= row.yMin && it.y <= row.yMax &&
              it.str !== col.dayName && !TIME_REGEX.test(it.str) && !it.str.includes(col.date)
            );
            if (cellItems.length === 0) continue;
            cellItems.sort((a, b) => b.y - a.y);
            const sess = extractSessionFromItems(cellItems, col.dayName, col.date, row.slotTime, headerRoom, pageFiliere, fileName, pageIndex, result);
            if (sess) pageSessions.push(sess);
          }
        }
      } else {
        // === LAYOUT B : Créneaux À L'INTÉRIEUR DES CELLULES (Format Officiel UM6SS) ===
        for (let i = 0; i < dayPositions.length; i++) {
          const day = dayPositions[i];
          const prevX = i > 0 ? dayPositions[i - 1].x : 0;
          const nextX = i < dayPositions.length - 1 ? dayPositions[i + 1].x : viewport.width;
          const xMin = i === 0 ? (day.x - colWidth / 2) : (day.x + prevX) / 2;
          const xMax = i === dayPositions.length - 1 ? (day.x + colWidth / 2) : (day.x + nextX) / 2;

          // Tous les éléments de la colonne sous l'en-tête
          const colItems = rawItems.filter(it => 
            it.x >= xMin && it.x <= xMax && 
            it.y < (headerY - 15) &&
            it.str !== day.name &&
            it.str !== day.date
          );

          colItems.sort((a, b) => b.y - a.y); // du haut vers le bas

          // Trouver les ancres de créneaux (ex: "De 08h30 à 10h30", "De 11h00 à 13h00", etc.)
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
            const slotTime = normalizeSlotString(timeItem.str);
            const otherItems = sessionItems.slice(1);

            const sess = extractSessionFromItems(otherItems, day.name, day.date, slotTime, headerRoom, pageFiliere, fileName, pageIndex, result);
            if (sess) pageSessions.push(sess);
          }
        }
      }
    }

    result.pages.push({
      pageNumber: pageIndex,
      sessionsCount: pageSessions.length
    });

    result.allSessions.push(...pageSessions);
  }

  result.detectedRoomsList = Array.from(result.detectedRooms).sort();
  return result;
}

/**
 * Extrait une séance propre à partir d'un groupe d'éléments textuels
 */
function extractSessionFromItems(items, dayName, dayDate, slotTime, headerRoom, pageFiliere, fileName, pageIndex, result) {
  if (!items || items.length === 0) return null;
  const cellTexts = items.map(it => it.str);
  const cellFullString = cellTexts.join(" ");

  // Détection salle (ex: "Amphi 4", "Amphi 5", "CD114", "Salle 102", etc.)
  let sessionRoom = headerRoom || "";
  const roomMatch = cellFullString.match(/\b(AMPHI\s*[0-9A-Z]+|CD\s*\d+[A-Z]?|SALLE\s*(?:DE\s*)?[0-9A-Z_\-]+|LABO\s*[0-9A-Z_\-]+|BIBLIO[A-Z0-9]*)\b/i);
  if (roomMatch) {
    sessionRoom = roomMatch[1].trim();
  }

  if (sessionRoom) {
    result.detectedRooms.add(normalizeRoomName(sessionRoom));
  }

  // Détection Enseignant
  let teacher = "";
  const profMatch = cellFullString.match(/(Pr\.?|Prof\.?|Dr\.?|M\.|Mme|Mlle|Ing\.)\s+([A-Za-zÀ-ÿ\-'\s]{3,30})/i);
  if (profMatch) {
    teacher = `${profMatch[1]} ${profMatch[2].trim()}`;
  }

  // Détection Numéro de Séance : 5/10, (7/12), Séance 7/12
  let sessionNumber = "";
  const sessionMatch = cellFullString.match(/\(?\s*(\d{1,2}\s*\/\s*\d{1,2})\s*\)?/i);
  if (sessionMatch) {
    sessionNumber = `(${sessionMatch[1].replace(/\s+/g, '')})`;
  }

  // Détection Mention Spéciale
  const notesFound = [];
  if (/CC\s*N?[°o]?\s*\d*/i.test(cellFullString)) {
    const m = cellFullString.match(/CC\s*N?[°o]?\s*\d*/i);
    notesFound.push(m[0]);
  }
  if (/\bTD\b/i.test(cellFullString)) notesFound.push("TD");
  if (/\bTP\b/i.test(cellFullString)) notesFound.push("TP");
  if (/Groupe\s+[A-Z0-9]+|G[1-4]\b/i.test(cellFullString)) {
    const m = cellFullString.match(/Groupe\s+[A-Z0-9]+|G[1-4]\b/i);
    notesFound.push(m[0]);
  }
  if (/Rattrapage/i.test(cellFullString)) notesFound.push("Rattrapage");
  if (/Tronc\s+Commun/i.test(cellFullString)) notesFound.push("Tronc Commun");
  const specialNote = notesFound.join(" - ");

  // Titre du cours nettoyé
  const cleanedLines = cellTexts.filter(text => {
    if (roomMatch && text.toUpperCase().includes(roomMatch[1].toUpperCase())) return false;
    if (profMatch && text.toLowerCase().includes(profMatch[2].toLowerCase().trim())) return false;
    if (sessionMatch && text.includes(sessionMatch[1])) return false;
    if (/^séance/i.test(text)) return false;
    if (notesFound.some(n => text.includes(n))) return false;
    if (/^(pr|prof|dr|m\.|mme|ing)\b/i.test(text)) return false;
    return text.length > 2;
  });

  const courseTitle = cleanedLines.length > 0 ? cleanedLines.join(" ") : cellTexts[0] || "Cours";

  return {
    id: `${fileName}-p${pageIndex}-${dayName}-${slotTime}-${Math.random().toString(36).substr(2, 6)}`,
    filiere: pageFiliere,
    day: dayName,
    date: dayDate,
    slot: slotTime,
    room: sessionRoom,
    title: courseTitle,
    sessionNumber,
    teacher,
    specialNote,
    sourceFile: fileName,
    sourcePage: pageIndex,
    weekRange: result.week
  };
}
