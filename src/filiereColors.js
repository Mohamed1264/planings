// Configuration des couleurs et styles fixes par filière UM6SS Dakhla
// + Générateur dynamique pour toute filière inconnue ou nouvelle

export const KNOWN_PALETTES = {
  FM1: {
    label: "Médecine 1ère Année",
    code: "FM1",
    bg: "#ffe4e6",
    text: "#9f1239",
    border: "#e11d48",
    badgeBg: "rgba(225, 29, 72, 0.12)",
    darkBg: "rgba(225, 29, 72, 0.22)",
    darkText: "#fda4af"
  },
  FM2: {
    label: "Médecine 2ème Année",
    code: "FM2",
    bg: "#fce7f3",
    text: "#831843",
    border: "#db2777",
    badgeBg: "rgba(219, 39, 119, 0.12)",
    darkBg: "rgba(219, 39, 119, 0.22)",
    darkText: "#f9a8d4"
  },
  FM3: {
    label: "Médecine 3ème Année",
    code: "FM3",
    bg: "#fdf2f8",
    text: "#701a75",
    border: "#c026d3",
    badgeBg: "rgba(192, 38, 211, 0.12)",
    darkBg: "rgba(192, 38, 211, 0.22)",
    darkText: "#f0abfc"
  },
  FM4: {
    label: "Médecine 4ème Année",
    code: "FM4",
    bg: "#fae8ff",
    text: "#6b21a8",
    border: "#a855f7",
    badgeBg: "rgba(168, 85, 247, 0.12)",
    darkBg: "rgba(168, 85, 247, 0.22)",
    darkText: "#d8b4fe"
  },
  FM5: {
    label: "Médecine 5ème Année",
    code: "FM5",
    bg: "#f3e8ff",
    text: "#581c87",
    border: "#9333ea",
    badgeBg: "rgba(147, 51, 234, 0.12)",
    darkBg: "rgba(147, 51, 234, 0.22)",
    darkText: "#e9d5ff"
  },
  "ING GI": {
    label: "Génie Informatique",
    code: "ING GI",
    bg: "#e0f2fe",
    text: "#075985",
    border: "#0284c7",
    badgeBg: "rgba(2, 132, 199, 0.12)",
    darkBg: "rgba(2, 132, 199, 0.22)",
    darkText: "#7dd3fc"
  },
  "ING GC": {
    label: "Génie Civil",
    code: "ING GC",
    bg: "#e2e8f0",
    text: "#334155",
    border: "#475569",
    badgeBg: "rgba(71, 85, 105, 0.12)",
    darkBg: "rgba(71, 85, 105, 0.22)",
    darkText: "#cbd5e1"
  },
  CPI1: {
    label: "Prépa Intégrée 1",
    code: "CPI1",
    bg: "#ede9fe",
    text: "#5b21b6",
    border: "#7c3aed",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    darkBg: "rgba(124, 58, 237, 0.22)",
    darkText: "#c4b5fd"
  },
  CPI2: {
    label: "Prépa Intégrée 2",
    code: "CPI2",
    bg: "#e0e7ff",
    text: "#3730a3",
    border: "#4f46e5",
    badgeBg: "rgba(79, 70, 229, 0.12)",
    darkBg: "rgba(79, 70, 229, 0.22)",
    darkText: "#a5b4fc"
  },
  IP: {
    label: "Infirmier Polyvalent",
    code: "IP",
    bg: "#d1fae5",
    text: "#065f46",
    border: "#059669",
    badgeBg: "rgba(5, 150, 105, 0.12)",
    darkBg: "rgba(5, 150, 105, 0.22)",
    darkText: "#6ee7b7"
  },
  KIN: {
    label: "Kinésithérapie",
    code: "KIN",
    bg: "#ccfbf1",
    text: "#115e59",
    border: "#0d9488",
    badgeBg: "rgba(13, 148, 136, 0.12)",
    darkBg: "rgba(13, 148, 136, 0.22)",
    darkText: "#5eead4"
  },
  IAR: {
    label: "Anesthésie Réanimation",
    code: "IAR",
    bg: "#ffedd5",
    text: "#9a3412",
    border: "#ea580c",
    badgeBg: "rgba(234, 88, 12, 0.12)",
    darkBg: "rgba(234, 88, 12, 0.22)",
    darkText: "#fdba74"
  },
  IBO: {
    label: "Ingénierie Biomédicale",
    code: "IBO",
    bg: "#fae8ff",
    text: "#86198f",
    border: "#a21caf",
    badgeBg: "rgba(162, 28, 175, 0.12)",
    darkBg: "rgba(162, 28, 175, 0.22)",
    darkText: "#f5d0fe"
  },
  LINF: {
    label: "Sciences Infirmières",
    code: "LINF",
    bg: "#f3e8ff",
    text: "#6b21a8",
    border: "#9333ea",
    badgeBg: "rgba(147, 51, 234, 0.12)",
    darkBg: "rgba(147, 51, 234, 0.22)",
    darkText: "#d8b4fe"
  },
  PHARMA: {
    label: "Pharmacie",
    code: "PHARMA",
    bg: "#fef3c7",
    text: "#92400e",
    border: "#d97706",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    darkBg: "rgba(217, 119, 6, 0.22)",
    darkText: "#fcd34d"
  },
  DENTAIRE: {
    label: "Médecine Dentaire",
    code: "DENTAIRE",
    bg: "#cffafe",
    text: "#155e75",
    border: "#0891b2",
    badgeBg: "rgba(8, 145, 178, 0.12)",
    darkBg: "rgba(8, 145, 178, 0.22)",
    darkText: "#67e8f9"
  }
};

/**
 * Génère une couleur déterministe à partir du nom d'une filière inconnue
 */
function generateDynamicColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return {
    label: str,
    code: str,
    bg: `hsl(${h}, 85%, 96%)`,
    text: `hsl(${h}, 85%, 25%)`,
    border: `hsl(${h}, 70%, 45%)`,
    badgeBg: `hsla(${h}, 70%, 45%, 0.12)`,
    darkBg: `hsla(${h}, 70%, 45%, 0.25)`,
    darkText: `hsl(${h}, 80%, 75%)`
  };
}

export function getFiliereStyle(filiereCode) {
  if (!filiereCode) {
    return {
      label: "Générale",
      code: "GEN",
      bg: "#f1f5f9",
      text: "#334155",
      border: "#64748b",
      badgeBg: "rgba(100, 116, 139, 0.12)",
      darkBg: "rgba(100, 116, 139, 0.22)",
      darkText: "#cbd5e1"
    };
  }

  const upper = filiereCode.toUpperCase().trim();
  for (const [key, val] of Object.entries(KNOWN_PALETTES)) {
    if (upper === key || upper.includes(key)) {
      return val;
    }
  }

  return generateDynamicColor(filiereCode);
}
