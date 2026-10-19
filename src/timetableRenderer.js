import { getFiliereStyle } from './filiereColors.js';
import { parseSlotStartTime } from './consolidator.js';

// Palette de fonds pastels authentiques du document officiel UM6SS
const OFFICIAL_PASTELS = [
  { bg: "#dce8f8", textTitle: "#a80000" }, // Bleu pastel (Méthodologie)
  { bg: "#fee8b0", textTitle: "#a80000" }, // Jaune pastel (Psychologie / Système de santé)
  { bg: "#dff0e0", textTitle: "#a80000" }, // Vert pastel (Anatomie & physiologie)
  { bg: "#fce4ec", textTitle: "#a80000" }, // Rose pastel
  { bg: "#ede7f6", textTitle: "#a80000" }, // Violet pastel
  { bg: "#fff3e0", textTitle: "#a80000" }  // Pêche pastel
];

function getCourseColor(courseTitle) {
  if (!courseTitle) return OFFICIAL_PASTELS[0];
  const t = courseTitle.toLowerCase();
  if (t.includes("méthodologie") || t.includes("methodologie") || t.includes("informatique") || t.includes("algo")) {
    return OFFICIAL_PASTELS[0]; // Bleu
  }
  if (t.includes("psychologie") || t.includes("santé") || t.includes("sante") || t.includes("système") || t.includes("systeme") || t.includes("biochimie")) {
    return OFFICIAL_PASTELS[1]; // Jaune
  }
  if (t.includes("anatomie") || t.includes("physiologie") || t.includes("biologie")) {
    return OFFICIAL_PASTELS[2]; // Vert
  }

  let hash = 0;
  for (let i = 0; i < courseTitle.length; i++) {
    hash = courseTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  return OFFICIAL_PASTELS[Math.abs(hash) % OFFICIAL_PASTELS.length];
}

/**
 * Génère le code HTML de l'emploi du temps – Réplique EXACTE du planning officiel UM6SS
 */
export function renderTimetableSection(consolidatedData, weekDates = {}) {
  const { room, slots, days, datesMap, grid, totalCount, weekRange } = consolidatedData;

  const startWeek = (weekRange && weekRange.start) || weekDates.start || "05/10/2026";
  const endWeek = (weekRange && weekRange.end) || weekDates.end || "10/10/2026";

  if (slots.length === 0) {
    return `
      <section class="timetable-section empty-state">
        <div class="empty-notice">
          <div class="empty-icon">📍</div>
          <h3>Aucune séance trouvée pour : <strong>${escapeHtml(room)}</strong></h3>
          <p>Cette salle n'apparaît dans aucun créneau des fichiers plannings importés pour cette semaine.</p>
        </div>
      </section>
    `;
  }

  // Créneaux MATIN (< 13h30 = 810 min) et APRES MIDI (>= 13h30)
  const morningSlots = slots.filter(s => parseSlotStartTime(s) < 810);
  const afternoonSlots = slots.filter(s => parseSlotStartTime(s) >= 810);

  // Si pas de créneaux après-midi, on affiche au moins 2 lignes vides pour respecter le design complet
  const effectiveAfternoonCount = afternoonSlots.length > 0 ? afternoonSlots.length : 2;
  const effectiveMorningCount = morningSlots.length > 0 ? morningSlots.length : 2;

  // En-têtes colonnes : Ligne 1 (Noms) et Ligne 2 (Dates)
  const headerDaysRowHtml = days.map(day => `
    <th class="um6ss-th-day">${escapeHtml(day)}</th>
  `).join("");

  const headerDatesRowHtml = days.map(day => `
    <th class="um6ss-th-date">${escapeHtml(datesMap[day] || "")}</th>
  `).join("");

  // Total des lignes pour le rowspan de la colonne latérale verticale
  // (morning + 1 ligne séparatrice rouge + afternoon)
  const totalVerticalRowspan = effectiveMorningCount + 1 + effectiveAfternoonCount;

  let bodyHtml = "";

  // 1. Lignes du MATIN
  if (morningSlots.length > 0) {
    morningSlots.forEach((slot, idx) => {
      let leadCols = "";
      if (idx === 0) {
        leadCols += `
          <td class="um6ss-td-vertical-period" rowspan="${totalVerticalRowspan}">
            <div class="um6ss-vertical-period-txt">Du ${escapeHtml(startWeek)} au ${escapeHtml(endWeek)}</div>
          </td>
          <td class="um6ss-td-period-red" rowspan="${morningSlots.length}">
            <div class="um6ss-period-label">MATIN</div>
          </td>
        `;
      }

      const cells = days.map(day => renderCellContent(grid[slot][day], slot, room)).join("");
      bodyHtml += `<tr>${leadCols}${cells}</tr>`;
    });
  } else {
    // 2 lignes matin vides par défaut
    for (let m = 0; m < 2; m++) {
      let leadCols = "";
      if (m === 0) {
        leadCols += `
          <td class="um6ss-td-vertical-period" rowspan="${totalVerticalRowspan}">
            <div class="um6ss-vertical-period-txt">Du ${escapeHtml(startWeek)} au ${escapeHtml(endWeek)}</div>
          </td>
          <td class="um6ss-td-period-red" rowspan="2">
            <div class="um6ss-period-label">MATIN</div>
          </td>
        `;
      }
      const cells = days.map(() => `<td class="um6ss-td-cell um6ss-empty-white"></td>`).join("");
      bodyHtml += `<tr>${leadCols}${cells}</tr>`;
    }
  }

  // 2. BANDE ROUGE SÉPARATRICE entre MATIN et APRES MIDI (exactement comme dans l'image !)
  bodyHtml += `
    <tr class="um6ss-tr-red-divider">
      <td colspan="7" class="um6ss-td-red-divider"></td>
    </tr>
  `;

  // 3. Lignes de l'APRÈS-MIDI
  if (afternoonSlots.length > 0) {
    afternoonSlots.forEach((slot, idx) => {
      let leadCol = "";
      if (idx === 0) {
        leadCol = `
          <td class="um6ss-td-period-red" rowspan="${afternoonSlots.length}">
            <div class="um6ss-period-label">APRES MIDI</div>
          </td>
        `;
      }
      const cells = days.map(day => renderCellContent(grid[slot][day], slot, room)).join("");
      bodyHtml += `<tr>${leadCol}${cells}</tr>`;
    });
  } else {
    // 2 lignes après-midi vides par défaut comme sur l'image de référence
    for (let a = 0; a < 2; a++) {
      let leadCol = "";
      if (a === 0) {
        leadCol = `
          <td class="um6ss-td-period-red" rowspan="2">
            <div class="um6ss-period-label">APRES MIDI</div>
          </td>
        `;
      }
      const cells = days.map(() => `<td class="um6ss-td-cell um6ss-empty-white"></td>`).join("");
      bodyHtml += `<tr>${leadCol}${cells}</tr>`;
    }
  }

  return `
    <section class="timetable-section um6ss-exact-paper-sheet" id="timetable-${slugify(room)}">
      <!-- En-tête officiel UM6SS -->
      <div class="um6ss-official-doc-header">
        <div class="um6ss-doc-logos-block">
          <div class="um6ss-svg-emblem">
            <img src="/um6ss.jpg" alt="Logo UM6SS" class="um6ss-logo-img" />
          </div>
        </div>

        <div class="um6ss-doc-banner-group">
          <!-- Grand bandeau rouge officiel -->
          <div class="um6ss-doc-red-banner">
            PLANNING HEBDOMADAIRE DES COURS
          </div>
          <!-- Sous-bandeau blanc officiel -->
          <div class="um6ss-doc-white-subbar">
            Année Universitaire 2026/2027 • Emploi du temps – Salle : <strong class="red-room-title">${escapeHtml(room)}</strong>
            <span class="print-hidden" style="margin-left: 12px;">(${totalCount} séance${totalCount > 1 ? 's' : ''})</span>
          </div>
        </div>

        <div class="um6ss-quick-actions print-hidden">
          <button class="btn-action btn-print-single" data-room="${escapeHtml(room)}" title="Imprimer ou enregistrer en PDF (A4 Paysage)">
            <span>🖨️ Imprimer A4</span>
          </button>
          <button class="btn-action btn-excel-single" data-room="${escapeHtml(room)}" title="Exporter sous format Excel (.xlsx)">
            <span>📊 Excel</span>
          </button>
        </div>
      </div>

      <!-- TABLEAU EXACT UM6SS (Bordures noires, fond rouge, colonnes exactes) -->
      <div class="um6ss-table-outer-frame">
        <table class="um6ss-exact-grid">
          <thead>
            <!-- Ligne 1 : Noms des jours -->
            <tr>
              <th class="um6ss-corner-cell" colspan="2" rowspan="2"></th>
              ${headerDaysRowHtml}
            </tr>
            <!-- Ligne 2 : Dates des jours -->
            <tr>
              ${headerDatesRowHtml}
            </tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>
      </div>

    </section>
  `;
}

function renderCellContent(cards, slot, targetRoom) {
  if (!cards || cards.length === 0) {
    return `<td class="um6ss-td-cell um6ss-empty-white"></td>`;
  }

  const innerHtml = cards.map(c => {
    const palette = getCourseColor(c.title);
    return `
      <div class="um6ss-cell-inner-box" style="background-color: ${palette.bg};">
        <div class="cell-line-time">${escapeHtml(formatSlotDisplay(c.slot || slot))}</div>
        <div class="cell-line-title">${escapeHtml(c.title)}</div>
        ${c.teacher ? `<div class="cell-line-teacher">👨‍🏫 ${escapeHtml(c.teacher)}</div>` : ""}
        ${c.specialNote ? `<div class="cell-line-note"><em>${escapeHtml(c.specialNote)}</em></div>` : ""}
        <div class="cell-line-room">${escapeHtml(c.room || targetRoom)}</div>
        ${c.filieres && c.filieres.length > 0 ? `<div class="cell-line-filiere">${c.filieres.map(f => `<span class="fil-tag">${escapeHtml(f)}</span>`).join('')}</div>` : ""}
      </div>
    `;
  }).join("");

  return `<td class="um6ss-td-cell" style="padding: 0;"><div class="um6ss-cell-stack">${innerHtml}</div></td>`;
}

function formatSlotDisplay(slotStr) {
  if (!slotStr) return "";
  if (/^De\s+/i.test(slotStr)) return slotStr;
  const m = slotStr.match(/^(\d{1,2}\s*[hH:]\s*\d{2})\s*[-–—à]\s*(\d{1,2}\s*[hH:]\s*\d{2})$/);
  if (m) {
    return `De ${m[1]} à ${m[2]}`;
  }
  return slotStr;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
