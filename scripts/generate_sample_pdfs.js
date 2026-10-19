import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSamplePdfs() {
  const samplesDir = path.resolve('./public/samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  const days = [
    { name: "Lundi", date: "05/10/2026" },
    { name: "Mardi", date: "06/10/2026" },
    { name: "Mercredi", date: "07/10/2026" },
    { name: "Jeudi", date: "08/10/2026" },
    { name: "Vendredi", date: "09/10/2026" },
    { name: "Samedi", date: "10/10/2026" }
  ];

  const slots = [
    "08h30 - 10h25",
    "10h35 - 12h30",
    "14h00 - 15h55",
    "16h05 - 18h00"
  ];

  const startX = 50;
  const startY = 490;
  const colWidth = 120;
  const headerHeight = 35;
  const rowHeight = 85;
  const timeColWidth = 100;

  async function createGridPage(doc, title, filiere, weekStr, headerRoom = null) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([842, 595]);

    page.drawText("UNIVERSITÉ MOHAMMED VI DES SCIENCES ET DE LA SANTÉ - DAKHLA", { x: 50, y: 560, size: 13, font: fontBold, color: rgb(0.06, 0.17, 0.28) });
    page.drawText("FACULTÉ DE MÉDECINE & ÉCOLE SUPÉRIEURE D'INGÉNIEURS", { x: 50, y: 542, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(title, { x: 50, y: 524, size: 12, font: fontBold, color: rgb(0.1, 0.3, 0.6) });
    
    if (headerRoom) {
      page.drawText(`SALLE : ${headerRoom}`, { x: 380, y: 524, size: 12, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    }
    page.drawText(weekStr, { x: 550, y: 524, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    page.drawRectangle({ x: startX, y: startY - headerHeight, width: timeColWidth, height: headerHeight, color: rgb(0.9, 0.93, 0.96) });
    page.drawText("Horaires", { x: startX + 25, y: startY - 22, size: 10, font: fontBold });

    days.forEach((day, i) => {
      const x = startX + timeColWidth + i * colWidth;
      page.drawRectangle({ x, y: startY - headerHeight, width: colWidth, height: headerHeight, color: rgb(0.9, 0.93, 0.96) });
      page.drawText(day.name, { x: x + 35, y: startY - 16, size: 10, font: fontBold });
      page.drawText(day.date, { x: x + 30, y: startY - 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    });

    slots.forEach((slot, rowIdx) => {
      const y = startY - headerHeight - (rowIdx + 1) * rowHeight;
      page.drawRectangle({ x: startX, y, width: timeColWidth, height: rowHeight, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
      page.drawText(slot, { x: startX + 15, y: y + 40, size: 9, font: fontBold });

      days.forEach((day, colIdx) => {
        const x = startX + timeColWidth + colIdx * colWidth;
        page.drawRectangle({ x, y, width: colWidth, height: rowHeight, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5 });
      });
    });

    return { page, font, fontBold };
  }

  // 1. FM1
  const pdf1 = await PDFDocument.create();
  const { page: p1, font: f1, fontBold: fb1 } = await createGridPage(pdf1, "MÉDECINE 1ère ANNÉE (FM1)", "FM1", "Semaine du 05/10/2026 au 10/10/2026");
  const fm1Sessions = [
    { dayIdx: 0, rowIdx: 0, title: "Anatomie Générale", session: "(7/12)", prof: "Pr. EL OMARI", room: "AMPHI 4", note: "" },
    { dayIdx: 0, rowIdx: 1, title: "Biophysique Médicale", session: "(5/10)", prof: "Pr. TAZI", room: "AMPHI 4", note: "" },
    { dayIdx: 1, rowIdx: 0, title: "Biologie Cellulaire", session: "(6/12)", prof: "Pr. CHERKAOUI", room: "AMPHI 4", note: "CC N°1" },
    { dayIdx: 1, rowIdx: 2, title: "Histologie - Embryologie", session: "(4/10)", prof: "Pr. ALAMI", room: "CD114", note: "" },
    { dayIdx: 2, rowIdx: 0, title: "Biochimie Structurale", session: "(8/12)", prof: "Pr. BENSLIMANE", room: "AMPHI 4", note: "" },
    { dayIdx: 2, rowIdx: 1, title: "Physiologie Générale", session: "(3/10)", prof: "Pr. IDRISSI", room: "AMPHI 4", note: "" },
    { dayIdx: 3, rowIdx: 1, title: "Anatomie (Ostéologie)", session: "(8/12)", prof: "Pr. EL OMARI", room: "AMPHI 4", note: "Groupe G1" },
    { dayIdx: 4, rowIdx: 0, title: "Santé Publique", session: "(2/8)", prof: "Pr. NACIRI", room: "CD114", note: "" },
    { dayIdx: 4, rowIdx: 1, title: "Séminaire d'Intégration", session: "", prof: "Pr. TAZI & Pr. ALAMI", room: "AMPHI 4", note: "15h00 - 17h00" },
    { dayIdx: 5, rowIdx: 0, title: "Éthique et Déontologie", session: "(4/6)", prof: "Pr. FASSI", room: "AMPHI 4", note: "" }
  ];
  for (const s of fm1Sessions) {
    const x = startX + timeColWidth + s.dayIdx * colWidth + 5;
    const y = startY - headerHeight - (s.rowIdx + 1) * rowHeight + 5;
    p1.drawText(s.title, { x, y: y + 62, size: 8, font: fb1 });
    if (s.session) p1.drawText(`Séance ${s.session}`, { x, y: y + 50, size: 7.5, font: f1, color: rgb(0.3, 0.3, 0.3) });
    if (s.prof) p1.drawText(s.prof, { x, y: y + 38, size: 7.5, font: f1, color: rgb(0.2, 0.3, 0.6) });
    if (s.note) p1.drawText(s.note, { x, y: y + 26, size: 7.5, font: fb1, color: rgb(0.8, 0.4, 0.0) });
    p1.drawText(s.room, { x, y: y + 10, size: 9, font: fb1, color: rgb(0.8, 0.1, 0.1) });
  }
  fs.writeFileSync(path.join(samplesDir, 'planning_FM1_semaine_05_10_2026.pdf'), await pdf1.save());

  // 2. ESI ING GI (Header Room: CD114)
  const pdf2 = await PDFDocument.create();
  const { page: p2, font: f2, fontBold: fb2 } = await createGridPage(pdf2, "GÉNIE INFORMATIQUE - 1ère ANNÉE (ING GI)", "ING GI", "Semaine du 05/10/2026 au 10/10/2026", "CD114");
  const esiSessions = [
    { dayIdx: 0, rowIdx: 0, title: "Algorithmique Avancée", session: "(6/12)", prof: "Pr. HASSANI", note: "TD" },
    { dayIdx: 0, rowIdx: 1, title: "Architecture des Ordinateurs", session: "(5/12)", prof: "Pr. BOUZIANE", note: "" },
    { dayIdx: 1, rowIdx: 1, title: "Bases de Données Relationnelles", session: "(7/12)", prof: "Pr. CHRAIBI", note: "" },
    { dayIdx: 1, rowIdx: 2, title: "Systèmes d'Exploitation Linux", session: "(4/10)", prof: "Pr. HASSANI", note: "TP Salle CD114" },
    { dayIdx: 2, rowIdx: 0, title: "Mathématiques pour l'Ingénieur", session: "(9/14)", prof: "Pr. OUAKKAS", note: "CC N°1" },
    { dayIdx: 3, rowIdx: 0, title: "Programmation Web", session: "(8/12)", prof: "Pr. CHRAIBI", note: "" },
    { dayIdx: 3, rowIdx: 1, title: "Réseaux Informatiques", session: "(6/12)", prof: "Pr. MEKOUAR", note: "" },
    { dayIdx: 4, rowIdx: 0, title: "Anglais Professionnel", session: "(5/10)", prof: "Mme SMITH", note: "" },
    { dayIdx: 4, rowIdx: 1, title: "Recherche Opérationnelle", session: "(6/12)", prof: "Pr. OUAKKAS", note: "" }
  ];
  for (const s of esiSessions) {
    const x = startX + timeColWidth + s.dayIdx * colWidth + 5;
    const y = startY - headerHeight - (s.rowIdx + 1) * rowHeight + 5;
    p2.drawText(s.title, { x, y: y + 62, size: 8, font: fb2 });
    if (s.session) p2.drawText(`Séance ${s.session}`, { x, y: y + 50, size: 7.5, font: f2, color: rgb(0.3, 0.3, 0.3) });
    if (s.prof) p2.drawText(s.prof, { x, y: y + 38, size: 7.5, font: f2, color: rgb(0.2, 0.3, 0.6) });
    if (s.note) p2.drawText(s.note, { x, y: y + 26, size: 7.5, font: fb2, color: rgb(0.8, 0.4, 0.0) });
  }
  fs.writeFileSync(path.join(samplesDir, 'planning_ESI_ING_GI_semaine_05_10_2026.pdf'), await pdf2.save());

  // 3. FSS (IP & KIN)
  const pdf3 = await PDFDocument.create();
  const { page: p3, font: f3, fontBold: fb3 } = await createGridPage(pdf3, "SCIENCES DE LA SANTÉ : IP & KIN", "IP & KIN", "Semaine du 05/10/2026 au 10/10/2026");
  const fssSessions = [
    { dayIdx: 0, rowIdx: 0, title: "Anatomie Générale", session: "(7/12)", prof: "Pr. EL OMARI", room: "AMPHI 4", note: "Tronc Commun" },
    { dayIdx: 2, rowIdx: 2, title: "Physiologie Humaine", session: "(5/12)", prof: "Pr. IDRISSI", room: "AMPHI 4", note: "" },
    { dayIdx: 3, rowIdx: 0, title: "Microbiologie & Hygiène", session: "(6/10)", prof: "Pr. ZOUHAIR", room: "AMPHI 2", note: "" },
    { dayIdx: 3, rowIdx: 2, title: "Secourisme & Soins d'Urgence", session: "(3/8)", prof: "Dr. BENANI", room: "AMPHI 4", note: "TD Pratique" },
    { dayIdx: 4, rowIdx: 2, title: "Pharmacologie Générale", session: "(4/10)", prof: "Pr. BENNIS", room: "AMPHI 4", note: "" }
  ];
  for (const s of fssSessions) {
    const x = startX + timeColWidth + s.dayIdx * colWidth + 5;
    const y = startY - headerHeight - (s.rowIdx + 1) * rowHeight + 5;
    p3.drawText(s.title, { x, y: y + 62, size: 8, font: fb3 });
    if (s.session) p3.drawText(`Séance ${s.session}`, { x, y: y + 50, size: 7.5, font: f3, color: rgb(0.3, 0.3, 0.3) });
    if (s.prof) p3.drawText(s.prof, { x, y: y + 38, size: 7.5, font: f3, color: rgb(0.2, 0.3, 0.6) });
    if (s.note) p3.drawText(s.note, { x, y: y + 26, size: 7.5, font: fb3, color: rgb(0.8, 0.4, 0.0) });
    p3.drawText(s.room, { x, y: y + 10, size: 9, font: fb3, color: rgb(0.8, 0.1, 0.1) });
  }
  fs.writeFileSync(path.join(samplesDir, 'planning_FSS_IP_KIN_semaine_05_10_2026.pdf'), await pdf3.save());

  // 4. FM2 (Semaine suivante : 12/10/2026 au 17/10/2026)
  const pdf4 = await PDFDocument.create();
  const { page: p4, font: f4, fontBold: fb4 } = await createGridPage(pdf4, "MÉDECINE 2ème ANNÉE (FM2)", "FM2", "Semaine du 12/10/2026 au 17/10/2026");
  const fm2Sessions = [
    { dayIdx: 0, rowIdx: 0, title: "Sémiologie Médicale", session: "(2/12)", prof: "Pr. BENCHEKROUN", room: "AMPHI 1", note: "" },
    { dayIdx: 0, rowIdx: 1, title: "Anatomopathologie", session: "(3/10)", prof: "Pr. KABBAJ", room: "AMPHI 1", note: "" },
    { dayIdx: 1, rowIdx: 0, title: "Immunologie Fondamentale", session: "(5/12)", prof: "Pr. ALAOUI", room: "AMPHI 4", note: "" },
    { dayIdx: 2, rowIdx: 1, title: "Pharmacologie Clinique", session: "(4/10)", prof: "Pr. BENNIS", room: "AMPHI 4", note: "CC N°1" },
    { dayIdx: 3, rowIdx: 0, title: "Génétique Médicale", session: "(3/8)", prof: "Pr. CHERKAOUI", room: "CD115", note: "" }
  ];
  for (const s of fm2Sessions) {
    const x = startX + timeColWidth + s.dayIdx * colWidth + 5;
    const y = startY - headerHeight - (s.rowIdx + 1) * rowHeight + 5;
    p4.drawText(s.title, { x, y: y + 62, size: 8, font: fb4 });
    if (s.session) p4.drawText(`Séance ${s.session}`, { x, y: y + 50, size: 7.5, font: f4, color: rgb(0.3, 0.3, 0.3) });
    if (s.prof) p4.drawText(s.prof, { x, y: y + 38, size: 7.5, font: f4, color: rgb(0.2, 0.3, 0.6) });
    if (s.note) p4.drawText(s.note, { x, y: y + 26, size: 7.5, font: fb4, color: rgb(0.8, 0.4, 0.0) });
    p4.drawText(s.room, { x, y: y + 10, size: 9, font: fb4, color: rgb(0.8, 0.1, 0.1) });
  }
  fs.writeFileSync(path.join(samplesDir, 'planning_FM2_semaine_12_10_2026.pdf'), await pdf4.save());

  console.log("Generated 4 diverse sample PDFs across multiple weeks and rooms in public/samples/");
}

generateSamplePdfs();
