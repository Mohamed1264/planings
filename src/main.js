import { parsePdfFile, normalizeRoomName } from './pdfParser.js';
import { consolidateSessionsForRoom } from './consolidator.js';
import { renderTimetableSection } from './timetableRenderer.js';
import { exportToExcel, exportStandaloneHtml } from './exporter.js';
import { loadSamplePdfs } from './demoData.js';

// État Global de l'application
const state = {
  uploadedFiles: [], // { name, parsedData }
  allSessions: [],
  detectedRooms: new Map(), // roomName -> count
  detectedWeeks: new Set(), // distinct "start - end"
  selectedWeek: "ALL", // "ALL" ou "start - end"
  selectedRooms: [],
  isMultiSelect: false,
  theme: localStorage.getItem('theme') || 'auto'
};

// Éléments du DOM
const dropzone = document.getElementById('dropzone');
const pdfFileInput = document.getElementById('pdfFileInput');
const btnLoadSamples = document.getElementById('btnLoadSamples');
const btnClearAll = document.getElementById('btnClearAll');

const batchProgressContainer = document.getElementById('batchProgressContainer');
const batchProgressLabel = document.getElementById('batchProgressLabel');
const batchProgressPercent = document.getElementById('batchProgressPercent');
const batchProgressBar = document.getElementById('batchProgressBar');

const batchMetricsBar = document.getElementById('batchMetricsBar');
const metricFilesCount = document.getElementById('metricFilesCount');
const metricWeeksCount = document.getElementById('metricWeeksCount');
const metricRoomsCount = document.getElementById('metricRoomsCount');
const metricSessionsCount = document.getElementById('metricSessionsCount');

const uploadedFilesTray = document.getElementById('uploadedFilesTray');
const roomsProposalPanel = document.getElementById('roomsProposalPanel');
const roomsChipsGrid = document.getElementById('roomsChipsGrid');
const roomSearchInput = document.getElementById('roomSearchInput');
const multiSelectToggle = document.getElementById('multiSelectToggle');

const weekFilterWrapper = document.getElementById('weekFilterWrapper');
const weekSelectFilter = document.getElementById('weekSelectFilter');

const globalActionsBar = document.getElementById('globalActionsBar');
const activeRoomDisplay = document.getElementById('activeRoomDisplay');
const activeSessionsCount = document.getElementById('activeSessionsCount');
const timetablesContainer = document.getElementById('timetablesContainer');
const initialWelcomePrompt = document.getElementById('initialWelcomePrompt');

const btnPrintGlobal = document.getElementById('btnPrintGlobal');
const btnExcelGlobal = document.getElementById('btnExcelGlobal');
const btnHtmlGlobal = document.getElementById('btnHtmlGlobal');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

// Initialisation
initTheme();
setupEventListeners();

function setupEventListeners() {
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Drag & drop
  dropzone.addEventListener('click', () => pdfFileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove('drag-over'));
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesBatch(Array.from(e.dataTransfer.files));
    }
  });

  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesBatch(Array.from(e.target.files));
      pdfFileInput.value = ''; // Reset input
    }
  });

  // Charger les démos
  btnLoadSamples.addEventListener('click', async () => {
    updateProgress(0, 3, "Chargement des exemples types UM6SS...");
    try {
      const parsedDemos = await loadSamplePdfs((msg) => {
        batchProgressLabel.textContent = msg;
      });
      for (const p of parsedDemos) {
        addParsedDocument(p);
      }
      refreshStateAndUI();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du chargement des exemples.");
    } finally {
      hideProgress();
    }
  });

  // Tout effacer
  btnClearAll.addEventListener('click', () => {
    state.uploadedFiles = [];
    state.allSessions = [];
    state.detectedRooms.clear();
    state.detectedWeeks.clear();
    state.selectedWeek = "ALL";
    state.selectedRooms = [];
    refreshStateAndUI();
  });

  // Recherche de salle
  roomSearchInput.addEventListener('input', () => {
    renderRoomChips();
  });

  // Filtre par semaine
  weekSelectFilter.addEventListener('change', (e) => {
    state.selectedWeek = e.target.value;
    refreshRoomsForSelectedWeek();
    renderRoomChips();
    renderTimetables();
  });

  // Mode sélection multiple
  multiSelectToggle.addEventListener('change', (e) => {
    state.isMultiSelect = e.target.checked;
    if (!state.isMultiSelect && state.selectedRooms.length > 1) {
      state.selectedRooms = [state.selectedRooms[0]];
    }
    renderRoomChips();
    renderTimetables();
  });

  // Exports Globaux
  btnPrintGlobal.addEventListener('click', () => window.print());
  
  btnExcelGlobal.addEventListener('click', () => {
    if (state.selectedRooms.length === 0) return;
    const filterW = state.selectedWeek !== "ALL" ? state.selectedWeek : null;
    state.selectedRooms.forEach(room => {
      const data = consolidateSessionsForRoom(state.allSessions, room, filterW);
      exportToExcel(data, data.weekRange);
    });
  });

  btnHtmlGlobal.addEventListener('click', () => {
    if (state.selectedRooms.length === 0) return;
    const content = timetablesContainer.innerHTML;
    const title = state.selectedRooms.length === 1 
      ? `Emploi du temps - ${state.selectedRooms[0]}` 
      : `Emplois du temps - Salles ${state.selectedRooms.join(', ')}`;
    exportStandaloneHtml(content, title);
  });

  // Délégation de clics pour boutons d'actions individuels
  timetablesContainer.addEventListener('click', (e) => {
    const btnPrint = e.target.closest('.btn-print-single');
    if (btnPrint) {
      window.print();
      return;
    }

    const btnExcel = e.target.closest('.btn-excel-single');
    if (btnExcel) {
      const room = btnExcel.getAttribute('data-room');
      const filterW = state.selectedWeek !== "ALL" ? state.selectedWeek : null;
      const data = consolidateSessionsForRoom(state.allSessions, room, filterW);
      exportToExcel(data, data.weekRange);
    }
  });
}

/**
 * Traite dynamiquement un lot quelconque de fichiers PDF (même en grand nombre : 10, 20, 50+)
 */
async function handleFilesBatch(files) {
  const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (pdfFiles.length === 0) {
    alert("Veuillez sélectionner des fichiers au format PDF.");
    return;
  }

  const total = pdfFiles.length;
  updateProgress(0, total, `Démarrage de l'analyse (${total} fichiers)...`);

  for (let i = 0; i < total; i++) {
    const file = pdfFiles[i];
    updateProgress(i + 1, total, `Lecture de ${file.name} (${i + 1}/${total})...`);
    
    try {
      const parsed = await parsePdfFile(file, file.name);
      addParsedDocument(parsed);
    } catch (err) {
      console.warn(`Erreur lors de la lecture du fichier ${file.name}:`, err);
    }

    // Petite pause de 5ms pour laisser le navigateur rafraîchir la barre de progression
    await new Promise(r => setTimeout(r, 5));
  }

  hideProgress();
  refreshStateAndUI();
}

function updateProgress(current, total, label) {
  batchProgressContainer.style.display = 'block';
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  batchProgressBar.style.width = `${percent}%`;
  batchProgressPercent.textContent = `${percent}%`;
  batchProgressLabel.textContent = label;
}

function hideProgress() {
  setTimeout(() => {
    batchProgressContainer.style.display = 'none';
    batchProgressBar.style.width = '0%';
  }, 400);
}

/**
 * Enregistre un document analysé dans l'état sans doublons
 */
function addParsedDocument(parsed) {
  const exists = state.uploadedFiles.some(f => f.name === parsed.fileName);
  if (!exists) {
    state.uploadedFiles.push({
      name: parsed.fileName,
      parsedData: parsed
    });
  }

  // Enregistrer la semaine détectée
  if (parsed.week && parsed.week.start && parsed.week.end) {
    const wKey = `${parsed.week.start} - ${parsed.week.end}`;
    state.detectedWeeks.add(wKey);
  }
}

/**
 * Recalcule dynamiquement toutes les données suite à l'ajout ou la suppression de fichiers
 */
function refreshStateAndUI() {
  state.allSessions = [];
  state.detectedWeeks.clear();

  for (const file of state.uploadedFiles) {
    const p = file.parsedData;
    state.allSessions.push(...p.allSessions);
    if (p.week && p.week.start && p.week.end) {
      state.detectedWeeks.add(`${p.week.start} - ${p.week.end}`);
    }
  }

  // Mettre à jour le sélecteur de semaines
  updateWeekSelectFilter();

  // Recalculer les salles selon la semaine choisie
  refreshRoomsForSelectedWeek();

  // Sélection automatique initiale de la salle principale si aucune sélectionnée
  if (state.detectedRooms.size > 0 && state.selectedRooms.length === 0) {
    const sorted = Array.from(state.detectedRooms.entries()).sort((a, b) => b[1] - a[1]);
    state.selectedRooms = [sorted[0][0]];
  } else if (state.detectedRooms.size === 0) {
    state.selectedRooms = [];
  }

  renderMetricsBar();
  renderUploadedFilesTray();
  renderRoomChips();
  renderTimetables();
}

/**
 * Recalcule les salles pour la semaine actuellement filtrée
 */
function refreshRoomsForSelectedWeek() {
  state.detectedRooms.clear();
  const filterW = state.selectedWeek !== "ALL" ? state.selectedWeek : null;

  for (const sess of state.allSessions) {
    if (filterW && sess.weekRange && sess.weekRange.start) {
      const sessWeekKey = `${sess.weekRange.start} - ${sess.weekRange.end}`;
      if (sessWeekKey !== filterW) continue;
    }

    if (sess.room) {
      const norm = normalizeRoomName(sess.room);
      const curr = state.detectedRooms.get(norm) || 0;
      state.detectedRooms.set(norm, curr + 1);
    }
  }

  // Filtrer les salles sélectionnées qui n'existeraient plus
  if (state.detectedRooms.size > 0) {
    state.selectedRooms = state.selectedRooms.filter(r => state.detectedRooms.has(r));
    if (state.selectedRooms.length === 0) {
      const sorted = Array.from(state.detectedRooms.entries()).sort((a, b) => b[1] - a[1]);
      state.selectedRooms = [sorted[0][0]];
    }
  }
}

/**
 * Remplit le dropdown des semaines détectées
 */
function updateWeekSelectFilter() {
  const weeksList = Array.from(state.detectedWeeks);
  if (weeksList.length > 1) {
    weekFilterWrapper.style.display = 'flex';
    weekSelectFilter.innerHTML = `
      <option value="ALL" ${state.selectedWeek === 'ALL' ? 'selected' : ''}>Toutes les semaines (${weeksList.length} détectées)</option>
      ${weeksList.map(w => `<option value="${w}" ${state.selectedWeek === w ? 'selected' : ''}>📅 Semaine du ${w.replace(' - ', ' au ')}</option>`).join('')}
    `;
  } else if (weeksList.length === 1) {
    weekFilterWrapper.style.display = 'none';
    state.selectedWeek = weeksList[0];
  } else {
    weekFilterWrapper.style.display = 'none';
    state.selectedWeek = "ALL";
  }
}

/**
 * Affiche la barre des compteurs métriques
 */
function renderMetricsBar() {
  if (state.uploadedFiles.length === 0) {
    batchMetricsBar.style.display = 'none';
    return;
  }
  batchMetricsBar.style.display = 'flex';
  metricFilesCount.textContent = state.uploadedFiles.length;
  metricWeeksCount.textContent = state.detectedWeeks.size || 1;
  metricRoomsCount.textContent = state.detectedRooms.size;
  metricSessionsCount.textContent = state.allSessions.length;
}

/**
 * Affiche la liste des fichiers chargés dans l'interface
 */
function renderUploadedFilesTray() {
  if (state.uploadedFiles.length === 0) {
    uploadedFilesTray.style.display = 'none';
    btnClearAll.style.display = 'none';
    roomsProposalPanel.style.display = 'none';
    globalActionsBar.style.display = 'none';
    initialWelcomePrompt.style.display = 'block';
    return;
  }

  uploadedFilesTray.style.display = 'flex';
  btnClearAll.style.display = 'inline-flex';
  roomsProposalPanel.style.display = 'flex';
  globalActionsBar.style.display = 'flex';
  initialWelcomePrompt.style.display = 'none';

  uploadedFilesTray.innerHTML = state.uploadedFiles.map((file, idx) => {
    const p = file.parsedData;
    const weekDisplay = (p.week && p.week.start) ? `${p.week.start}` : "Date auto";
    return `
      <div class="file-item-pill">
        <div class="file-pill-left">
          <span class="file-pdf-icon">📄</span>
          <span class="file-name-text">${escapeHtml(file.name)}</span>
          <span class="file-meta-tag">${escapeHtml(p.filiere)}</span>
          <span class="file-meta-tag">📅 ${escapeHtml(weekDisplay)}</span>
          <span class="file-meta-tag">${p.numPages} p.</span>
          <span class="file-meta-tag">${p.allSessions.length} séances</span>
        </div>
        <button class="file-delete-btn" data-index="${idx}" title="Retirer ce fichier">✕</button>
      </div>
    `;
  }).join('');

  uploadedFilesTray.querySelectorAll('.file-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      state.uploadedFiles.splice(idx, 1);
      refreshStateAndUI();
    });
  });
}

/**
 * Affiche les badges des salles détectées pour que l'utilisateur choisisse
 */
function renderRoomChips() {
  const searchTerm = (roomSearchInput.value || "").trim().toLowerCase();
  const roomsEntries = Array.from(state.detectedRooms.entries())
    .sort((a, b) => b[1] - a[1]);

  const filtered = roomsEntries.filter(([roomName]) => 
    roomName.toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    roomsChipsGrid.innerHTML = `
      <div style="font-size: 13px; color: var(--text-subtle); padding: 8px 0;">
        ${searchTerm ? `Aucune salle correspondant à "${escapeHtml(searchTerm)}"` : "Aucune salle détectée dans les fichiers sélectionnés."}
      </div>
    `;
    return;
  }

  roomsChipsGrid.innerHTML = filtered.map(([roomName, count]) => {
    const isSelected = state.selectedRooms.includes(roomName);
    return `
      <button class="room-chip-btn ${isSelected ? 'active' : ''}" data-room="${escapeHtml(roomName)}">
        <span class="room-icon">🏛️</span>
        <span class="room-title-span">${escapeHtml(roomName)}</span>
        <span class="room-count-badge">${count} séance${count > 1 ? 's' : ''}</span>
      </button>
    `;
  }).join('');

  roomsChipsGrid.querySelectorAll('.room-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.getAttribute('data-room');
      if (state.isMultiSelect) {
        if (state.selectedRooms.includes(room)) {
          state.selectedRooms = state.selectedRooms.filter(r => r !== room);
        } else {
          state.selectedRooms.push(room);
        }
      } else {
        state.selectedRooms = [room];
      }
      renderRoomChips();
      renderTimetables();
    });
  });
}

/**
 * Génère et affiche les sections d'emploi du temps pour les salles sélectionnées
 */
function renderTimetables() {
  if (state.selectedRooms.length === 0) {
    activeRoomDisplay.textContent = "Aucune salle sélectionnée";
    activeSessionsCount.textContent = "";
    timetablesContainer.innerHTML = `
      <div class="timetable-section empty-state">
        <div style="text-align: center; padding: 30px;">
          <h3>Sélectionnez une salle ci-dessus</h3>
          <p style="color: var(--text-subtle);">Cliquez sur l'un des badges pour afficher l'emploi du temps de la salle correspondante.</p>
        </div>
      </div>
    `;
    return;
  }

  activeRoomDisplay.textContent = state.selectedRooms.join(" & ");

  const filterW = state.selectedWeek !== "ALL" ? state.selectedWeek : null;
  let totalSessionsActive = 0;

  const sectionsHtml = state.selectedRooms.map(room => {
    const consolidated = consolidateSessionsForRoom(state.allSessions, room, filterW);
    totalSessionsActive += consolidated.totalCount;
    return renderTimetableSection(consolidated, consolidated.weekRange);
  }).join("\n");

  activeSessionsCount.textContent = `(${totalSessionsActive} séance${totalSessionsActive > 1 ? 's' : ''} au total)`;
  timetablesContainer.innerHTML = sectionsHtml;
}

function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    root.classList.add('dark');
    themeIcon.textContent = '🌙';
  } else if (saved === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    themeIcon.textContent = '☀️';
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeIcon.textContent = prefersDark ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark') || 
    (!root.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
    themeIcon.textContent = '☀️';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    themeIcon.textContent = '🌙';
  }
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
