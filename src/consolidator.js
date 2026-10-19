import { normalizeRoomName, DAY_NAMES, addDaysToDate } from './pdfParser.js';

export function parseSlotStartTime(slotStr) {
  if (!slotStr) return 0;
  const match = slotStr.match(/^(\d{1,2})\s*[hH:]\s*(\d{0,2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    return h * 60 + m;
  }
  return 0;
}

export function parseSlotEndTime(slotStr) {
  if (!slotStr) return 0;
  const match = slotStr.match(/[-–—à]\s*(\d{1,2})\s*[hH:]\s*(\d{0,2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    return h * 60 + m;
  }
  return parseSlotStartTime(slotStr) + 120;
}

/**
 * Consolide dynamiquement toutes les séances d'une salle à travers n'importe quel nombre de fichiers
 */
export function consolidateSessionsForRoom(allSessions, targetRooms, filterWeek = null) {
  const normalizedTargets = (Array.isArray(targetRooms) ? targetRooms : [targetRooms])
    .map(r => normalizeRoomName(r))
    .filter(Boolean);

  // Filtrer par salle (et éventuellement par semaine)
  let roomSessions = allSessions.filter(s => {
    const sRoom = normalizeRoomName(s.room);
    const matchRoom = normalizedTargets.some(target => {
      if (!sRoom || !target) return false;
      return sRoom === target || sRoom.includes(target) || target.includes(sRoom);
    });

    if (!matchRoom) return false;

    if (filterWeek && s.weekRange && s.weekRange.start) {
      const weekKey = `${s.weekRange.start} - ${s.weekRange.end}`;
      if (weekKey !== filterWeek) return false;
    }

    return true;
  });

  const days = DAY_NAMES;

  // Déduire les dates de la semaine dynamiquement depuis les séances
  let detectedWeekStart = "";
  let detectedWeekEnd = "";

  for (const s of roomSessions) {
    if (s.weekRange && s.weekRange.start) {
      detectedWeekStart = s.weekRange.start;
      detectedWeekEnd = s.weekRange.end;
      break;
    }
  }

  // Association dynamique des dates pour chaque jour
  const datesMap = {};
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    // 1. Chercher si une séance de ce jour porte une date explicite
    const explicit = roomSessions.find(s => s.day === day && s.date);
    if (explicit && explicit.date) {
      datesMap[day] = explicit.date;
    } else if (detectedWeekStart) {
      // 2. Sinon, calcul dynamique automatique à partir de la date de début de semaine !
      datesMap[day] = addDaysToDate(detectedWeekStart, i);
    } else {
      datesMap[day] = "";
    }
  }

  if (roomSessions.length === 0) {
    return {
      room: Array.isArray(targetRooms) ? targetRooms.join(" & ") : targetRooms,
      slots: [],
      days,
      datesMap,
      grid: {},
      totalCount: 0,
      weekRange: { start: detectedWeekStart, end: detectedWeekEnd }
    };
  }

  // Trier les créneaux uniques utilisés
  const uniqueSlots = Array.from(new Set(roomSessions.map(s => s.slot)));
  uniqueSlots.sort((a, b) => {
    const diff = parseSlotStartTime(a) - parseSlotStartTime(b);
    if (diff !== 0) return diff;
    return parseSlotEndTime(a) - parseSlotEndTime(b);
  });

  const grid = {};
  for (const slot of uniqueSlots) {
    grid[slot] = {};
    for (const day of days) {
      grid[slot][day] = [];
    }
  }

  for (const day of days) {
    for (const slot of uniqueSlots) {
      const matching = roomSessions.filter(s => s.day === day && s.slot === slot);
      if (matching.length === 0) continue;

      const mergedGroups = [];

      for (const sess of matching) {
        const normTitle = sess.title.toLowerCase().trim();
        const normProf = (sess.teacher || "").toLowerCase().trim();

        const existing = mergedGroups.find(g => 
          g.title.toLowerCase().trim() === normTitle &&
          (g.teacher || "").toLowerCase().trim() === normProf
        );

        if (existing) {
          // Fusion des filières pour le même cours (ex: FM1 + IP + KIN)
          const setF = new Set([...existing.filieres]);
          sess.filiere.split(/[&,]/).forEach(f => setF.add(f.trim()));
          existing.filieres = Array.from(setF).filter(Boolean);
          if (sess.specialNote && !existing.specialNote.includes(sess.specialNote)) {
            existing.specialNote = existing.specialNote 
              ? `${existing.specialNote} / ${sess.specialNote}` 
              : sess.specialNote;
          }
        } else {
          const filieresList = sess.filiere.split(/[&,]/).map(f => f.trim()).filter(Boolean);
          mergedGroups.push({
            id: sess.id,
            title: sess.title,
            sessionNumber: sess.sessionNumber,
            teacher: sess.teacher,
            specialNote: sess.specialNote,
            filieres: filieresList.length > 0 ? filieresList : [sess.filiere],
            room: sess.room,
            day: sess.day,
            date: sess.date || datesMap[day] || "",
            slot: sess.slot,
            sourceFile: sess.sourceFile
          });
        }
      }

      grid[slot][day] = mergedGroups;
    }
  }

  return {
    room: Array.isArray(targetRooms) ? targetRooms.join(" & ") : targetRooms,
    slots: uniqueSlots,
    days,
    datesMap,
    grid,
    totalCount: roomSessions.length,
    weekRange: { start: detectedWeekStart, end: detectedWeekEnd }
  };
}
