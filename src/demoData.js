import { parsePdfFile } from './pdfParser.js';

export const SAMPLE_FILES = [
  {
    name: "planning_um6ss_infirmier_polyvalent.pdf",
    path: "/samples/planning_um6ss_infirmier_polyvalent.pdf",
    label: "Format Officiel UM6SS – Infirmier Polyvalent (Amphi 4 & Amphi 5)"
  },
  {
    name: "planning_FM1_semaine_05_10_2026.pdf",
    path: "/samples/planning_FM1_semaine_05_10_2026.pdf",
    label: "Faculté de Médecine – FM1 (Amphi 4 & CD114)"
  },
  {
    name: "planning_ESI_ING_GI_semaine_05_10_2026.pdf",
    path: "/samples/planning_ESI_ING_GI_semaine_05_10_2026.pdf",
    label: "École Supérieure d'Ingénieurs – ING GI (Salle CD114)"
  },
  {
    name: "planning_FM2_semaine_12_10_2026.pdf",
    path: "/samples/planning_FM2_semaine_12_10_2026.pdf",
    label: "Faculté de Médecine – FM2 (Amphi 1 & Amphi 4)"
  }
];

export async function loadSamplePdfs(onProgress) {
  const parsedResults = [];
  for (let i = 0; i < SAMPLE_FILES.length; i++) {
    const item = SAMPLE_FILES[i];
    if (onProgress) onProgress(`Chargement de ${item.name} (${i + 1}/${SAMPLE_FILES.length})...`);
    
    try {
      const response = await fetch(item.path);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const buffer = await response.arrayBuffer();
      const parsed = await parsePdfFile(buffer, item.name);
      parsedResults.push(parsed);
    } catch (e) {
      console.error(`Error loading sample ${item.name}:`, e);
    }
  }
  return parsedResults;
}
