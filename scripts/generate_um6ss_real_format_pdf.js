import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateExactUm6ssPdf() {
  const samplesDir = path.resolve('./public/samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([842, 595]); // A4 Landscape

  const redDark = rgb(0.68, 0.05, 0.08); // UM6SS Red banner
  const blueLight = rgb(0.88, 0.92, 0.98); // Blue cell background
  const yellowLight = rgb(0.99, 0.94, 0.82); // Yellow cell background
  const greenLight = rgb(0.88, 0.96, 0.88); // Green cell background
  const grayBorder = rgb(0.4, 0.4, 0.4);

  // Red top banner
  page.drawRectangle({ x: 140, y: 535, width: 660, height: 35, color: redDark });
  page.drawText("PLANNING HEBDOMADAIRE DES COURS", { x: 340, y: 546, size: 13, font: fontBold, color: rgb(1, 1, 1) });

  // Subheader
  page.drawText("1ère année_Semestre 1_2026/2027 - Option : Infirmier polyvalent", { x: 300, y: 518, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  // Left vertical text
  page.drawText("Du 05/10/2026 au 10/10/2026", {
    x: 65,
    y: 260,
    size: 11,
    font: fontBold,
    rotate: { type: 'degrees', angle: 90 },
    color: rgb(0.1, 0.1, 0.1)
  });

  const startX = 140;
  const startY = 505;
  const dayColWidth = 100;
  const headerHeight = 35;
  const periodColWidth = 50;

  // Day columns (Red header)
  const days = [
    { name: "Lundi", date: "05/10/2026" },
    { name: "Mardi", date: "06/10/2026" },
    { name: "Mercredi", date: "07/10/2026" },
    { name: "Jeudi", date: "08/10/2026" },
    { name: "Vendredi", date: "09/10/2026" },
    { name: "Samedi", date: "10/10/2026" }
  ];

  // Draw day headers
  days.forEach((day, i) => {
    const x = startX + periodColWidth + i * dayColWidth;
    page.drawRectangle({ x, y: startY - headerHeight, width: dayColWidth, height: headerHeight, color: redDark, borderColor: rgb(1, 1, 1), borderWidth: 0.5 });
    page.drawText(day.name, { x: x + 30, y: startY - 16, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(day.date, { x: x + 25, y: startY - 30, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  });

  // MATIN column block
  const rowHeight = 90;
  page.drawRectangle({ x: startX, y: startY - headerHeight - 2 * rowHeight, width: periodColWidth, height: 2 * rowHeight, color: redDark, borderColor: grayBorder, borderWidth: 0.5 });
  page.drawText("MATIN", { x: startX + 12, y: startY - headerHeight - rowHeight, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  // Grid for Row 1 (08h30 - 10h30)
  const yRow1 = startY - headerHeight - rowHeight;
  const row1Sessions = [
    { col: 0, time: "De 08h30 à 10h30", title: "Méthodologie de travail universitaire", num: "5/10", room: "Amphi 4", color: blueLight },
    { col: 1, time: "De 08h30 à 10h30", title: "Psychologie de la santé", num: "1/9", room: "Amphi 4", color: yellowLight },
    { col: 2, time: "De 08h30 à 10h30", title: "Système national de santé", num: "2/10", room: "Amphi 4", color: yellowLight },
    { col: 3, time: "De 08h30 à 10h30", title: "Méthodologie de travail universitaire", num: "6/10", room: "Amphi 4", color: blueLight },
    { col: 4, time: "De 08h30 à 10h30", title: "Psychologie de la santé", num: "2/9", room: "Amphi 4", color: yellowLight }
  ];

  // Grid for Row 2 (11h00 - 13h00)
  const yRow2 = startY - headerHeight - 2 * rowHeight;
  const row2Sessions = [
    { col: 0, time: "De 11h00 à 13h00", title: "Anatomie et physiologie humaine", num: "3/22", room: "Amphi 5", color: greenLight },
    { col: 1, time: "De 11h00 à 13h00", title: "Anatomie et physiologie humaine", num: "4/22", room: "Amphi 5", color: greenLight },
    { col: 2, time: "De 11h00 à 13h00", title: "Anatomie et physiologie humaine", num: "5/22", room: "Amphi 5", color: greenLight },
    { col: 3, time: "De 11h00 à 13h00", title: "Anatomie et physiologie humaine", num: "6/22", room: "Amphi 5", color: greenLight },
    { col: 4, time: "De 11h00 à 13h00", title: "Méthodologie de travail universitaire", num: "7/10", room: "Amphi 4", color: blueLight }
  ];

  // Draw cells Row 1
  for (let c = 0; c < 6; c++) {
    const x = startX + periodColWidth + c * dayColWidth;
    const s = row1Sessions.find(item => item.col === c);
    page.drawRectangle({ x, y: yRow1, width: dayColWidth, height: rowHeight, color: s ? s.color : rgb(1, 1, 1), borderColor: grayBorder, borderWidth: 0.5 });
    if (s) {
      page.drawText(s.time, { x: x + 12, y: yRow1 + 72, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(s.title, { x: x + 5, y: yRow1 + 54, size: 7, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
      page.drawText(s.num, { x: x + 40, y: yRow1 + 38, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(s.room, { x: x + 30, y: yRow1 + 16, size: 8.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    }
  }

  // Draw cells Row 2
  for (let c = 0; c < 6; c++) {
    const x = startX + periodColWidth + c * dayColWidth;
    const s = row2Sessions.find(item => item.col === c);
    page.drawRectangle({ x, y: yRow2, width: dayColWidth, height: rowHeight, color: s ? s.color : rgb(1, 1, 1), borderColor: grayBorder, borderWidth: 0.5 });
    if (s) {
      page.drawText(s.time, { x: x + 12, y: yRow2 + 72, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(s.title, { x: x + 5, y: yRow2 + 54, size: 7, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
      page.drawText(s.num, { x: x + 40, y: yRow2 + 38, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(s.room, { x: x + 30, y: yRow2 + 16, size: 8.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    }
  }

  // APRES MIDI block
  const yApresMidi = yRow2 - 2 * rowHeight;
  page.drawRectangle({ x: startX, y: yApresMidi, width: periodColWidth, height: 2 * rowHeight, color: redDark, borderColor: grayBorder, borderWidth: 0.5 });
  page.drawText("APRES MIDI", { x: startX + 5, y: yApresMidi + rowHeight, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const x = startX + periodColWidth + c * dayColWidth;
      const y = yApresMidi + (1 - r) * rowHeight;
      page.drawRectangle({ x, y, width: dayColWidth, height: rowHeight, color: rgb(1, 1, 1), borderColor: grayBorder, borderWidth: 0.5 });
    }
  }

  const pdfBytes = await pdf.save();
  const filePath = path.join(samplesDir, 'planning_um6ss_infirmier_polyvalent.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  console.log(`Generated exact UM6SS PDF at: ${filePath}`);
}

generateExactUm6ssPdf();
