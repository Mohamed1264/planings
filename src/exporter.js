import * as XLSX from 'xlsx';

/**
 * Exporte un emploi du temps consolidé en fichier Excel (.xlsx)
 */
export function exportToExcel(consolidatedData, weekDates = {}) {
  const { room, slots, days, datesMap, grid } = consolidatedData;
  const startWeek = weekDates.start || "05/10/2026";
  const endWeek = weekDates.end || "10/10/2026";

  const rows = [];

  // En-têtes institutionnels
  rows.push(["UNIVERSITÉ MOHAMMED VI DES SCIENCES ET DE LA SANTÉ (UM6SS) - DAKHLA"]);
  rows.push(["Faculté de Médecine & École Supérieure d'Ingénieurs"]);
  rows.push([`Emploi du temps – Salle : ${room}`]);
  rows.push([`Semaine du ${startWeek} au ${endWeek}`]);
  rows.push([]); // Ligne vide

  // En-tête des colonnes du tableau
  const headerRow = ["Créneau Horaires"];
  days.forEach(day => {
    const d = datesMap[day] ? ` (${datesMap[day]})` : "";
    headerRow.push(`${day}${d}`);
  });
  rows.push(headerRow);

  // Lignes de créneaux
  slots.forEach(slot => {
    const row = [slot];
    days.forEach(day => {
      const cards = grid[slot][day] || [];
      if (cards.length === 0) {
        row.push("—");
      } else {
        const textParts = cards.map(c => {
          let str = `${c.title}`;
          if (c.teacher) str += ` | ${c.teacher}`;
          if (c.filieres && c.filieres.length > 0) str += ` [${c.filieres.join('/')}]`;
          if (c.specialNote) str += ` (${c.specialNote})`;
          return str;
        });

        if (cards.length > 1) {
          row.push(textParts.join("\n---\n"));
        } else {
          row.push(textParts.join("\n"));
        }
      }
    });
    rows.push(row);
  });

  // Création du classeur Excel
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ajustement automatique des largeurs de colonnes
  const colWidths = [{ wch: 18 }];
  days.forEach(() => colWidths.push({ wch: 28 }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const safeSheetName = room.replace(/[:\\/?*\[\]]/g, "_").substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName || "Emploi du temps");

  const cleanFileName = `Emploi_du_temps_${room.replace(/\s+/g, '_')}_${startWeek.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}

/**
 * Exporte une page HTML autonome téléchargeable (CSS inline, Google Fonts)
 */
export function exportStandaloneHtml(renderedHtml, title = "Emploi du temps", cssContent = "") {
  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} – UM6SS Dakhla</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    ${cssContent}
    body { padding: 24px; background: #f8fafc; color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif; }
    .print-hidden, .app-header, .upload-card, .rooms-proposal-panel, .floating-actions { display: none !important; }
    .timetable-section { max-width: 100% !important; margin: 0 auto; box-shadow: none !important; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
