// sidepanel.js — Side Panel UI Logic
'use strict';

let socialMediaItems = [];

const lazyModuleSources = {
  zip: ['lib/zip.js'],
  gdrive: ['lib/gdrive.js'],
  email: ['lib/email.js'],
  extract: ['lib/extract.js'],
  docx: ['lib/docx.js'],
  emailClient: [
    'lib/emailClientStorage.js',
    'lib/emailClientOAuth.js',
    'lib/emailClientGmailApi.js',
    'lib/emailClientGraphApi.js',
    'lib/emailClientImapBridge.js',
    'emailclient.js'
  ]
};
const lazyModulePromises = new Map();

function loadLazyScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(`sidepanel/${source}`);
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Não foi possível carregar ${source}.`));
    document.head.appendChild(script);
  });
}

function ensureLazyModules(...modules) {
  return Promise.all(modules.flatMap((moduleName) => {
    if (!lazyModulePromises.has(moduleName)) {
      const sources = lazyModuleSources[moduleName] || [];
      lazyModulePromises.set(moduleName, sources.reduce(
        (promise, source) => promise.then(() => loadLazyScript(source)),
        Promise.resolve()
      ));
    }
    return lazyModulePromises.get(moduleName);
  }));
}

// ── DOM refs ─────────────────────────────────────────────────────────────
const btnAddToggle   = document.getElementById('btn-add-toggle');
const btnSettings    = document.getElementById('btn-settings');
const btnSaveCurrentPage = document.getElementById('btn-save-current-page');
const addPanel       = document.getElementById('add-panel');
const inputUrl       = document.getElementById('input-url');
const inputTitle     = document.getElementById('input-title');
const btnSave        = document.getElementById('btn-save');
const btnCancel      = document.getElementById('btn-cancel');
const addError       = document.getElementById('add-error');
const inputCategory  = document.getElementById('input-category');
const categoryNameInput = document.getElementById('category-name-input');
const btnAddCategory = document.getElementById('btn-add-category');
const categoryStatus = document.getElementById('category-status');

const pagesList      = document.getElementById('pages-list');
const emptyState     = document.getElementById('empty-state');
const pagesListContainer = document.getElementById('pages-list-container');
const browserUrlForm  = document.getElementById('browser-url-form');
const browserUrlInput = document.getElementById('browser-url-input');
const browserDropHint = document.getElementById('browser-drop-hint');

const viewerContainer= document.getElementById('viewer-container');
const pageIframe     = document.getElementById('page-iframe');
const viewerTitle    = document.getElementById('viewer-title');
const btnBack        = document.getElementById('btn-back');
const btnRestorePage  = document.getElementById('btn-restore-page');
const viewerUrlForm  = document.getElementById('viewer-url-form');
const viewerUrlInput = document.getElementById('viewer-url-input');
const btnOpenTab     = document.getElementById('btn-open-tab');
const viewerLoading  = document.getElementById('viewer-loading');
const viewerError    = document.getElementById('viewer-error');
const viewerErrorMsg = document.getElementById('viewer-error-msg');
const viewerOpenLink = document.getElementById('viewer-open-link');

const homeMenu       = document.getElementById('home-menu');
const btnHomeBack    = document.getElementById('btn-home-back');
const headerTitle    = document.getElementById('header-title');

const pagesView      = document.getElementById('pages-view');
const notesView      = document.getElementById('notes-view');
const exportView     = document.getElementById('export-view');
const downloaderView = document.getElementById('downloader-view');
const shortenerView  = document.getElementById('shortener-view');
const savedTabsView  = document.getElementById('savedtabs-view');
const ctxMenuView    = document.getElementById('contextmenu-view');
const settingsView   = document.getElementById('settings-view');
const savePageCurrent = document.getElementById('savepage-current');
const savePageRaw = document.getElementById('savepage-save-raw');
const savePageStatus = document.getElementById('savepage-status');
const extensionDownloaderView = document.getElementById('extensiondownloader-view');
const extensionUrlInput = document.getElementById('extension-url-input');
const extensionDownloaderStatus = document.getElementById('extension-downloader-status');
const extensionDownloadCrx = document.getElementById('extension-download-crx');
const extensionDownloadZip = document.getElementById('extension-download-zip');
const extensionViewSource = document.getElementById('extension-view-source');
const settingsThemeSelect = document.getElementById('settings-theme-select');
const settingsExport = document.getElementById('settings-export');
const settingsImport = document.getElementById('settings-import');
const settingsImportFile = document.getElementById('settings-import-file');
const settingsBackupStatus = document.getElementById('settings-backup-status');
const settingsExtraStatus = document.getElementById('settings-extra-status');

const btnNewNote     = document.getElementById('btn-new-note');
const notesList      = document.getElementById('notes-list');
const notesEmptyState= document.getElementById('notes-empty-state');

// Saved tabs view
const btnSaveCurrentTab   = document.getElementById('btn-save-current-tab');
const btnSaveAllTabs      = document.getElementById('btn-save-all-tabs');
const savedTabsList       = document.getElementById('savedtabs-list');
const savedTabsEmptyState = document.getElementById('savedtabs-empty-state');

// Context menu rules view
const ctxTitleInput      = document.getElementById('ctxmenu-title-input');
const ctxUrlInput        = document.getElementById('ctxmenu-url-input');
const ctxContextsBar     = document.getElementById('ctxmenu-contexts');
const btnAddCtxRule      = document.getElementById('btn-add-ctxmenu-rule');
const ctxStatus          = document.getElementById('ctxmenu-status');
const ctxList            = document.getElementById('ctxmenu-list');
const ctxEmptyState      = document.getElementById('ctxmenu-empty-state');

// Automação view
const autoView               = document.getElementById('automacao-view');
const autoSubnavSegmented    = document.getElementById('auto-subnav-segmented');
const autoPanelList          = document.getElementById('auto-panel-list');
const autoPanelRecord        = document.getElementById('auto-panel-record');
const autoPanelAi            = document.getElementById('auto-panel-ai');
const autoPanelSettings      = document.getElementById('auto-panel-settings');
const autoEmptyState         = document.getElementById('auto-empty-state');
const autoList                = document.getElementById('auto-list');
const autoRecordIdle          = document.getElementById('auto-record-idle');
const autoRecordActive        = document.getElementById('auto-record-active');
const btnAutoStartRecord      = document.getElementById('btn-auto-start-record');
const autoRecordStepsList     = document.getElementById('auto-record-steps');
const autoRecordNameInput     = document.getElementById('auto-record-name');
const btnAutoStopSave         = document.getElementById('btn-auto-stop-save');
const btnAutoCancelRecord     = document.getElementById('btn-auto-cancel-record');
const autoRecordStatus        = document.getElementById('auto-record-status');
const autoAiInstructionInput  = document.getElementById('auto-ai-instruction');
const autoAiNameInput         = document.getElementById('auto-ai-name');
const btnAutoAiGenerate       = document.getElementById('btn-auto-ai-generate');
const autoAiStatus            = document.getElementById('auto-ai-status');
const autoProviderSelect      = document.getElementById('auto-provider-select');
const autoModelInput          = document.getElementById('auto-model-input');
const autoApiKeyInput         = document.getElementById('auto-apikey-input');
const btnAutoSaveSettings     = document.getElementById('btn-auto-save-settings');
const autoSettingsStatus      = document.getElementById('auto-settings-status');

let automations = [];
let autoRecording = false;
let autoCurrentSteps = [];

// Addresses view
const addrLabelInput     = document.getElementById('addr-label-input');
const addrNameInput      = document.getElementById('addr-name-input');
const addrStreetInput    = document.getElementById('addr-street-input');
const addrNeighborhoodInput = document.getElementById('addr-neighborhood-input');
const addrCityInput      = document.getElementById('addr-city-input');
const addrStateInput     = document.getElementById('addr-state-input');
const addrZipInput       = document.getElementById('addr-zip-input');
const addrPhoneInput     = document.getElementById('addr-phone-input');
const btnAddAddress      = document.getElementById('btn-add-address');
const addrStatus         = document.getElementById('addr-status');
const addressesList      = document.getElementById('addresses-list');
const addressesEmptyState= document.getElementById('addresses-empty-state');

// Google Drive view
const gdriveLoginPanel      = document.getElementById('gdrive-login-panel');
const gdriveSettingsPanel   = document.getElementById('gdrive-settings-panel');
const gdriveBrowserPanel    = document.getElementById('gdrive-browser-panel');
const btnGdriveLogin        = document.getElementById('btn-gdrive-login');
const btnGdriveGotoSettings = document.getElementById('btn-gdrive-goto-settings');
const gdriveLoginStatus     = document.getElementById('gdrive-login-status');
const gdriveRedirectUri     = document.getElementById('gdrive-redirect-uri');
const btnGdriveCopyRedirect = document.getElementById('btn-gdrive-copy-redirect');
const gdriveClientIdInput   = document.getElementById('gdrive-client-id-input');
const btnGdriveSaveSettings = document.getElementById('btn-gdrive-save-settings');
const btnGdriveBackSettings = document.getElementById('btn-gdrive-back-settings');
const gdriveSettingsStatus  = document.getElementById('gdrive-settings-status');
const gdriveAvatar          = document.getElementById('gdrive-avatar');
const gdriveUserName        = document.getElementById('gdrive-user-name');
const gdriveUserEmail       = document.getElementById('gdrive-user-email');
const btnGdriveRefresh      = document.getElementById('btn-gdrive-refresh');
const btnGdriveLogout       = document.getElementById('btn-gdrive-logout');
const gdriveQuotaFill       = document.getElementById('gdrive-quota-fill');
const gdriveQuotaLabel      = document.getElementById('gdrive-quota-label');
const gdriveSearchInput     = document.getElementById('gdrive-search-input');
const gdriveFilterPills     = document.getElementById('gdrive-filter-pills');
const gdriveBreadcrumbsEl   = document.getElementById('gdrive-breadcrumbs');
const gdriveEmptyState      = document.getElementById('gdrive-empty-state');
const gdriveEmptyText       = document.getElementById('gdrive-empty-text');
const gdriveFilesList       = document.getElementById('gdrive-files-list');

// Export view
const exportSourceSeg  = document.getElementById('export-source-segmented');
const exportUrlGroup   = document.getElementById('export-url-group');
const exportUrlInput   = document.getElementById('export-url-input');
const exportHint       = document.getElementById('export-hint');
const btnExport        = document.getElementById('btn-export');
const exportStatus     = document.getElementById('export-status');

// Downloader view
const downloaderUrlInput = document.getElementById('downloader-url-input');
const btnDownload        = document.getElementById('btn-download');
const downloaderStatus   = document.getElementById('downloader-status');
const downloadsList      = document.getElementById('downloads-list');
const socialPageInfo = document.getElementById('social-page-info');
const socialStatus = document.getElementById('social-status');
const socialCount = document.getElementById('social-count');
const socialMediaList = document.getElementById('social-media-list');
const socialEmpty = document.getElementById('social-empty');
const socialRefresh = document.getElementById('social-refresh');
const socialSelectPage = document.getElementById('social-select-page');
const socialDownloadAll = document.getElementById('social-download-all');

// Shortener view
const shortenerUrlInput   = document.getElementById('shortener-url-input');
const btnShorten           = document.getElementById('btn-shorten');
const shortenerStatus      = document.getElementById('shortener-status');
const shortenerResult      = document.getElementById('shortener-result');
const shortenerResultInput = document.getElementById('shortener-result-input');
const btnCopyShort         = document.getElementById('btn-copy-short');
const shortenerHistoryEl   = document.getElementById('shortener-history');

// ── State ────────────────────────────────────────────────────────────────
let pages = [];
let pageCategories = [];
let activeId = null;
let addPanelOpen = false;
let pageEditingId = null;
let notes = [];
const saveTimers = {};
let exportSource = 'current';
let exportFormat = 'pdf';
let shortenerHistory = [];
let downloadHistory = [];
let savedTabs = [];
let contextRules = [];
let ctxSelectedContexts = ['page'];
let currentScreen = null;
const USER_SETTINGS_KEY = 'sidepanelUserSettings';
const userSettings = {
  lastScreen: null,
  theme: 'dark',
  exportSource: 'current',
  exportFormat: 'pdf',
  shortenerHistory: [],
  downloadHistory: [],
  activeCloudProvider: 'gdrive',
  gdriveFilter: 'all',
  gdriveSearchQuery: '',
  onedriveFilter: 'all',
  onedriveSearchQuery: '',
  lastShortenerUrl: '',
  lastDownloaderUrl: ''
};
const DEFAULT_MENU_SETTINGS = {
  browser: { confirmDelete: true, openLinksInNewTab: false },
  notes: { confirmDelete: true, includeDateOnExport: true },
  downloader: { autoDetectCurrentTab: false, filenamePrefix: 'social-media' },
  cloud: { rememberLastProvider: true, showHiddenFiles: false },
  automation: { confirmRun: false, saveExecutionHistory: true },
  email: { notifyNewMessages: true, markReadAfterOpen: false },
  social: { includeImages: true, includeVideos: true, includeAudio: false }
};
let menuSettings = structuredClone(DEFAULT_MENU_SETTINGS);

let addresses = [];
let addrEditingId = null;
let addrExpandedId = null;

// Google Drive
let gdriveFolderId = 'root';
let gdriveBreadcrumbs = [{ id: 'root', name: 'Meu Drive' }];
let gdriveSearchQuery = '';
let gdriveFilter = 'all';
let gdriveSearchDebounce = null;
let gdrivePrevPanel = 'login';

// ── Init ─────────────────────────────────────────────────────────────────
(async function init() {
  await Promise.all([
    loadUserSettings(),
    loadPageCategories(),
    loadPages()
  ]);
  renderList();

  // Check pending navigation from background/context menu
  try {
    const { pendingNavigation } = await chrome.storage.local.get('pendingNavigation');
    if (pendingNavigation && (Date.now() - pendingNavigation.timestamp < 15000)) {
      await chrome.storage.local.remove('pendingNavigation');
      await handleNavigation(pendingNavigation.screen, pendingNavigation.extraData);
    }

  } catch {}

  // Listen for updates pushed from the background (e.g. context menu pin, navigation)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PAGES_UPDATED') {
      loadPages().then(renderList);
    } else if (msg.type === 'NOTES_UPDATED') {
      loadNotes().then(renderNotes);
    } else if (msg.type === 'SAVEDTABS_UPDATED') {
      loadSavedTabs().then(renderSavedTabs);
    } else if (msg.type === 'NAVIGATE_TO') {
      handleNavigation(msg.screen, msg.extraData);
    }
  });

  if (userSettings.lastScreen && SCREEN_VIEWS[userSettings.lastScreen]) {
    await openScreen(userSettings.lastScreen);
    if (userSettings.lastScreen === 'gdrive' && userSettings.activeCloudProvider !== 'gdrive') {
      document.querySelector(`#cloud-provider-list [data-cloud="${userSettings.activeCloudProvider}"]`)?.click();
    }
  }
})();

async function loadUserSettings() {
  try {
    const data = await chrome.storage.local.get([USER_SETTINGS_KEY, 'extensionMenuSettings']);
    Object.assign(userSettings, data[USER_SETTINGS_KEY] || {});
    menuSettings = mergeMenuSettings(data.extensionMenuSettings);
    if (typeof data.includeImages === 'boolean') menuSettings.social.includeImages = data.includeImages;
    if (typeof data.includeVideos === 'boolean') menuSettings.social.includeVideos = data.includeVideos;
    if (typeof data.includeAudio === 'boolean') menuSettings.social.includeAudio = data.includeAudio;
    if (typeof data.filenamePrefix === 'string') menuSettings.downloader.filenamePrefix = data.filenamePrefix;
    applyTheme(userSettings.theme);
    exportSource = userSettings.exportSource;
    exportFormat = userSettings.exportFormat;
    shortenerHistory = Array.isArray(userSettings.shortenerHistory) ? userSettings.shortenerHistory : [];
    downloadHistory = Array.isArray(userSettings.downloadHistory) ? userSettings.downloadHistory : [];
    gdriveFilter = userSettings.gdriveFilter;
    gdriveSearchQuery = userSettings.gdriveSearchQuery;
    onedriveFilter = userSettings.onedriveFilter;
    onedriveSearchQuery = userSettings.onedriveSearchQuery;
    shortenerUrlInput.value = userSettings.lastShortenerUrl || '';
    downloaderUrlInput.value = userSettings.lastDownloaderUrl || '';
    [...exportSourceSeg.children].forEach(button => {
      button.classList.toggle('active', button.dataset.source === exportSource);
    });
    [...document.querySelectorAll('#export-view .format-chips .chip')].forEach(button => {
      button.classList.toggle('active', button.dataset.format === exportFormat);
    });
    renderShortenerHistory();
    renderDownloadHistory();
  } catch (error) {
    console.warn('Não foi possível carregar as preferências do painel.', error);
  }
}

let userSettingsSaveTimer;
function saveUserSettings(patch = {}) {
  Object.assign(userSettings, patch);
  clearTimeout(userSettingsSaveTimer);
  userSettingsSaveTimer = setTimeout(async () => {
    try {
      await chrome.storage.local.set({ [USER_SETTINGS_KEY]: { ...userSettings } });
    } catch (error) {
      console.warn('Não foi possível salvar as preferências do painel.', error);
    }
  }, 150);
}

// ── Screen navigation ──────────────────────────────────────────────────────
const SCREEN_VIEWS = {
  pages: pagesView,
  notes: notesView,
  savedtabs: savedTabsView,
  export: exportView,
  downloader: downloaderView,
  shortener: shortenerView,
  translator: document.getElementById('translator-view'),
  contextmenu: ctxMenuView,
  addresses: document.getElementById('addresses-view'),
  gdrive: document.getElementById('gdrive-view'),
  email: document.getElementById('email-view'),
  emailclient: document.getElementById('emailclient-view'),
  automacao: autoView,
  settings: settingsView,
  extensiondownloader: extensionDownloaderView
};
const SCREEN_TITLES = {
  pages: 'Navegador Web',
  notes: 'Notas',
  savedtabs: 'Abas Salvas',
  export: 'Exportar',
  downloader: 'Downloader',
  shortener: 'Encurtador de URL',
  translator: 'Tradutor',
  contextmenu: 'Menu de Contexto',
  addresses: 'Endereços',
  gdrive: 'Nuvem de Arquivos',
  email: 'E-mail Temporário',
  emailclient: 'Cliente de E-mail',
  automacao: 'Automação',
  settings: 'Configurações',
  extensiondownloader: 'Baixar Extensões'
};

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => openScreen(item.dataset.screen));
});

btnHomeBack.addEventListener('click', goHome);
btnSettings.addEventListener('click', () => openScreen('settings'));

const DOWNLOADER_MODES = { downloader: 'media', savepage: 'page', socialdownloader: 'social' };
const downloaderModeSelect = document.getElementById('downloader-mode');
async function setDownloaderMode(mode) {
  downloaderModeSelect.value = mode;
  ['media', 'page', 'social'].forEach(m => document.getElementById('dl-mode-' + m).classList.toggle('hidden', m !== mode));
  if (mode === 'page') setSavePageStatus('');
  if (mode === 'social') await scanSocialMedia();
}
downloaderModeSelect.addEventListener('change', () => setDownloaderMode(downloaderModeSelect.value));

async function openScreen(screen) {
  const dlMode = DOWNLOADER_MODES[screen];
  if (dlMode) {
    screen = 'downloader';
    await setDownloaderMode(dlMode);
  }
  currentScreen = screen;
  saveUserSettings({ lastScreen: screen });
  homeMenu.classList.add('hidden');
  Object.values(SCREEN_VIEWS).forEach(v => v.classList.add('hidden'));
  SCREEN_VIEWS[screen].classList.remove('hidden');

  headerTitle.textContent = SCREEN_TITLES[screen];
  btnHomeBack.classList.remove('hidden');
  btnAddToggle.classList.toggle('hidden', screen !== 'pages');
  btnSaveCurrentPage.classList.toggle('hidden', screen !== 'pages');
  btnSettings.classList.toggle('hidden', screen === 'settings');

  if (screen === 'notes' && notes.length === 0) {
    await loadNotes();
    renderNotes();
  }
  if (screen === 'savedtabs') {
    await loadSavedTabs();
    renderSavedTabs();
  }
  if (screen === 'contextmenu') {
    await loadContextRules();
    renderContextRules();
    await loadCcCommands();
    renderCcCommands();
  }
  if (screen === 'addresses') {
    await loadAddresses();
    renderAddresses();
  }
  if (screen === 'gdrive') {
    await ensureLazyModules('gdrive');
    await initGDriveScreen();
  }
  if (screen === 'email') {
    await ensureLazyModules('email');
    await initEmailScreen();
  }
  if (screen === 'emailclient') {
    await ensureLazyModules('emailClient');
    await initEmailClientScreen();
  }
  if (screen === 'automacao') {
    await loadAutomations();
    renderAutomations();
    await loadAutoSettingsIntoForm();
  }
  if (screen === 'settings') {
    renderSettings();
  }
  if (screen === 'extensiondownloader') {
    extensionDownloaderStatus.classList.add('hidden');
  }
}

async function handleNavigation(screen, extraData = {}) {
  if (!SCREEN_VIEWS[screen]) return;
  await openScreen(screen);

  if (screen === 'pages') {
    await loadPages();
    renderList();
    if (extraData.openUrl && /^https?:/i.test(extraData.openUrl)) {
      openInViewer({
        id: `temporary_${Date.now()}`,
        url: extraData.openUrl,
        currentUrl: extraData.openUrl,
        title: getDomain(extraData.openUrl),
        favicon: getFaviconUrl(extraData.openUrl),
        temporary: true
      });
    }
  } else if (screen === 'notes') {
    await loadNotes();
    renderNotes();
  } else if (screen === 'savedtabs') {
    await loadSavedTabs();
    renderSavedTabs();
  } else if (screen === 'export') {
    if (extraData.format === 'md') {
      const chip = document.querySelector('#export-view .format-chips .chip[data-format="md"]');
      chip?.click();
    }
  } else if (screen === 'downloader') {
    if (extraData.url) {
      const urlInput = document.getElementById('downloader-url-input');
      if (urlInput) {
        urlInput.value = extraData.url;
        if (extraData.autoDetect) {
          setTimeout(() => { document.getElementById('btn-download')?.click(); }, 200);
        }
      }
    }
  } else if (screen === 'shortener') {
    if (extraData.url) {
      const urlInput = document.getElementById('shortener-url-input');
      if (urlInput) {
        urlInput.value = extraData.url;
        if (extraData.autoShorten) {
          setTimeout(() => { document.getElementById('btn-shorten')?.click(); }, 200);
        }
      }
    }
  } else if (screen === 'automacao') {
    if (extraData.action === 'record') {
      const recordTabBtn = document.querySelector('#auto-subnav-segmented [data-autotab="record"]');
      recordTabBtn?.click();
      setTimeout(() => { btnAutoStartRecord?.click(); }, 200);
    }
  } else if (screen === 'gdrive') {
    if (extraData.provider === 'onedrive') {
      const oneDriveBtn = document.querySelector('#cloud-provider-list [data-cloud="onedrive"]');
      oneDriveBtn?.click();
    } else {
      const gdriveBtn = document.querySelector('#cloud-provider-list [data-cloud="gdrive"]');
      gdriveBtn?.click();
    }
  }
}

function goHome() {
  currentScreen = null;
  saveUserSettings({ lastScreen: null });
  Object.values(SCREEN_VIEWS).forEach(v => v.classList.add('hidden'));
  homeMenu.classList.remove('hidden');
  headerTitle.textContent = 'Barra Lateral Plus';
  btnHomeBack.classList.add('hidden');
  btnAddToggle.classList.add('hidden');
  btnSaveCurrentPage.classList.add('hidden');
  btnSettings.classList.remove('hidden');
  closeViewer();
}

function setSavePageStatus(message, type = '') {
  savePageStatus.textContent = message;
  savePageStatus.classList.toggle('hidden', !message);
  savePageStatus.classList.toggle('error', type === 'error');
  savePageStatus.classList.toggle('success', type === 'success');
}

async function saveCurrentWebPage() {
  savePageCurrent.disabled = true;
  setSavePageStatus('Capturando a página e incorporando recursos...');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SINGLEFILE_SAVE_PAGE',
      saveRawPage: savePageRaw.checked
    });
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível salvar a página.');
    setSavePageStatus('Página salva com sucesso.', 'success');
  } catch (error) {
    setSavePageStatus(error?.message || 'Não foi possível salvar a página.', 'error');
  } finally {
    savePageCurrent.disabled = false;
  }
}

savePageCurrent.addEventListener('click', saveCurrentWebPage);

function setExtensionDownloaderStatus(message, type = '') {
  extensionDownloaderStatus.textContent = message;
  extensionDownloaderStatus.classList.toggle('hidden', !message);
  extensionDownloaderStatus.classList.toggle('error', type === 'error');
  extensionDownloaderStatus.classList.toggle('success', type === 'success');
}

function getChromeExtensionId(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());
    if (!['chromewebstore.google.com', 'chrome.google.com'].includes(url.hostname)) return null;
    return url.pathname.match(/\/detail\/[^/]+\/([a-z0-9]{32})(?:[/?#]|$)/i)?.[1] || null;
  } catch {
    return null;
  }
}

async function runExtensionDownloadAction(action) {
  const id = getChromeExtensionId(extensionUrlInput.value);
  if (!id) {
    setExtensionDownloaderStatus('Cole uma URL válida da Chrome Web Store.', 'error');
    return;
  }
  extensionDownloadCrx.disabled = true;
  extensionDownloadZip.disabled = true;
  extensionViewSource.disabled = true;
  setExtensionDownloaderStatus('Processando solicitação...');
  try {
    const response = await chrome.runtime.sendMessage({ type: action, id });
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível concluir a operação.');
    setExtensionDownloaderStatus(
      action === 'EXTENSION_VIEW_SOURCE' ? 'O código-fonte foi aberto em uma nova aba.' : 'Download iniciado.',
      'success'
    );
  } catch (error) {
    setExtensionDownloaderStatus(error?.message || 'Não foi possível concluir a operação.', 'error');
  } finally {
    extensionDownloadCrx.disabled = false;
    extensionDownloadZip.disabled = false;
    extensionViewSource.disabled = false;
  }
}

extensionDownloadCrx.addEventListener('click', () => runExtensionDownloadAction('EXTENSION_DOWNLOAD_CRX'));
extensionDownloadZip.addEventListener('click', () => runExtensionDownloadAction('EXTENSION_DOWNLOAD_ZIP'));
extensionViewSource.addEventListener('click', () => runExtensionDownloadAction('EXTENSION_VIEW_SOURCE'));

function setSettingsStatus(element, message, type = '') {
  element.textContent = message;
  element.classList.toggle('hidden', !message);
  element.classList.toggle('error', type === 'error');
  element.classList.toggle('success', type === 'success');
}

function getSettingValue(path) {
  const [section, key] = path.split('.');
  return menuSettings[section]?.[key];
}

function setSettingValue(path, value) {
  const [section, key] = path.split('.');
  if (!menuSettings[section]) menuSettings[section] = {};
  menuSettings[section][key] = value;
}

function renderSettings() {
  settingsThemeSelect.value = userSettings.theme || 'dark';
  document.querySelectorAll('[data-setting]').forEach(input => {
    const value = getSettingValue(input.dataset.setting);
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else input.value = value ?? '';
  });
}

async function saveMenuSetting(input) {
  const value = input.type === 'checkbox' ? input.checked : input.value;
  setSettingValue(input.dataset.setting, value);
  const [section, key] = input.dataset.setting.split('.');
  const updates = { extensionMenuSettings: menuSettings };
  if (section === 'social') updates[{ includeImages: 'includeImages', includeVideos: 'includeVideos', includeAudio: 'includeAudio' }[key]] = value;
  if (section === 'downloader' && key === 'filenamePrefix') updates.filenamePrefix = value || 'social-media';
  await chrome.storage.local.set(updates);
  setSettingsStatus(settingsExtraStatus, 'Configuração salva.', 'success');
  window.setTimeout(() => setSettingsStatus(settingsExtraStatus, ''), 1800);
}

async function exportAllSettings() {
  try {
    const settings = await chrome.storage.local.get(null);
    const payload = {
      format: 'barra-lateral-plus-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: settings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `barra-lateral-plus-configuracoes-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSettingsStatus(settingsBackupStatus, 'Configurações exportadas com sucesso.', 'success');
  } catch (error) {
    setSettingsStatus(settingsBackupStatus, `Falha ao exportar: ${error.message}`, 'error');
  }
}

async function importAllSettings(file) {
  try {
    const payload = JSON.parse(await file.text());
    const data = payload?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Arquivo de backup inválido.');
    }
    await chrome.storage.local.clear();
    await chrome.storage.local.set(data);
    setSettingsStatus(settingsBackupStatus, 'Configurações importadas. Recarregando...', 'success');
    window.setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    setSettingsStatus(settingsBackupStatus, `Falha ao importar: ${error.message}`, 'error');
  } finally {
    settingsImportFile.value = '';
  }
}

settingsThemeSelect.addEventListener('change', async () => {
  userSettings.theme = settingsThemeSelect.value;
  applyTheme(userSettings.theme);
  await saveUserSettings({ theme: userSettings.theme });
});
settingsExport.addEventListener('click', exportAllSettings);
settingsImport.addEventListener('click', () => settingsImportFile.click());
settingsImportFile.addEventListener('change', () => {
  if (settingsImportFile.files[0]) importAllSettings(settingsImportFile.files[0]);
});
document.querySelectorAll('[data-setting]').forEach(input => {
  input.addEventListener('change', () => saveMenuSetting(input));
});
document.querySelectorAll('[data-settings-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-settings-tab]').forEach(item => item.classList.toggle('active', item === tab));
    document.querySelectorAll('[data-settings-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.settingsPanel !== tab.dataset.settingsTab);
    });
  });
});

// ── Load from storage via background ─────────────────────────────────────
async function loadPages() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_PAGES' });
    pages = res?.pages ?? [];
  } catch (e) {
    pages = [];
  }
}

async function loadPageCategories() {
  try {
    const data = await chrome.storage.local.get('pageCategories');
    pageCategories = Array.isArray(data.pageCategories) ? data.pageCategories : [];
  } catch {
    pageCategories = [];
  }
  renderCategorySelect();
}

async function savePageCategories() {
  await chrome.storage.local.set({ pageCategories });
}

function renderCategorySelect(selectedId = inputCategory?.value || '') {
  if (!inputCategory) return;
  inputCategory.innerHTML = '<option value="">Sem categoria</option>' +
    pageCategories.map(category => `<option value="${escHtml(category.id)}">${escHtml(category.name)}</option>`).join('');
  inputCategory.value = selectedId;
}

function setCategoryStatus(message, kind = '') {
  categoryStatus.textContent = message;
  categoryStatus.className = `status-msg${kind ? ` ${kind}` : ''}`;
  categoryStatus.classList.remove('hidden');
}

async function addPageCategory() {
  const name = categoryNameInput.value.trim();
  if (!name) return setCategoryStatus('Informe o nome da categoria.', 'error');
  if (pageCategories.some(category => category.name.toLowerCase() === name.toLowerCase())) {
    return setCategoryStatus('Essa categoria já existe.', 'error');
  }
  btnAddCategory.disabled = true;
  try {
    const category = { id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name, expanded: true };
    pageCategories.push(category);
    await savePageCategories();
    categoryNameInput.value = '';
    renderCategorySelect();
    renderList();
    setCategoryStatus('Categoria criada.', 'success');
  } catch (error) {
    pageCategories = pageCategories.filter(category => category.name !== name);
    console.error('Erro ao criar categoria', error);
    setCategoryStatus('Não foi possível salvar a categoria. Tente novamente.', 'error');
  } finally {
    btnAddCategory.disabled = false;
  }
}

btnAddCategory?.addEventListener('click', addPageCategory);

categoryNameInput?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addPageCategory();
  }
});

// ── Render list ───────────────────────────────────────────────────────────
function renderList() {
  pagesList.innerHTML = '';

  if (pages.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  function openBrowserUrl(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) {
      browserUrlInput.setCustomValidity('Digite uma URL válida.');
      browserUrlInput.reportValidity();
      return;
    }
    browserUrlInput.setCustomValidity('');
    browserUrlInput.value = url;
    openInViewer({
      id: `temporary_${Date.now()}`,
      url,
      currentUrl: url,
      title: getDomain(url),
      favicon: getFaviconUrl(url),
      temporary: true
    });
  }

  browserUrlForm?.addEventListener('submit', event => {
    event.preventDefault();
    openBrowserUrl(browserUrlInput.value);
  });

  viewerUrlForm?.addEventListener('submit', event => {
    event.preventDefault();
    openBrowserUrl(viewerUrlInput.value);
  });

  pagesListContainer?.addEventListener('dragover', event => {
    if (event.dataTransfer?.types.includes('text/uri-list') || event.dataTransfer?.types.includes('text/plain')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      pagesListContainer.classList.add('drag-over');
    }
  });

  pagesListContainer?.addEventListener('dragleave', event => {
    if (!pagesListContainer.contains(event.relatedTarget)) {
      pagesListContainer.classList.remove('drag-over');
    }
  });

  pagesListContainer?.addEventListener('drop', event => {
    event.preventDefault();
    pagesListContainer.classList.remove('drag-over');
    const droppedUrl = event.dataTransfer.getData('text/uri-list') ||
      event.dataTransfer.getData('text/plain');
    if (droppedUrl) openBrowserUrl(droppedUrl.split(/\r?\n/)[0].trim());
  });

  viewerContainer?.addEventListener('dragover', event => {
    if (event.dataTransfer?.types.includes('text/uri-list') || event.dataTransfer?.types.includes('text/plain')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      viewerContainer.classList.add('drag-over');
    }
  });

  viewerContainer?.addEventListener('dragleave', event => {
    if (!viewerContainer.contains(event.relatedTarget)) {
      viewerContainer.classList.remove('drag-over');
    }
  });

  viewerContainer?.addEventListener('drop', event => {
    event.preventDefault();
    viewerContainer.classList.remove('drag-over');
    const droppedUrl = event.dataTransfer.getData('text/uri-list') ||
      event.dataTransfer.getData('text/plain');
    if (droppedUrl) openBrowserUrl(droppedUrl.split(/\r?\n/)[0].trim());
  });
  emptyState.classList.add('hidden');

  const groups = [
    { id: null, name: 'Sem categoria', expanded: true, pages: pages.filter(page => !page.categoryId) },
    ...pageCategories.map(category => ({
      ...category,
      pages: pages.filter(page => page.categoryId === category.id)
    }))
  ].filter(group => group.pages.length || group.id !== null);

  let itemIndex = 0;
  groups.forEach(group => {
    const section = document.createElement('li');
    section.className = 'page-category';
    const expanded = group.expanded !== false;
    section.innerHTML = `
      <div class="page-category-header">
        <button class="page-category-toggle" aria-expanded="${expanded}">
          <span class="page-category-chevron">${expanded ? '▾' : '▸'}</span>
          <span class="page-category-name">${escHtml(group.name)}</span>
          <span class="page-category-count">${group.pages.length}</span>
        </button>
        ${group.id ? `<button class="page-category-rename" title="Renomear categoria">Editar</button>
        <button class="page-category-delete" title="Excluir categoria">Excluir</button>` : ''}
      </div>
      <ul class="page-category-pages ${expanded ? '' : 'hidden'}"></ul>
    `;
    const categoryPages = section.querySelector('.page-category-pages');
    section.querySelector('.page-category-toggle').addEventListener('click', async () => {
      group.expanded = !group.expanded;
      if (group.id) {
        const stored = pageCategories.find(category => category.id === group.id);
        if (stored) stored.expanded = group.expanded;
        await savePageCategories();
      }
      renderList();
    });
    section.querySelector('.page-category-rename')?.addEventListener('click', async () => {
      const name = prompt('Nome da categoria:', group.name)?.trim();
      if (!name || name === group.name) return;
      const stored = pageCategories.find(category => category.id === group.id);
      if (stored) {
        stored.name = name;
        await savePageCategories();
        renderCategorySelect(inputCategory.value);
        renderList();
      }
    });
    section.querySelector('.page-category-delete')?.addEventListener('click', async () => {
      if (!confirm(`Excluir a categoria "${group.name}"? As páginas ficarão sem categoria.`)) return;
      pages = pages.map(page => page.categoryId === group.id ? { ...page, categoryId: null } : page);
      await chrome.runtime.sendMessage({ type: 'REORDER_PAGES', pages });
      pageCategories = pageCategories.filter(category => category.id !== group.id);
      await savePageCategories();
      renderCategorySelect();
      renderList();
    });

    group.pages.forEach(page => {
    const li = document.createElement('li');
    li.className = 'page-item';
    li.dataset.id = page.id;
    li.setAttribute('role', 'listitem');
    li.style.animationDelay = `${itemIndex++ * 40}ms`;

    if (page.id === activeId) li.classList.add('active');

    const faviconSrc = page.favicon || getFaviconUrl(page.url);

    li.innerHTML = `
      <img class="page-favicon" src="${escHtml(faviconSrc)}" alt="" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect width=%2224%22 height=%2224%22 rx=%224%22 fill=%22%23333%22/><text x=%2212%22 y=%2217%22 text-anchor=%22middle%22 fill=%22%23aaa%22 font-size=%2213%22>🌐</text></svg>'" />
      <div class="page-info">
        <span class="page-title">${escHtml(page.title || page.url)}</span>
        <span class="page-url">${escHtml(getDomain(page.url))}</span>
      </div>
      <div class="page-actions">
        <button class="page-action-btn open-tab-btn" title="Abrir em nova aba" data-url="${escHtml(page.url)}" aria-label="Abrir em nova aba">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
        <button class="page-action-btn edit-btn" title="Editar" data-id="${escHtml(page.id)}" aria-label="Editar página">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/>
          </svg>
        </button>
        <button class="page-action-btn delete-btn" title="Remover" data-id="${escHtml(page.id)}" aria-label="Remover página">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    `;

    // Click on the item body → open in iframe
    li.addEventListener('click', (e) => {
      if (e.target.closest('.page-action-btn')) return;
      openInViewer(page);
    });

    // Open in new tab
    li.querySelector('.open-tab-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: page.url });
    });

    // Edit
    li.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openAddPanelForEdit(page);
    });

    // Delete
    li.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePage(page.id);
    });

    categoryPages.appendChild(li);
  });
    pagesList.appendChild(section);
  });
}

// ── Add Panel toggle ──────────────────────────────────────────────────────
btnAddToggle.addEventListener('click', () => {
  addPanelOpen = !addPanelOpen;
  btnAddToggle.classList.toggle('active', addPanelOpen);

  if (addPanelOpen) {
    addPanel.classList.remove('hidden');
    inputUrl.focus();
  } else {
    closeAddPanel();
  }
});

btnCancel.addEventListener('click', () => {
  addPanelOpen = false;
  btnAddToggle.classList.remove('active');
  closeAddPanel();
});

function closeAddPanel() {
  addPanel.classList.add('hidden');
  inputUrl.value = '';
  inputTitle.value = '';
  inputCategory.value = '';
  pageEditingId = null;
  document.querySelector('.add-panel-title').textContent = 'Nova página fixada';
  btnSave.querySelector('span').textContent = 'Fixar página';
  hideError();
}

function openAddPanelForEdit(page) {
  pageEditingId = page.id;
  inputUrl.value = page.url;
  inputTitle.value = page.title || '';
  renderCategorySelect(page.categoryId || '');
  document.querySelector('.add-panel-title').textContent = 'Editar página';
  btnSave.querySelector('span').textContent = 'Salvar alterações';
  addPanelOpen = true;
  btnAddToggle.classList.add('active');
  addPanel.classList.remove('hidden');
  inputUrl.focus();
}

// ── Save current active tab as a pinned page ────────────────────────────────
btnSaveCurrentPage.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    await chrome.runtime.sendMessage({
      type: 'ADD_PAGE',
      page: { url: tab.url, title: tab.title || getDomain(tab.url), favicon: tab.favIconUrl || getFaviconUrl(tab.url), categoryId: inputCategory.value || null }
    });
    await loadPages();
    renderList();
  } catch (err) {
    console.error('Erro ao salvar aba atual', err);
  }
});

// ── Save new page ─────────────────────────────────────────────────────────
btnSave.addEventListener('click', savePage);

inputUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePage();
});

inputTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePage();
});

async function savePage() {
  const rawUrl = inputUrl.value.trim();
  if (!rawUrl) { showError('Por favor, insira uma URL.'); return; }

  let url;
  try {
    // Auto-prefix https:// if needed
    const prefixed = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    url = new URL(prefixed).href;
  } catch {
    showError('URL inválida. Exemplo: https://exemplo.com');
    return;
  }

  const title = inputTitle.value.trim() || getDomain(url);

  btnSave.disabled = true;
  const savingLabel = pageEditingId ? 'Salvando alterações…' : 'Salvando…';
  btnSave.querySelector('span').textContent = savingLabel;

  try {
    if (pageEditingId) {
      await chrome.runtime.sendMessage({ type: 'UPDATE_PAGE', id: pageEditingId, updates: { url, title, favicon: getFaviconUrl(url), categoryId: inputCategory.value || null } });
    } else {
      await chrome.runtime.sendMessage({ type: 'ADD_PAGE', page: { url, title, favicon: getFaviconUrl(url), categoryId: inputCategory.value || null } });
    }
    await loadPages();
    renderList();
    addPanelOpen = false;
    btnAddToggle.classList.remove('active');
    closeAddPanel();
  } catch (err) {
    showError('Erro ao salvar. Tente novamente.');
  } finally {
    btnSave.disabled = false;
  }
}

function showError(msg) {
  addError.textContent = msg;
  addError.classList.remove('hidden');
}

function hideError() {
  addError.classList.add('hidden');
  addError.textContent = '';
}

// ── Delete page ───────────────────────────────────────────────────────────
async function deletePage(id) {
  await chrome.runtime.sendMessage({ type: 'REMOVE_PAGE', id });

  // If currently viewing that page, close viewer
  if (activeId === id) {
    closeViewer();
  }

  await loadPages();
  renderList();
}

// ── Viewer ────────────────────────────────────────────────────────────────
function openInViewer(page) {
  activeId = page.id;
  renderList(); // mark active item

  viewerTitle.textContent = page.title || getDomain(page.url);
  viewerUrlInput.value = page.currentUrl || page.url;
  btnOpenTab.href = page.currentUrl || page.url;
  viewerOpenLink.href = page.currentUrl || page.url;
  btnRestorePage.classList.toggle('hidden', page.temporary || !(page.currentUrl && page.currentUrl !== page.url));

  viewerError.classList.add('hidden');
  viewerLoading.classList.remove('hidden');
  pageIframe.src = '';

  viewerContainer.classList.remove('hidden');

  const initialUrl = page.currentUrl || page.url;
  if (isAuthenticationPage(initialUrl)) {
    viewerLoading.classList.add('hidden');
    showViewerError(initialUrl, 'Esta é uma página de autenticação e será aberta em uma aba completa do navegador.');
    chrome.tabs.create({ url: initialUrl }).catch(() => {});
    return;
  }

  pageIframe.onerror = () => {
    viewerLoading.classList.add('hidden');
    showViewerError(page.currentUrl || page.url);
  };

  // Timeout: if site refuses to load in iframe (X-Frame-Options)
  const timeout = setTimeout(() => {
    try {
      // Try to detect blank/cross-origin block by checking contentDocument
      if (!pageIframe.contentDocument || pageIframe.contentDocument.body?.innerHTML === '') {
        showViewerError(page.url, 'Este site não pode ser carregado em iframe. Abra em uma nova aba.');
      }
    } catch {
      // cross-origin – probably loaded fine
    }
  }, 6000);

  pageIframe.onload = () => {
    clearTimeout(timeout);
    viewerLoading.classList.add('hidden');
    viewerError.classList.add('hidden');
    const navigatedUrl = getViewerUrl();
    if (!navigatedUrl || navigatedUrl === 'about:blank') return;
    if (!page.temporary && page.currentUrl !== navigatedUrl) {
      page.currentUrl = navigatedUrl;
      chrome.runtime.sendMessage({
        type: 'UPDATE_PAGE',
        id: page.id,
        updates: { currentUrl: navigatedUrl }
      }).catch(() => {});
    }

    function getViewerUrl() {
      try {
        return pageIframe.contentWindow.location.href || pageIframe.src;
      } catch {
        return pageIframe.src;
      }
    }
    btnOpenTab.href = navigatedUrl;
    viewerOpenLink.href = navigatedUrl;
    viewerUrlInput.value = navigatedUrl;
    btnRestorePage.classList.toggle('hidden', page.temporary || navigatedUrl === page.url);
  };

  // Set src after wiring up events
  pageIframe.src = initialUrl;
  chrome.runtime.sendMessage({ type: 'CHECK_PAGE_ACCESS', url: initialUrl }).then(access => {
    if (activeId !== page.id || !access?.ok) return;
    if (isAuthenticationPage(access.finalUrl)) {
      pageIframe.src = '';
      showViewerError(access.finalUrl, 'A página redirecionou para autenticação e será aberta em uma aba completa do navegador.');
      chrome.tabs.create({ url: access.finalUrl }).catch(() => {});
    }
  }).catch(() => {});
}

function isAuthenticationPage(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = `${url.pathname}${url.search}`.toLowerCase();
    return /(^|\.)accounts\.google\.com$|(^|\.)login\.microsoftonline\.com$|(^|\.)auth\.|(^|\.)okta\./.test(host)
      || /(^|[/_.-])(login|signin|sign-in|oauth|authorize|authorization|authentication|sso|account)([/_.?=&-]|$)/.test(path);
  } catch {
    return false;
  }
}

function showViewerError(url, msg) {
  viewerLoading.classList.add('hidden');
  viewerErrorMsg.textContent = msg || 'Não foi possível carregar este site dentro do painel.';
  viewerOpenLink.href = url;
  viewerError.classList.remove('hidden');
}

function closeViewer() {
  activeId = null;
  pageIframe.src = '';
  viewerContainer.classList.add('hidden');
  renderList();
}

btnBack.addEventListener('click', closeViewer);

btnRestorePage.addEventListener('click', async () => {
  const page = pages.find(item => item.id === activeId);
  if (!page) return;
  page.currentUrl = page.url;
  await chrome.runtime.sendMessage({ type: 'UPDATE_PAGE', id: page.id, updates: { currentUrl: page.url } });
  pageIframe.src = page.url;
  btnOpenTab.href = page.url;
  viewerOpenLink.href = page.url;
  btnRestorePage.classList.add('hidden');
});

// ── Notes ────────────────────────────────────────────────────────────────
async function loadNotes() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
    notes = res?.notes ?? [];
  } catch (e) {
    notes = [];
  }
}

function renderNotes() {
  notesList.innerHTML = '';

  if (notes.length === 0) {
    notesEmptyState.classList.remove('hidden');
    return;
  }
  notesEmptyState.classList.add('hidden');

  notes.forEach((note, index) => {
    const li = document.createElement('li');
    li.className = 'note-item';
    li.dataset.id = note.id;
    li.setAttribute('role', 'listitem');
    li.style.animationDelay = `${index * 40}ms`;

    li.innerHTML = `
      <div class="note-header">
        <input class="note-title-input" type="text" placeholder="Título (opcional)" value="${escHtml(note.title)}" />
        <div class="note-actions">
          <button class="page-action-btn note-copy-btn" title="Copiar conteúdo" aria-label="Copiar conteúdo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <button class="page-action-btn note-share-btn" title="Compartilhar nota" aria-label="Compartilhar nota">
            <span aria-hidden="true">↗</span>
          </button>
          <button class="page-action-btn note-export-btn" title="Exportar nota" aria-label="Exportar nota">
            <span aria-hidden="true">⇩</span>
          </button>
          <button class="page-action-btn delete-btn note-delete-btn" title="Excluir nota" aria-label="Excluir nota">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="note-export-menu hidden" role="menu">
        <button type="button" data-note-format="docx">DOCX</button>
        <button type="button" data-note-format="pdf">PDF</button>
        <button type="button" data-note-format="md">Markdown</button>
        <button type="button" data-note-format="json">JSON</button>
      </div>
      <textarea class="note-content-input" placeholder="Escreva sua anotação…">${escHtml(note.content)}</textarea>
      <span class="note-meta">Atualizado em ${formatDate(note.updatedAt)}</span>
    `;

    const titleInput   = li.querySelector('.note-title-input');
    const contentInput = li.querySelector('.note-content-input');
    const meta         = li.querySelector('.note-meta');

    const scheduleSave = () => {
      clearTimeout(saveTimers[note.id]);
      saveTimers[note.id] = setTimeout(async () => {
        const updates = { title: titleInput.value, content: contentInput.value };
        await chrome.runtime.sendMessage({ type: 'UPDATE_NOTE', id: note.id, updates });
        note.title = updates.title;
        note.content = updates.content;
        note.updatedAt = Date.now();
        meta.textContent = `Atualizado em ${formatDate(note.updatedAt)}`;
      }, 500);
    };

    titleInput.addEventListener('input', scheduleSave);
    contentInput.addEventListener('input', scheduleSave);

    li.querySelector('.note-copy-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(contentInput.value);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
      } catch {}
    });

    li.querySelector('.note-share-btn').addEventListener('click', async () => {
      await shareNote(note, titleInput.value, contentInput.value);
    });

    const exportMenu = li.querySelector('.note-export-menu');
    li.querySelector('.note-export-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.note-export-menu').forEach(menu => {
        if (menu !== exportMenu) menu.classList.add('hidden');
      });
      exportMenu.classList.toggle('hidden');
    });
    exportMenu.querySelectorAll('[data-note-format]').forEach(button => {
      button.addEventListener('click', async () => {
        exportMenu.classList.add('hidden');
        try {
          await exportNote(note, titleInput.value, contentInput.value, button.dataset.noteFormat);
        } catch (error) {
          console.error('Erro ao exportar nota', error);
          setCategoryStatus('Não foi possível exportar a nota.', 'error');
        }
      });
    });

    li.querySelector('.note-delete-btn').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'REMOVE_NOTE', id: note.id });
      notes = notes.filter(n => n.id !== note.id);
      renderNotes();
    });

    notesList.appendChild(li);
  });
}

document.addEventListener('click', event => {
  if (!event.target.closest('.note-export-menu, .note-export-btn')) {
    document.querySelectorAll('.note-export-menu').forEach(menu => menu.classList.add('hidden'));
  }
});

function noteBlocks(title, content) {
  return String(content || '').split(/\r?\n/).map(text => ({ type: text.trim() ? 'p' : 'hr', text }));
}

function noteMarkdown(title, content) {
  return `${title ? `# ${title}\n\n` : ''}${content || ''}\n`;
}

function noteHtml(title, content) {
  const paragraphs = String(content || '').split(/\r?\n/).map(line =>
    line.trim() ? `<p>${escHtml(line)}</p>` : '<br>'
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title || 'Nota')}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;line-height:1.6}h1{font-size:24px}p{white-space:pre-wrap}</style>
    </head><body>${title ? `<h1>${escHtml(title)}</h1>` : ''}${paragraphs}</body></html>`;
}

async function shareNote(note, title, content) {
  const text = noteMarkdown(title, content);
  try {
    if (navigator.share) {
      await navigator.share({ title: title || 'Nota', text });
    } else {
      await navigator.clipboard.writeText(text);
      setCategoryStatus('Nota copiada para compartilhar.', 'success');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') console.warn('Erro ao compartilhar nota', error);
  }
}

async function exportNote(note, title, content, format) {
  const filename = slugify(title || 'nota');
  if (format === 'pdf') {
    const response = await chrome.runtime.sendMessage({ type: 'PRINT_NOTE', html: noteHtml(title, content) });
    if (!response?.ok) throw new Error('Não foi possível abrir a impressão.');
    return;
  }

  let blob;
  let extension = format;
  if (format === 'json') {
    blob = new Blob([JSON.stringify({
      id: note.id,
      title: title || '',
      content: content || '',
      updatedAt: note.updatedAt
    }, null, 2)], { type: 'application/json' });
  } else if (format === 'md') {
    blob = new Blob([noteMarkdown(title, content)], { type: 'text/markdown' });
  } else {
    await ensureLazyModules('extract', 'docx', 'zip');
    const bodyXml = window.PagePinExtract.blocksToDocxBody(noteBlocks(title, content), title);
    blob = window.PagePinDocx.buildDocxBlob(bodyXml);
    extension = 'docx';
  }
  const objectUrl = URL.createObjectURL(blob);
  await chrome.downloads.download({ url: objectUrl, filename: `${filename}.${extension}`, saveAs: true });
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

btnNewNote.addEventListener('click', async () => {
  const res = await chrome.runtime.sendMessage({ type: 'ADD_NOTE', note: { title: '', content: '' } });
  notes.unshift(res.note);
  renderNotes();
  const firstTextarea = notesList.querySelector('.note-item .note-title-input');
  firstTextarea?.focus();
});

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Export ───────────────────────────────────────────────────────────────
exportSourceSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  exportSource = btn.dataset.source;
  saveUserSettings({ exportSource });
  [...exportSourceSeg.children].forEach(b => b.classList.toggle('active', b === btn));
  exportUrlGroup.classList.toggle('hidden', exportSource !== 'link');
});

document.querySelectorAll('#export-view .format-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    exportFormat = chip.dataset.format;
    saveUserSettings({ exportFormat });
    document.querySelectorAll('#export-view .format-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
    exportHint.textContent = exportFormat === 'pdf'
      ? 'O PDF é gerado pela caixa de impressão do navegador — escolha "Salvar como PDF" no destino.'
      : exportFormat === 'docx'
        ? 'Gera um .docx com a estrutura básica do conteúdo (títulos, parágrafos, listas).'
        : 'Gera um arquivo .md com a estrutura básica do conteúdo (títulos, parágrafos, listas).';
  });
});

function slugify(str) {
  return (str || 'pagina')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'pagina';
}

function setExportStatus(msg, kind) {
  exportStatus.textContent = msg;
  exportStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  exportStatus.classList.remove('hidden');
}

btnExport.addEventListener('click', async () => {
  btnExport.disabled = true;
  try {
    if (exportFormat === 'pdf') {
      await exportAsPdf();
    } else {
      await exportAsMdOrDocx();
    }
  } catch (err) {
    setExportStatus('Erro ao exportar: ' + (err?.message || err), 'error');
  } finally {
    btnExport.disabled = false;
  }
});

async function exportAsPdf() {
  setExportStatus('Abrindo a caixa de impressão…');
  if (exportSource === 'current') {
    const { tab } = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    if (!tab) return setExportStatus('Nenhuma aba ativa encontrada.', 'error');
    const res = await chrome.runtime.sendMessage({ type: 'PRINT_TAB', tabId: tab.id });
    if (!res.ok) return setExportStatus('Não foi possível imprimir esta aba: ' + res.error, 'error');
    setExportStatus('Escolha "Salvar como PDF" na caixa de impressão que abriu na aba.', 'success');
  } else {
    const url = normalizeUrl(exportUrlInput.value);
    if (!url) return setExportStatus('Insira uma URL válida.', 'error');
    const opened = await chrome.runtime.sendMessage({ type: 'OPEN_TAB_FOR_EXPORT', url });
    if (!opened.ok) return setExportStatus('Não foi possível abrir a página: ' + opened.error, 'error');
    const res = await chrome.runtime.sendMessage({ type: 'PRINT_TAB', tabId: opened.tabId });
    if (!res.ok) return setExportStatus('Não foi possível imprimir a página: ' + res.error, 'error');
    setExportStatus('Escolha "Salvar como PDF" na caixa de impressão que abriu em uma nova aba.', 'success');
  }
}

async function exportAsMdOrDocx() {
  await ensureLazyModules('extract', 'docx', 'zip');
  setExportStatus('Extraindo conteúdo…');
  let html, baseUrl, title;

  if (exportSource === 'current') {
    const { tab } = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    if (!tab) return setExportStatus('Nenhuma aba ativa encontrada.', 'error');
    const res = await chrome.runtime.sendMessage({ type: 'GET_TAB_HTML', tabId: tab.id });
    if (!res.ok) return setExportStatus('Não foi possível ler esta aba: ' + res.error, 'error');
    html = res.html;
    baseUrl = tab.url;
    title = tab.title;
  } else {
    const url = normalizeUrl(exportUrlInput.value);
    if (!url) return setExportStatus('Insira uma URL válida.', 'error');
    const res = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url });
    if (!res.ok) return setExportStatus('Não foi possível baixar a página: ' + res.error, 'error');
    html = res.html;
    baseUrl = res.finalUrl || url;
    title = window.PagePinExtract.extractTitle(html) || getDomain(url);
  }

  const blocks = window.PagePinExtract.htmlToBlocks(html, baseUrl);
  const filename = slugify(title);

  let blob, ext;
  if (exportFormat === 'md') {
    const md = window.PagePinExtract.blocksToMarkdown(blocks, title);
    blob = new Blob([md], { type: 'text/markdown' });
    ext = 'md';
  } else {
    const bodyXml = window.PagePinExtract.blocksToDocxBody(blocks, title);
    blob = window.PagePinDocx.buildDocxBlob(bodyXml);
    ext = 'docx';
  }

  const objectUrl = URL.createObjectURL(blob);
  await chrome.downloads.download({ url: objectUrl, filename: `${filename}.${ext}`, saveAs: true });
  setExportStatus('Arquivo exportado com sucesso.', 'success');
}

function normalizeUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return '';
  try {
    const prefixed = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    return new URL(prefixed).href;
  } catch { return ''; }
}

// ── Downloader Universal & Sniffer ───────────────────────────────────────
const btnDownloaderPaste        = document.getElementById('btn-downloader-paste');
const btnDownloaderCurrentTab    = document.getElementById('btn-downloader-current-tab');
const downloaderInjectorsPanel  = document.getElementById('downloader-injectors-panel');
const injectorsPlatformBadge    = document.getElementById('injectors-platform-badge');
const injectorsPlatformIcon     = document.getElementById('injectors-platform-icon');
const injectorsPlatformName     = document.getElementById('injectors-platform-name');
const injectorsPlatformSub      = document.getElementById('injectors-platform-sub');
const injectorsButtonsContainer = document.getElementById('injectors-buttons-container');
const downloaderMediaSection    = document.getElementById('downloader-media-section');
const detectedMediaCount        = document.getElementById('detected-media-count');
const downloaderFilterChips     = document.getElementById('downloader-filter-chips');
const cntVideos                 = document.getElementById('cnt-videos');
const cntAudios                 = document.getElementById('cnt-audios');
const cntImages                 = document.getElementById('cnt-images');
const btnDownloadAllImages      = document.getElementById('btn-download-all-images');
const detectedMediaList         = document.getElementById('detected-media-list');
const btnClearDownloadsHistory  = document.getElementById('btn-clear-downloads-history');

let detectedMediaItems = [];
let currentMediaFilter = 'all';

function setDownloaderStatus(msg, kind) {
  downloaderStatus.textContent = msg;
  downloaderStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  downloaderStatus.classList.remove('hidden');
}

// Reconhecimento de plataforma
function detectDownloaderPlatform(rawUrl) {
  const u = rawUrl.toLowerCase();
  if (u.includes('youtube.com/') || u.includes('youtu.be/')) {
    return { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#ef4444' };
  }
  if (u.includes('tiktok.com/')) {
    return { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#06b6d4' };
  }
  if (u.includes('instagram.com/')) {
    return { id: 'instagram', name: 'Instagram', icon: '📷', color: '#ec4899' };
  }
  if (u.includes('twitter.com/') || u.includes('x.com/')) {
    return { id: 'twitter', name: 'Twitter / X', icon: '𝕏', color: '#38bdf8' };
  }
  if (u.includes('facebook.com/') || u.includes('fb.watch/')) {
    return { id: 'facebook', name: 'Facebook', icon: '📘', color: '#3b82f6' };
  }
  if (u.includes('reddit.com/')) {
    return { id: 'reddit', name: 'Reddit', icon: '🤖', color: '#f97316' };
  }
  if (u.includes('pinterest.com/')) {
    return { id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#e11d48' };
  }
  return { id: 'general', name: 'Página Web', icon: '🌐', color: '#7c5cff' };
}

// Injetores de URL específicos
function renderPlatformInjectors(targetUrl, platform) {
  if (!injectorsButtonsContainer) return;
  injectorsButtonsContainer.innerHTML = '';

  injectorsPlatformIcon.textContent = platform.icon;
  injectorsPlatformName.textContent = platform.name;
  downloaderInjectorsPanel.classList.remove('hidden');

  const encoded = encodeURIComponent(targetUrl);
  const injectors = [];

  if (platform.id === 'youtube') {
    injectors.push({
      label: '⚡ SaveFrom (Injetado)',
      className: 'savefrom',
      action: () => chrome.tabs.create({ url: `https://en.savefrom.net/1-youtube-video-downloader-719/?url=${encoded}` })
    });
    injectors.push({
      label: '⚡ 10Downloader (MP4/MP3)',
      className: 'y2mate',
      action: () => chrome.tabs.create({ url: `https://10downloader.com/download?v=${encoded}` })
    });
    injectors.push({
      label: '⚡ SSYouTube',
      className: 'y2mate',
      action: () => {
        const ssUrl = targetUrl.replace(/^(https?:\/\/)?(www\.)?youtube\.com/i, 'https://www.ssyoutube.com');
        chrome.tabs.create({ url: ssUrl });
      }
    });
    injectors.push({
      label: '⚡ Cobalt Tools',
      className: 'cobalt',
      action: () => {
        navigator.clipboard.writeText(targetUrl).catch(() => {});
        setDownloaderStatus('Link copiado! Abrindo Cobalt Tools…', 'success');
        chrome.tabs.create({ url: 'https://cobalt.tools/' });
      }
    });
    injectors.push({
      label: '⚡ Y2Mate',
      className: 'y2mate',
      action: () => chrome.tabs.create({ url: `https://y2mate.is/en/youtube-to-mp4.html?url=${encoded}` })
    });
  } else if (platform.id === 'tiktok') {
    injectors.push({
      label: '⚡ Baixar sem Marca D’água',
      className: 'api-btn',
      action: async () => {
        await downloadTikTokDirect(targetUrl);
      }
    });
    injectors.push({
      label: '⚡ SnapTik',
      className: 'snaptik',
      action: () => {
        navigator.clipboard.writeText(targetUrl).catch(() => {});
        setDownloaderStatus('Link copiado! Abrindo SnapTik…', 'success');
        chrome.tabs.create({ url: 'https://snaptik.app/' });
      }
    });
    injectors.push({
      label: '⚡ SSSTik (Injetado)',
      className: 'snaptik',
      action: () => chrome.tabs.create({ url: `https://ssstik.io/pt` })
    });
    injectors.push({
      label: '⚡ SaveFrom',
      className: 'savefrom',
      action: () => chrome.tabs.create({ url: `https://savefrom.net/?url=${encoded}` })
    });
  } else if (platform.id === 'instagram') {
    injectors.push({
      label: '⚡ SnapInsta',
      className: 'snapinsta',
      action: () => {
        navigator.clipboard.writeText(targetUrl).catch(() => {});
        setDownloaderStatus('Link copiado! Abrindo SnapInsta…', 'success');
        chrome.tabs.create({ url: 'https://snapinsta.app/' });
      }
    });
    injectors.push({
      label: '⚡ FastDL (Injetado)',
      className: 'snapinsta',
      action: () => chrome.tabs.create({ url: `https://fastdl.app/pt` })
    });
    injectors.push({
      label: '⚡ SaveFrom',
      className: 'savefrom',
      action: () => chrome.tabs.create({ url: `https://savefrom.net/?url=${encoded}` })
    });
    injectors.push({
      label: '⚡ InDown',
      className: 'snapinsta',
      action: () => chrome.tabs.create({ url: `https://indown.io/` })
    });
  } else if (platform.id === 'twitter') {
    injectors.push({
      label: '⚡ TwitSave (Injetado)',
      className: 'snaptik',
      action: () => chrome.tabs.create({ url: `https://twitsave.com/info?url=${encoded}` })
    });
    injectors.push({
      label: '⚡ SaveFrom',
      className: 'savefrom',
      action: () => chrome.tabs.create({ url: `https://savefrom.net/?url=${encoded}` })
    });
  } else {
    // Universal / Geral
    injectors.push({
      label: '⚡ SaveFrom Universal',
      className: 'savefrom',
      action: () => chrome.tabs.create({ url: `https://savefrom.net/?url=${encoded}` })
    });
    injectors.push({
      label: '⚡ Cobalt Tools',
      className: 'cobalt',
      action: () => {
        navigator.clipboard.writeText(targetUrl).catch(() => {});
        setDownloaderStatus('Link copiado! Abrindo Cobalt…', 'success');
        chrome.tabs.create({ url: 'https://cobalt.tools/' });
      }
    });
  }

  injectors.forEach(inj => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `injector-btn ${inj.className || ''}`;
    btn.textContent = inj.label;
    btn.addEventListener('click', inj.action);
    injectorsButtonsContainer.appendChild(btn);
  });
}

// Download direto do TikTok via TikWM API (Vídeo sem marca d'água + Áudio)
async function downloadTikTokDirect(tiktokUrl) {
  setDownloaderStatus('Consultando API do TikTok (sem marca d’água)…');
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
    const data = await res.json();
    if (data && data.code === 0 && data.data) {
      const vid = data.data;
      const title = (vid.title || 'tiktok_video').slice(0, 40).replace(/[\\/:*?"<>|]/g, '_');
      
      // Adicionar às mídias detectadas
      const items = [];
      if (vid.play) {
        items.push({
          type: 'video',
          url: vid.play,
          name: `${title}.mp4`,
          thumb: vid.cover || '',
          ext: 'mp4'
        });
      }
      if (vid.music) {
        items.push({
          type: 'audio',
          url: vid.music,
          name: `${vid.music_info?.title || title}_audio.mp3`,
          thumb: vid.music_info?.cover || vid.cover || '',
          ext: 'mp3'
        });
      }
      if (Array.isArray(vid.images)) {
        vid.images.forEach((imgUrl, i) => {
          items.push({
            type: 'image',
            url: imgUrl,
            name: `${title}_foto_${i + 1}.jpg`,
            thumb: imgUrl,
            ext: 'jpg'
          });
        });
      }

      detectedMediaItems = items;
      renderDetectedMediaList();
      setDownloaderStatus('Mídias do TikTok capturadas com sucesso! Clique em Baixar.', 'success');

      // Baixar automaticamente o vídeo principal
      if (vid.play) {
        await startExtensionDownload(vid.play, `${title}.mp4`, true);
        addDownloadHistoryItem(`${title}.mp4`);
      }
    } else {
      throw new Error(data?.msg || 'Não foi possível obter vídeo direto da API.');
    }
  } catch (err) {
    setDownloaderStatus('API direta ocupada. Use os botões SnapTik ou SaveFrom acima para baixar!', 'error');
  }
}

// Sniffer de mídias injetado na aba do navegador
function pageMediaSnifferScript() {
  const items = [];
  const seen = new Set();

  function add(item) {
    if (!item.url || item.url.startsWith('javascript:') || item.url.startsWith('about:') || item.url.startsWith('chrome:')) return;
    if (seen.has(item.url)) return;
    seen.add(item.url);
    items.push(item);
  }

  // Vídeos
  document.querySelectorAll('video').forEach((v, i) => {
    const src = v.currentSrc || v.src;
    if (src) {
      add({
        type: 'video',
        url: src,
        name: `Vídeo ${i + 1}`,
        thumb: v.poster || '',
        width: v.videoWidth,
        height: v.videoHeight,
        ext: 'mp4'
      });
    }
    v.querySelectorAll('source').forEach(s => {
      if (s.src) {
        add({
          type: 'video',
          url: s.src,
          name: `Vídeo Stream ${i + 1}`,
          thumb: v.poster || '',
          ext: 'mp4'
        });
      }
    });
  });

  // Áudios
  document.querySelectorAll('audio').forEach((a, i) => {
    const src = a.currentSrc || a.src;
    if (src) {
      add({ type: 'audio', url: src, name: `Áudio ${i + 1}`, ext: 'mp3' });
    }
    a.querySelectorAll('source').forEach(s => {
      if (s.src) {
        add({ type: 'audio', url: s.src, name: `Áudio Stream ${i + 1}`, ext: 'mp3' });
      }
    });
  });

  // Imagens (ignora ícones minúsculos e pixels)
  document.querySelectorAll('img').forEach((img, i) => {
    const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
    if (!src || src.startsWith('data:image/svg')) return;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if ((w > 0 && w < 48) || (h > 0 && h < 48)) return;
    
    const alt = (img.alt || '').trim();
    const name = alt ? (alt.length > 35 ? alt.slice(0, 35) + '…' : alt) : `Imagem ${i + 1}`;
    add({
      type: 'image',
      url: src,
      name,
      thumb: src,
      width: w,
      height: h,
      ext: src.includes('.png') ? 'png' : src.includes('.webp') ? 'webp' : 'jpg'
    });
  });

  // Links de mídia diretos
  const mediaRe = /\.(mp4|webm|m4v|mp3|wav|ogg|m4a|flac|jpg|jpeg|png|webp|gif|pdf|zip)(?:\?.*)?$/i;
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href;
    const m = href.match(mediaRe);
    if (m) {
      const ext = m[1].toLowerCase();
      let type = 'file';
      if (['mp4', 'webm', 'm4v'].includes(ext)) type = 'video';
      else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) type = 'audio';
      else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) type = 'image';

      const text = (a.textContent || '').trim();
      const filename = href.split('/').pop().split('?')[0] || `Arquivo.${ext}`;
      add({
        type,
        url: href,
        name: text ? (text.length > 35 ? text.slice(0, 35) + '…' : text) : filename,
        thumb: type === 'image' ? href : '',
        ext
      });
    }
  });

  return items;
}

// Renderizar mídias detectadas na interface
function renderDetectedMediaList() {
  if (!detectedMediaList) return;
  detectedMediaList.innerHTML = '';

  const total = detectedMediaItems.length;
  const vids = detectedMediaItems.filter(m => m.type === 'video').length;
  const auds = detectedMediaItems.filter(m => m.type === 'audio').length;
  const imgs = detectedMediaItems.filter(m => m.type === 'image').length;

  if (detectedMediaCount) detectedMediaCount.textContent = total;
  if (cntVideos) cntVideos.textContent = vids;
  if (cntAudios) cntAudios.textContent = auds;
  if (cntImages) cntImages.textContent = imgs;

  if (total > 0) {
    downloaderMediaSection.classList.remove('hidden');
  } else {
    downloaderMediaSection.classList.add('hidden');
    return;
  }

  const filtered = detectedMediaItems.filter(item => {
    if (currentMediaFilter === 'all') return true;
    return item.type === currentMediaFilter;
  });

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.className = 'media-item-card';

    // Thumbnail / Icon
    let thumbHtml = '';
    if (item.thumb) {
      thumbHtml = `<img src="${escHtml(item.thumb)}" class="media-item-thumb" alt="" onerror="this.outerHTML='<div class=\\'media-item-thumb\\'>${item.type === 'video' ? '🎬' : '🖼️'}</div>'" />`;
    } else {
      const icon = item.type === 'video' ? '🎬' : item.type === 'audio' ? '🎵' : '📄';
      thumbHtml = `<div class="media-item-thumb">${icon}</div>`;
    }

    const badgeClass = item.type || 'file';
    const extLabel = (item.ext || item.type).toUpperCase();
    const dims = (item.width && item.height) ? `${item.width}×${item.height}` : '';

    li.innerHTML = `
      ${thumbHtml}
      <div class="media-item-info">
        <span class="media-item-name" title="${escHtml(item.name)}">${escHtml(item.name)}</span>
        <div class="media-item-meta">
          <span class="media-type-badge ${badgeClass}">${extLabel}</span>
          ${dims ? `<span>${dims}</span>` : ''}
        </div>
      </div>
      <div class="media-item-actions">
        <button class="icon-btn btn-media-copy" title="Copiar link da mídia">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button class="btn btn-primary btn-xs btn-media-dl">
          <span>Baixar</span>
        </button>
      </div>
    `;

    // Botão copiar
    li.querySelector('.btn-media-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(item.url).then(() => {
        setDownloaderStatus('Link da mídia copiado!', 'success');
      }).catch(() => {});
    });

    // Botão baixar
    li.querySelector('.btn-media-dl')?.addEventListener('click', async () => {
      try {
        setDownloaderStatus(`Iniciando download de ${item.name}…`);
        const filename = item.name.endsWith(`.${item.ext}`) ? item.name : `${item.name}.${item.ext || 'bin'}`;
        await startExtensionDownload(item.url, filename, true);
        addDownloadHistoryItem(item.name);
        setDownloaderStatus('Download iniciado com sucesso!', 'success');
      } catch (err) {
        setDownloaderStatus('Erro ao baixar: ' + (err?.message || err), 'error');
      }
    });

    detectedMediaList.appendChild(li);
  });
}

async function startExtensionDownload(url, filename, saveAs = true) {
  if (!url || /^(blob:|data:)/i.test(url)) {
    return chrome.downloads.download({ url, filename, saveAs });
  }
  const response = await chrome.runtime.sendMessage({
    type: 'DOWNLOAD_URL',
    url,
    filename,
    saveAs
  });
  if (!response?.ok) throw new Error(response?.error || 'O navegador não iniciou o download.');
  return response.downloadId;
}

function addDownloadHistoryItem(name) {
  if (!downloadsList) return;
  downloadHistory.unshift({ name, createdAt: Date.now() });
  downloadHistory = downloadHistory.slice(0, 50);
  saveUserSettings({ downloadHistory });
  renderDownloadHistory();
}

function renderDownloadHistory() {
  if (!downloadsList) return;
  downloadsList.innerHTML = '';
  downloadHistory.forEach(item => {
    const li = document.createElement('li');
    li.className = 'download-item';
    li.innerHTML = `
      <span class="download-name">${escHtml(item.name)}</span>
      <span class="tool-hint" style="font-size:10px">${new Date(item.createdAt).toLocaleTimeString()}</span>
    `;
    downloadsList.appendChild(li);
  });
}

function clearDownloadHistory() {
  downloadHistory = [];
  saveUserSettings({ downloadHistory });
  renderDownloadHistory();
}

// Analisar página ou link
btnDownload?.addEventListener('click', async () => {
  const url = normalizeUrl(downloaderUrlInput.value);
  if (!url) return setDownloaderStatus('Insira uma URL válida.', 'error');
  saveUserSettings({ lastDownloaderUrl: url });

  btnDownload.disabled = true;
  setDownloaderStatus('Analisando página e preparando downloads…');

  const platform = detectDownloaderPlatform(url);
  renderPlatformInjectors(url, platform);

  try {
    // 1. Verificar se a URL informada corresponde à aba ativa para fazer sniffing no DOM
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let snifferRan = false;

    if (activeTab?.id && activeTab.url && activeTab.url.split('#')[0] === url.split('#')[0]) {
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: pageMediaSnifferScript
        });
        if (Array.isArray(result) && result.length > 0) {
          detectedMediaItems = result;
          renderDetectedMediaList();
          snifferRan = true;
          setDownloaderStatus(`${result.length} mídia(s) detectada(s) nesta página! Escolha abaixo ou use os injetores.`, 'success');
        }
      } catch (scriptErr) {
        console.warn('Sniffer na aba ativa falhou:', scriptErr);
      }
    }

    // 2. Se for link direto de arquivo ou o sniffer não capturou nada
    if (!snifferRan) {
      const res = await chrome.runtime.sendMessage({ type: 'DETECT_MEDIA', url });
      if (res.ok && res.mediaUrl) {
        const filename = res.mediaUrl.split('/').pop().split('?')[0] || 'midia';
        detectedMediaItems = [{
          type: res.mediaType || 'file',
          url: res.mediaUrl,
          name: filename,
          thumb: res.mediaType === 'image' ? res.mediaUrl : '',
          ext: filename.split('.').pop() || res.mediaType
        }];
        renderDetectedMediaList();
        setDownloaderStatus(`Mídia direta encontrada (${res.mediaType || 'arquivo'}). Pronto para baixar!`, 'success');
      } else if (platform.id !== 'general') {
        setDownloaderStatus(`Detectado como ${platform.name}! Use os injetores rápidos acima para baixar em alta resolução.`, 'success');
      } else {
        setDownloaderStatus('Nenhuma mídia direta encontrada no HTML. Use os injetores rápidos acima ou clique em "Aba Atual" com a página aberta.', 'error');
      }
    }
  } catch (err) {
    setDownloaderStatus('Erro ao analisar: ' + (err?.message || err), 'error');
  } finally {
    btnDownload.disabled = false;
  }
});

// Ações rápidas da barra de entrada
btnDownloaderPaste?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()) {
      downloaderUrlInput.value = text.trim();
      setDownloaderStatus('Link colado da área de transferência!', 'success');
      btnDownload.click();
    }
  } catch {
    downloaderUrlInput.focus();
    setDownloaderStatus('Cole usando Ctrl+V no campo de URL.', 'error');
  }
});

btnDownloaderCurrentTab?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:/i.test(tab.url)) {
      downloaderUrlInput.value = tab.url;
      setDownloaderStatus(`URL da aba ativa capturada: ${tab.title || tab.url}`, 'success');
      btnDownload.click();
    } else {
      setDownloaderStatus('Aba atual não possui uma URL web válida.', 'error');
    }
  } catch (err) {
    setDownloaderStatus('Erro ao ler aba atual: ' + (err?.message || err), 'error');
  }
});

// Filtros de mídia detectada
downloaderFilterChips?.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  [...downloaderFilterChips.children].forEach(c => c.classList.toggle('active', c === chip));
  currentMediaFilter = chip.dataset.filter || 'all';
  renderDetectedMediaList();
});

// Baixar todas as imagens em .ZIP
btnDownloadAllImages?.addEventListener('click', async () => {
  const images = detectedMediaItems.filter(m => m.type === 'image');
  if (images.length === 0) {
    return setDownloaderStatus('Nenhuma imagem disponível para baixar.', 'error');
  }

  btnDownloadAllImages.disabled = true;
  setDownloaderStatus(`Preparando ZIP com ${images.length} imagem(ns)…`);

  try {
    const zipFiles = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const resp = await fetch(img.url);
        if (!resp.ok) continue;
        const arrayBuf = await resp.arrayBuffer();
        const ext = img.ext || 'jpg';
        const cleanName = `imagem_${i + 1}.${ext}`;
        zipFiles.push({ name: cleanName, content: new Uint8Array(arrayBuf) });
      } catch (fErr) {
        console.warn('Falha ao baixar imagem para ZIP:', img.url, fErr);
      }
    }

    if (zipFiles.length === 0) {
      throw new Error('Não foi possível baixar o conteúdo das imagens devido a restrições do servidor de origem.');
    }

    await ensureLazyModules('zip');
    const zipBlob = window.createZip(zipFiles);
    const blobUrl = URL.createObjectURL(zipBlob);
    await chrome.downloads.download({
      url: blobUrl,
      filename: `imagens_${Date.now()}.zip`,
      saveAs: true
    });
    setDownloaderStatus(`Arquivo ZIP com ${zipFiles.length} imagens gerado e baixado com sucesso!`, 'success');
  } catch (err) {
    setDownloaderStatus('Erro ao gerar ZIP: ' + (err?.message || err), 'error');
  } finally {
    btnDownloadAllImages.disabled = false;
  }
});

// Limpar histórico de downloads
btnClearDownloadsHistory?.addEventListener('click', () => {
  clearDownloadHistory();
});

downloaderUrlInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnDownload.click(); });

// ── URL Shortener ────────────────────────────────────────────────────────
function setShortenerStatus(msg, kind) {
  shortenerStatus.textContent = msg;
  shortenerStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  shortenerStatus.classList.remove('hidden');
}

btnShorten.addEventListener('click', async () => {
  const url = normalizeUrl(shortenerUrlInput.value);
  if (!url) return setShortenerStatus('Insira uma URL válida.', 'error');
  saveUserSettings({ lastShortenerUrl: url });

  btnShorten.disabled = true;
  setShortenerStatus('Encurtando…');
  shortenerResult.classList.add('hidden');
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Serviço indisponível');
    const shortUrl = (await res.text()).trim();
    if (!shortUrl.startsWith('http')) throw new Error(shortUrl || 'Resposta inválida');

    shortenerResultInput.value = shortUrl;
    shortenerResult.classList.remove('hidden');
    setShortenerStatus('Link encurtado com sucesso.', 'success');

    shortenerHistory.unshift({ short: shortUrl, original: url });
    shortenerHistory = shortenerHistory.slice(0, 20);
    saveUserSettings({ shortenerHistory });
    renderShortenerHistory();
  } catch (err) {
    setShortenerStatus('Erro ao encurtar: ' + (err?.message || err), 'error');
  } finally {
    btnShorten.disabled = false;
  }
});

shortenerUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnShorten.click(); });

btnCopyShort.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortenerResultInput.value);
    btnCopyShort.classList.add('copied');
    setTimeout(() => btnCopyShort.classList.remove('copied'), 1200);
  } catch {}
});

function renderShortenerHistory() {
  shortenerHistoryEl.innerHTML = '';
  shortenerHistory.slice(0, 20).forEach(item => {
    const li = document.createElement('li');
    li.className = 'shortener-history-item';
    li.innerHTML = `
      <span class="short-url">${escHtml(item.short.replace(/^https?:\/\//, ''))}</span>
      <span class="orig-url">${escHtml(item.original)}</span>
    `;
    li.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(item.short); } catch {}
    });
    shortenerHistoryEl.appendChild(li);
  });
}

// ── Saved Tabs ───────────────────────────────────────────────────────────
async function loadSavedTabs() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_SAVED_TABS' });
    savedTabs = res?.savedTabs ?? [];
  } catch { savedTabs = []; }
}

function renderSavedTabs() {
  savedTabsList.innerHTML = '';
  if (savedTabs.length === 0) {
    savedTabsEmptyState.classList.remove('hidden');
    return;
  }
  savedTabsEmptyState.classList.add('hidden');

  savedTabs.forEach((tab, index) => {
    const li = document.createElement('li');
    li.className = 'page-item';
    li.style.animationDelay = `${index * 40}ms`;

    const faviconSrc = tab.favicon || getFaviconUrl(tab.url);
    li.innerHTML = `
      <img class="page-favicon" src="${escHtml(faviconSrc)}" alt="" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect width=%2224%22 height=%2224%22 rx=%224%22 fill=%22%23333%22/><text x=%2212%22 y=%2217%22 text-anchor=%22middle%22 fill=%22%23aaa%22 font-size=%2213%22>🌐</text></svg>'" />
      <div class="page-info">
        <span class="page-title">${escHtml(tab.title || tab.url)}</span>
        <span class="page-url">${escHtml(getDomain(tab.url))}</span>
      </div>
      <div class="page-actions">
        <button class="page-action-btn delete-btn" title="Remover" aria-label="Remover aba salva">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.page-action-btn')) return;
      chrome.tabs.create({ url: tab.url });
    });

    li.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await chrome.runtime.sendMessage({ type: 'REMOVE_SAVED_TAB', id: tab.id });
      savedTabs = savedTabs.filter(t => t.id !== tab.id);
      renderSavedTabs();
    });

    savedTabsList.appendChild(li);
  });
}

btnSaveCurrentTab.addEventListener('click', async () => {
  const { tab } = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
  if (!tab || !/^https?:/i.test(tab.url || '')) return;
  await chrome.runtime.sendMessage({ type: 'ADD_SAVED_TABS', tabs: [tab] });
  await loadSavedTabs();
  renderSavedTabs();
});

btnSaveAllTabs.addEventListener('click', async () => {
  const { tabs } = await chrome.runtime.sendMessage({ type: 'GET_ALL_TABS' });
  await chrome.runtime.sendMessage({ type: 'ADD_SAVED_TABS', tabs: tabs || [] });
  await loadSavedTabs();
  renderSavedTabs();
});

// ── Custom context-menu rules ────────────────────────────────────────────
ctxContextsBar.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const ctx = chip.dataset.ctx;
  chip.classList.toggle('active');
  ctxSelectedContexts = [...ctxContextsBar.querySelectorAll('.chip.active')].map(c => c.dataset.ctx);
  if (ctxSelectedContexts.length === 0) {
    chip.classList.add('active');
    ctxSelectedContexts = [ctx];
  }
});

function setCtxStatus(msg, kind) {
  ctxStatus.textContent = msg;
  ctxStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  ctxStatus.classList.remove('hidden');
}

btnAddCtxRule.addEventListener('click', async () => {
  const title = ctxTitleInput.value.trim();
  const rawUrl = ctxUrlInput.value.trim();
  if (!title) return setCtxStatus('Preencha o título do item.', 'error');
  if (!rawUrl) return setCtxStatus('Preencha a URL/ação.', 'error');

  let url = rawUrl;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  const action = { type: 'open_url', url };

  await chrome.runtime.sendMessage({
    type: 'ADD_CONTEXT_RULE',
    rule: { title, contexts: ctxSelectedContexts, action }
  });

  ctxTitleInput.value = '';
  ctxUrlInput.value = '';
  setCtxStatus('Item adicionado ao menu de contexto.', 'success');
  await loadContextRules();
  renderContextRules();
});

async function loadContextRules() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_CONTEXT_RULES' });
    contextRules = res?.rules ?? [];
  } catch { contextRules = []; }
}

const CONTEXT_LABELS = { page: 'Página', link: 'Link', selection: 'Seleção' };
const ACTION_LABELS = { open_url: 'Abrir link' };

function renderContextRules() {
  ctxList.innerHTML = '';
  if (contextRules.length === 0) {
    ctxEmptyState.classList.remove('hidden');
    return;
  }
  ctxEmptyState.classList.add('hidden');

  contextRules.forEach(rule => {
    const li = document.createElement('li');
    li.className = 'download-item';
    const contextsLabel = (rule.contexts || []).map(c => CONTEXT_LABELS[c] || c).join(', ');
    const actionLabel = ACTION_LABELS[rule.action?.type] || 'Ação';
    li.innerHTML = `
      <span class="download-name">${escHtml(rule.title)} <span style="color:var(--text-muted)">— ${escHtml(actionLabel)} · ${escHtml(contextsLabel)}</span></span>
      <button class="page-action-btn delete-btn" title="Remover" aria-label="Remover item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'REMOVE_CONTEXT_RULE', id: rule.id });
      contextRules = contextRules.filter(r => r.id !== rule.id);
      renderContextRules();
    });
    ctxList.appendChild(li);
  });
}

// ── Context Commander (comandos Windows/PowerShell/scripts/JS/webhook) ──────
const ccSubnavSegmented   = document.getElementById('ctxmenu-subnav-segmented');
const ccPanelCommands     = document.getElementById('cc-panel-commands');
const ccPanelLinks        = document.getElementById('cc-panel-links');
const ccPanelHistory      = document.getElementById('cc-panel-history');
const ccPanelSettings     = document.getElementById('cc-panel-settings');

const ccTitleInput        = document.getElementById('cc-title-input');
const ccTypeSelect        = document.getElementById('cc-type-select');
const ccCommandInput      = document.getElementById('cc-command-input');
const ccInteractiveCheck  = document.getElementById('cc-interactive-check');
const ccCodeInput         = document.getElementById('cc-code-input');
const ccTemplateInput     = document.getElementById('cc-template-input');
const ccUrlInput          = document.getElementById('cc-url-input');
const ccWebhookUrlInput   = document.getElementById('cc-webhook-url-input');
const ccWebhookMethodSel  = document.getElementById('cc-webhook-method-select');
const ccWebhookPayload    = document.getElementById('cc-webhook-payload-input');
const ccContextsBar       = document.getElementById('cc-contexts');
const btnAddCcCommand     = document.getElementById('btn-add-cc-command');
const ccStatus            = document.getElementById('cc-status');
const ccEmptyState        = document.getElementById('cc-empty-state');
const ccCommandsList      = document.getElementById('cc-commands-list');

const ccHistoryList       = document.getElementById('cc-history-list');
const ccHistoryEmptyState = document.getElementById('cc-history-empty-state');
const btnRefreshCcHistory = document.getElementById('btn-refresh-cc-history');

const ccBridgeUrlInput    = document.getElementById('cc-bridge-url-input');
const ccBridgeTokenInput  = document.getElementById('cc-bridge-token-input');
const ccHistoryMaxInput   = document.getElementById('cc-history-max-input');
const btnSaveCcSettings   = document.getElementById('btn-save-cc-settings');
const btnCheckCcBridge    = document.getElementById('btn-check-cc-bridge');
const ccSettingsStatus    = document.getElementById('cc-settings-status');

let ccCommands = [];
let ccSelectedContexts = ['page'];

if (ccSubnavSegmented) {
  ccSubnavSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    [...ccSubnavSegmented.children].forEach(b => b.classList.toggle('active', b === btn));
    const tab = btn.dataset.cctab;
    ccPanelCommands.classList.toggle('hidden', tab !== 'commands');
    ccPanelLinks.classList.toggle('hidden', tab !== 'links');
    ccPanelHistory.classList.toggle('hidden', tab !== 'history');
    ccPanelSettings.classList.toggle('hidden', tab !== 'settings');
    if (tab === 'history') loadCcHistory().then(renderCcHistory);
    if (tab === 'settings') loadCcSettingsIntoForm();
  });
}

if (ccTypeSelect) {
  ccTypeSelect.addEventListener('change', () => {
    const type = ccTypeSelect.value;
    document.querySelectorAll('.cc-field-group').forEach(group => {
      const fields = (group.dataset.ccFields || '').split(',');
      group.classList.toggle('hidden', !fields.includes(type));
    });
  });
  ccTypeSelect.dispatchEvent(new Event('change'));
}

if (ccContextsBar) {
  ccContextsBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const ctx = chip.dataset.ctx;
    chip.classList.toggle('active');
    ccSelectedContexts = [...ccContextsBar.querySelectorAll('.chip.active')].map(c => c.dataset.ctx);
    if (ccSelectedContexts.length === 0) {
      chip.classList.add('active');
      ccSelectedContexts = [ctx];
    }
  });
}

function setCcStatus(msg, kind) {
  ccStatus.textContent = msg;
  ccStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  ccStatus.classList.remove('hidden');
}

async function loadCcCommands() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'CC_GET_COMMANDS' });
    ccCommands = res?.commands ?? [];
  } catch { ccCommands = []; }
}

async function saveCcCommands() {
  await chrome.runtime.sendMessage({ type: 'CC_SAVE_COMMANDS', commands: ccCommands });
}

if (btnAddCcCommand) {
  btnAddCcCommand.addEventListener('click', async () => {
    const title = ccTitleInput.value.trim();
    const type = ccTypeSelect.value;
    if (!title) return setCcStatus('Preencha o título do comando.', 'error');

    const command = {
      id: `cc_${Date.now()}`,
      parentId: null,
      isFolder: false,
      title,
      type,
      enabled: true,
      contexts: ccSelectedContexts
    };

    if (['cmd', 'powershell', 'script', 'open'].includes(type)) {
      const cmdValue = ccCommandInput.value.trim();
      if (!cmdValue) return setCcStatus('Preencha o comando a ser executado.', 'error');
      command.command = cmdValue;
      command.interactive = ccInteractiveCheck.checked;
      command.timeout = 30;
    } else if (type === 'browser_js') {
      const code = ccCodeInput.value.trim();
      if (!code) return setCcStatus('Preencha o código JavaScript.', 'error');
      command.code = code;
    } else if (type === 'copy_template') {
      const template = ccTemplateInput.value.trim();
      if (!template) return setCcStatus('Preencha o template.', 'error');
      command.template = template;
    } else if (type === 'open_url') {
      const url = ccUrlInput.value.trim();
      if (!url) return setCcStatus('Preencha a URL.', 'error');
      command.url = url;
    } else if (type === 'webhook') {
      const url = ccWebhookUrlInput.value.trim();
      if (!url) return setCcStatus('Preencha a URL do webhook.', 'error');
      command.url = url;
      command.method = ccWebhookMethodSel.value;
      command.payload = ccWebhookPayload.value.trim() || undefined;
    }

    ccCommands.push(command);
    await saveCcCommands();

    ccTitleInput.value = '';
    ccCommandInput.value = '';
    ccCodeInput.value = '';
    ccTemplateInput.value = '';
    ccUrlInput.value = '';
    ccWebhookUrlInput.value = '';
    ccWebhookPayload.value = '';
    ccInteractiveCheck.checked = false;

    setCcStatus('Comando adicionado ao menu de contexto.', 'success');
    renderCcCommands();
  });
}

const CC_TYPE_LABELS = {
  cmd: 'CMD', powershell: 'PowerShell', script: 'Script', open: 'Abrir',
  browser_js: 'JS na página', copy_template: 'Copiar template', open_url: 'Abrir URL', webhook: 'Webhook'
};

function renderCcCommands() {
  ccCommandsList.innerHTML = '';
  const commandItems = ccCommands.filter(c => !c.isFolder);
  if (commandItems.length === 0) {
    ccEmptyState.classList.remove('hidden');
    return;
  }
  ccEmptyState.classList.add('hidden');

  commandItems.forEach(cmd => {
    const li = document.createElement('li');
    li.className = 'download-item';
    const typeLabel = CC_TYPE_LABELS[cmd.type] || cmd.type;
    li.innerHTML = `
      <span class="download-name">${escHtml(cmd.title)} <span style="color:var(--text-muted)">— ${escHtml(typeLabel)}</span></span>
      <button class="page-action-btn delete-btn" title="Remover" aria-label="Remover comando">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', async () => {
      ccCommands = ccCommands.filter(c => c.id !== cmd.id);
      await saveCcCommands();
      renderCcCommands();
    });
    ccCommandsList.appendChild(li);
  });
}

async function loadCcHistory() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'CC_GET_HISTORY' });
    return res?.history ?? [];
  } catch { return []; }
}

function renderCcHistory(history) {
  ccHistoryList.innerHTML = '';
  if (!history || history.length === 0) {
    ccHistoryEmptyState.classList.remove('hidden');
    return;
  }
  ccHistoryEmptyState.classList.add('hidden');

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'download-item';
    const ok = entry.result?.success;
    const icon = ok ? '✅' : '❌';
    const when = formatDate(entry.timestamp);
    li.innerHTML = `<span class="download-name">${icon} ${escHtml(entry.commandTitle)} <span style="color:var(--text-muted)">— ${escHtml(when)}</span></span>`;
    ccHistoryList.appendChild(li);
  });
}

if (btnRefreshCcHistory) {
  btnRefreshCcHistory.addEventListener('click', async () => {
    renderCcHistory(await loadCcHistory());
  });
}

async function loadCcSettingsIntoForm() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'CC_GET_SETTINGS' });
    const settings = res?.settings ?? {};
    ccBridgeUrlInput.value = settings.bridgeUrl || 'http://127.0.0.1:27182';
    ccBridgeTokenInput.value = settings.bridgeToken || '';
    ccHistoryMaxInput.value = settings.historyMaxItems || 50;
  } catch {}
}

function mergeMenuSettings(saved = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_MENU_SETTINGS).map(([section, defaults]) => [
    section, { ...defaults, ...(saved[section] || {}) }
  ]));
}

function applyTheme(theme = 'dark') {
  document.documentElement.dataset.theme = ['dark', 'light', 'system'].includes(theme) ? theme : 'dark';
}

function setCcSettingsStatus(msg, kind) {
  ccSettingsStatus.textContent = msg;
  ccSettingsStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  ccSettingsStatus.classList.remove('hidden');
}

if (btnSaveCcSettings) {
  btnSaveCcSettings.addEventListener('click', async () => {
    const settings = {
      bridgeUrl: ccBridgeUrlInput.value.trim() || 'http://127.0.0.1:27182',
      bridgeToken: ccBridgeTokenInput.value.trim(),
      historyMaxItems: Number(ccHistoryMaxInput.value) || 50
    };
    await chrome.runtime.sendMessage({ type: 'CC_SAVE_SETTINGS', settings });
    setCcSettingsStatus('Configurações salvas.', 'success');
  });
}

if (btnCheckCcBridge) {
  btnCheckCcBridge.addEventListener('click', async () => {
    setCcSettingsStatus('Testando conexão…');
    const res = await chrome.runtime.sendMessage({ type: 'CC_CHECK_BRIDGE' });
    if (res?.ok) {
      setCcSettingsStatus(`Bridge conectado! (${res.bridge?.name || 'Context Commander Bridge'})`, 'success');
    } else {
      setCcSettingsStatus('Bridge não respondeu. Rode bridge/iniciar_bridge.bat no Windows.', 'error');
    }
  });
}

// ── Addresses ────────────────────────────────────────────────────────────
async function loadAddresses() {
  const { savedAddresses = [] } = await chrome.storage.local.get('savedAddresses');
  addresses = savedAddresses;
}

function setAddrStatus(msg, kind) {
  addrStatus.textContent = msg;
  addrStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  addrStatus.classList.remove('hidden');
}

btnAddAddress.addEventListener('click', async () => {
  const label = addrLabelInput.value.trim();
  const name = addrNameInput.value.trim();
  const street = addrStreetInput.value.trim();
  const neighborhood = addrNeighborhoodInput.value.trim();
  const city = addrCityInput.value.trim();
  const state = addrStateInput.value.trim().toUpperCase();
  const zip = addrZipInput.value.trim();
  const phone = addrPhoneInput.value.trim();

  if (!label || !street || !city) return setAddrStatus('Preencha ao menos identificação, rua e cidade.', 'error');

  const entry = { id: Date.now().toString(), label, name, street, neighborhood, city, state, zip, phone };
  addresses.unshift(entry);
  await chrome.storage.local.set({ savedAddresses: addresses });

  [addrLabelInput, addrNameInput, addrStreetInput, addrNeighborhoodInput, addrCityInput, addrStateInput, addrZipInput, addrPhoneInput].forEach(i => i.value = '');
  setAddrStatus('Endereço salvo.', 'success');
  renderAddresses();
});

function addressFullText(entry) {
  const cityState = [entry.city, entry.state].filter(Boolean).join(' - ');
  return [entry.name, entry.street, entry.neighborhood, cityState, entry.zip, entry.phone].filter(Boolean).join(', ');
}

function renderAddresses() {
  addressesList.innerHTML = '';
  if (addresses.length === 0) {
    addressesEmptyState.classList.remove('hidden');
    return;
  }
  addressesEmptyState.classList.add('hidden');

  addresses.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'credential-item';

    if (addrEditingId === entry.id) {
      li.innerHTML = `
        <div class="credential-edit-form">
          <input class="text-input edit-label-input" type="text" value="${escHtml(entry.label)}" placeholder="Identificação" />
          <input class="text-input edit-name-input" type="text" value="${escHtml(entry.name || '')}" placeholder="Nome completo" />
          <input class="text-input edit-street-input" type="text" value="${escHtml(entry.street)}" placeholder="Rua / Número / Complemento" />
          <input class="text-input edit-neighborhood-input" type="text" value="${escHtml(entry.neighborhood || '')}" placeholder="Bairro" />
          <input class="text-input edit-city-input" type="text" value="${escHtml(entry.city)}" placeholder="Cidade" />
          <input class="text-input edit-state-input" type="text" value="${escHtml(entry.state || '')}" placeholder="UF" maxlength="2" />
          <input class="text-input edit-zip-input" type="text" value="${escHtml(entry.zip || '')}" placeholder="CEP" />
          <input class="text-input edit-phone-input" type="text" value="${escHtml(entry.phone || '')}" placeholder="Telefone" />
          <div class="credential-edit-actions">
            <button class="btn btn-ghost btn-sm edit-cancel-btn">Cancelar</button>
            <button class="btn btn-primary btn-sm edit-save-btn">Salvar</button>
          </div>
        </div>
      `;

      li.querySelector('.edit-cancel-btn').addEventListener('click', () => {
        addrEditingId = null;
        renderAddresses();
      });

      li.querySelector('.edit-save-btn').addEventListener('click', async () => {
        const newLabel = li.querySelector('.edit-label-input').value.trim();
        const newStreet = li.querySelector('.edit-street-input').value.trim();
        const newCity = li.querySelector('.edit-city-input').value.trim();
        if (!newLabel || !newStreet || !newCity) return;

        entry.label = newLabel;
        entry.name = li.querySelector('.edit-name-input').value.trim();
        entry.street = newStreet;
        entry.neighborhood = li.querySelector('.edit-neighborhood-input').value.trim();
        entry.city = newCity;
        entry.state = li.querySelector('.edit-state-input').value.trim().toUpperCase();
        entry.zip = li.querySelector('.edit-zip-input').value.trim();
        entry.phone = li.querySelector('.edit-phone-input').value.trim();

        await chrome.storage.local.set({ savedAddresses: addresses });
        addrEditingId = null;
        renderAddresses();
      });

      addressesList.appendChild(li);
      return;
    }

    const expanded = addrExpandedId === entry.id;
    const cityState = [entry.city, entry.state].filter(Boolean).join(' - ');

    li.classList.toggle('credential-item-expanded', expanded);
    li.innerHTML = `
      <div class="credential-info">
        <span class="credential-title">${escHtml(entry.label)}</span>
        <span class="credential-sub">${escHtml(entry.street)}, ${escHtml(cityState)}</span>
      </div>
      <div class="page-actions" style="opacity:1">
        <button class="page-action-btn addr-expand-btn" title="${expanded ? 'Recolher' : 'Expandir'}" aria-label="Expandir endereço">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="${expanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"/></svg>
        </button>
        <button class="page-action-btn addr-copy-btn" title="Copiar endereço completo" aria-label="Copiar endereço completo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button class="page-action-btn addr-edit-btn" title="Editar" aria-label="Editar endereço">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
        </button>
        <button class="page-action-btn delete-btn addr-delete-btn" title="Remover" aria-label="Remover endereço">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    `;

    if (expanded) {
      const detail = document.createElement('div');
      detail.className = 'address-detail';
      const fields = [
        ['Nome', entry.name],
        ['Rua', entry.street],
        ['Bairro', entry.neighborhood],
        ['Cidade', entry.city],
        ['Estado', entry.state],
        ['CEP', entry.zip],
        ['Telefone', entry.phone]
      ].filter(([, v]) => !!v);

      detail.innerHTML = fields.map(([label, value]) => `
        <div class="address-detail-row">
          <span class="address-detail-label">${escHtml(label)}</span>
          <span class="address-detail-value">${escHtml(value)}</span>
          <button class="page-action-btn addr-copy-field-btn" data-value="${escHtml(value)}" title="Copiar ${escHtml(label)}" aria-label="Copiar ${escHtml(label)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      `).join('');

      li.appendChild(detail);

      detail.querySelectorAll('.addr-copy-field-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          try {
            await navigator.clipboard.writeText(btn.dataset.value || '');
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
          } catch {}
        });
      });
    }

    li.querySelector('.addr-expand-btn').addEventListener('click', () => {
      addrExpandedId = expanded ? null : entry.id;
      renderAddresses();
    });

    li.querySelector('.addr-copy-btn').addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(addressFullText(entry));
        e.currentTarget.classList.add('copied');
        setTimeout(() => e.currentTarget.classList.remove('copied'), 1200);
      } catch {}
    });

    li.querySelector('.addr-edit-btn').addEventListener('click', () => {
      addrEditingId = entry.id;
      renderAddresses();
    });

    li.querySelector('.addr-delete-btn').addEventListener('click', async () => {
      addresses = addresses.filter(a => a.id !== entry.id);
      await chrome.storage.local.set({ savedAddresses: addresses });
      renderAddresses();
    });

    addressesList.appendChild(li);
  });
}

// ── Google Drive ─────────────────────────────────────────────────────────
function showGdrivePanel(panel) {
  gdriveLoginPanel.classList.toggle('hidden', panel !== 'login');
  gdriveSettingsPanel.classList.toggle('hidden', panel !== 'settings');
  gdriveBrowserPanel.classList.toggle('hidden', panel !== 'browser');
}

async function initGDriveScreen() {
  gdriveRedirectUri.value = window.GDriveAuth.getRedirectUri();
  gdriveSearchInput.value = gdriveSearchQuery;
  [...gdriveFilterPills.children].forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === gdriveFilter);
  });
  const savedClientId = await window.GDriveAuth.getClientId();
  if (savedClientId) gdriveClientIdInput.value = savedClientId;

  const token = await window.GDriveAuth.getValidToken();
  if (token) {
    await activateGdriveBrowser();
  } else {
    showGdrivePanel('login');
  }
}

function setGdriveLoginStatus(msg, kind) {
  gdriveLoginStatus.textContent = msg;
  gdriveLoginStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  gdriveLoginStatus.classList.remove('hidden');
}

function setGdriveSettingsStatus(msg, kind) {
  gdriveSettingsStatus.textContent = msg;
  gdriveSettingsStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  gdriveSettingsStatus.classList.remove('hidden');
}

btnGdriveGotoSettings.addEventListener('click', () => {
  gdrivePrevPanel = 'login';
  showGdrivePanel('settings');
});

btnGdriveBackSettings.addEventListener('click', () => showGdrivePanel(gdrivePrevPanel));

btnGdriveCopyRedirect.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(gdriveRedirectUri.value);
    btnGdriveCopyRedirect.classList.add('copied');
    setTimeout(() => btnGdriveCopyRedirect.classList.remove('copied'), 1200);
  } catch {}
});

btnGdriveLogin.addEventListener('click', async () => {
  const clientId = await window.GDriveAuth.getClientId();
  if (!clientId) {
    setGdriveLoginStatus('Configure o Client ID antes de conectar.', 'error');
    gdrivePrevPanel = 'login';
    showGdrivePanel('settings');
    return;
  }
  btnGdriveLogin.disabled = true;
  try {
    await window.GDriveAuth.signIn();
    await activateGdriveBrowser();
  } catch (err) {
    setGdriveLoginStatus(err.message || 'Erro ao conectar ao Google.', 'error');
  } finally {
    btnGdriveLogin.disabled = false;
  }
});

btnGdriveSaveSettings.addEventListener('click', async () => {
  const clientId = gdriveClientIdInput.value.trim();
  if (!clientId) return setGdriveSettingsStatus('Informe um Client ID válido.', 'error');

  await window.GDriveAuth.setClientId(clientId);
  btnGdriveSaveSettings.disabled = true;
  setGdriveSettingsStatus('Conectando…');
  try {
    await window.GDriveAuth.signIn();
    await activateGdriveBrowser();
  } catch (err) {
    setGdriveSettingsStatus(err.message || 'Erro ao conectar. Verifique as credenciais.', 'error');
  } finally {
    btnGdriveSaveSettings.disabled = false;
  }
});

btnGdriveLogout.addEventListener('click', async () => {
  await window.GDriveAuth.signOut();
  gdriveFolderId = 'root';
  gdriveBreadcrumbs = [{ id: 'root', name: 'Meu Drive' }];
  gdriveSearchQuery = '';
  gdriveFilter = 'all';
  showGdrivePanel('login');
});

btnGdriveRefresh.addEventListener('click', async () => {
  await loadGdriveQuota();
  await loadGdriveFiles();
});

async function activateGdriveBrowser() {
  showGdrivePanel('browser');
  await loadGdriveProfile();
  await loadGdriveQuota();
  await loadGdriveFiles();
}

async function loadGdriveProfile() {
  const { gdrive_user_profile: profile } = await chrome.storage.local.get('gdrive_user_profile');
  gdriveUserName.textContent = profile?.name || 'Usuário Google';
  gdriveUserEmail.textContent = profile?.email || '';
  if (profile?.picture) {
    gdriveAvatar.src = profile.picture;
    gdriveAvatar.classList.remove('hidden');
  } else {
    gdriveAvatar.classList.add('hidden');
  }
}

async function loadGdriveQuota() {
  try {
    const quota = await window.GDriveService.getStorageQuota();
    if (!quota || !quota.limit) {
      gdriveQuotaLabel.textContent = '';
      gdriveQuotaFill.style.width = '0%';
      return;
    }
    const used = Number(quota.usage || 0);
    const total = Number(quota.limit || 0);
    const percent = Math.min(100, Math.round((used / total) * 100));
    gdriveQuotaLabel.textContent = `${window.GDriveService.formatBytes(used)} de ${window.GDriveService.formatBytes(total)} usados`;
    gdriveQuotaFill.style.width = `${percent}%`;
  } catch {}
}

async function loadGdriveFiles() {
  renderGdriveBreadcrumbs();
  gdriveFilesList.innerHTML = '';
  try {
    const files = await window.GDriveService.listFiles({ folderId: gdriveFolderId, query: gdriveSearchQuery, filterType: gdriveFilter });
    renderGdriveFiles(files);
  } catch (err) {
    if (err.message?.includes('AUTH_REQUIRED') || err.message?.includes('AUTH_EXPIRED')) {
      showGdrivePanel('login');
      setGdriveLoginStatus('Sessão expirada. Conecte novamente.', 'error');
    } else {
      gdriveEmptyState.classList.remove('hidden');
      gdriveEmptyText.textContent = 'Erro ao carregar arquivos do Drive.';
    }
  }
}

function renderGdriveBreadcrumbs() {
  gdriveBreadcrumbsEl.innerHTML = '';
  if (gdriveSearchQuery) {
    const span = document.createElement('span');
    span.className = 'crumb active';
    span.textContent = `Busca: "${gdriveSearchQuery}"`;
    gdriveBreadcrumbsEl.appendChild(span);
    return;
  }
  gdriveBreadcrumbs.forEach((item, index) => {
    if (index > 0) {
      const sep = document.createElement('span');
      sep.textContent = '/';
      gdriveBreadcrumbsEl.appendChild(sep);
    }
    const isLast = index === gdriveBreadcrumbs.length - 1;
    const span = document.createElement('span');
    span.className = `crumb ${isLast ? 'active' : ''}`;
    span.textContent = item.name;
    if (!isLast) {
      span.addEventListener('click', async () => {
        gdriveBreadcrumbs = gdriveBreadcrumbs.slice(0, index + 1);
        gdriveFolderId = item.id;
        await loadGdriveFiles();
      });
    }
    gdriveBreadcrumbsEl.appendChild(span);
  });
}

const GDRIVE_ICON_SVG = {
  folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
  'file-text': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/>',
  tv: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  file: '<path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>'
};

function renderGdriveFiles(files) {
  gdriveFilesList.innerHTML = '';
  if (!files || files.length === 0) {
    gdriveEmptyState.classList.remove('hidden');
    gdriveEmptyText.textContent = gdriveSearchQuery ? `Nenhum arquivo encontrado para "${gdriveSearchQuery}".` : 'Nenhum arquivo encontrado nesta pasta.';
    return;
  }
  gdriveEmptyState.classList.add('hidden');

  files.forEach(file => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const meta = window.GDriveService.getFileMeta(file);
    const li = document.createElement('li');
    li.className = 'download-item';
    li.style.cursor = 'pointer';

    const sizeLabel = !isFolder && file.size ? ` · ${window.GDriveService.formatBytes(file.size)}` : '';
    // Determine download URL (webContentLink for downloadable files, export for Google Docs)
    const isGoogleNative = file.mimeType && file.mimeType.startsWith('application/vnd.google-apps') && file.mimeType !== 'application/vnd.google-apps.folder';
    const downloadUrl = file.webContentLink || null;
    const exportUrl = isGoogleNative ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application%2Fpdf` : null;
    const hasDownload = !isFolder && (downloadUrl || exportUrl);

    li.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--accent-light)">${GDRIVE_ICON_SVG[meta.icon] || GDRIVE_ICON_SVG.file}</svg>
      <span class="download-name">${escHtml(file.name)} <span style="color:var(--text-muted)">— ${window.GDriveService.formatDate(file.modifiedTime)}${sizeLabel}</span></span>
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${hasDownload ? `<button class="page-action-btn gdrive-download-btn" title="Baixar arquivo" style="color:var(--accent-light)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>` : ''}
        ${!isFolder && file.webViewLink ? `<button class="page-action-btn gdrive-open-btn" title="Abrir no Google Drive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>` : ''}
      </div>
    `;

    li.addEventListener('click', async (e) => {
      if (e.target.closest('.gdrive-open-btn') || e.target.closest('.gdrive-download-btn')) return;
      if (isFolder) {
        gdriveBreadcrumbs.push({ id: file.id, name: file.name });
        gdriveFolderId = file.id;
        gdriveSearchQuery = '';
        gdriveSearchInput.value = '';
        await loadGdriveFiles();
      } else if (file.webViewLink) {
        chrome.tabs.create({ url: file.webViewLink });
      }
    });

    li.querySelector('.gdrive-open-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: file.webViewLink });
    });

    li.querySelector('.gdrive-download-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (downloadUrl) {
        chrome.tabs.create({ url: downloadUrl });
      } else if (exportUrl) {
        // For Google native formats, open the export PDF URL
        const token = await window.GDriveAuth.getValidToken();
        if (token) {
          chrome.tabs.create({ url: exportUrl + `&access_token=${token}` });
        } else {
          chrome.tabs.create({ url: file.webViewLink });
        }
      }
    });

    gdriveFilesList.appendChild(li);
  });
}

gdriveSearchInput.addEventListener('input', () => {
  clearTimeout(gdriveSearchDebounce);
  gdriveSearchDebounce = setTimeout(async () => {
    gdriveSearchQuery = gdriveSearchInput.value.trim();
    saveUserSettings({ gdriveSearchQuery });
    await loadGdriveFiles();
  }, 350);
});

gdriveFilterPills.addEventListener('click', async (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  gdriveFilter = chip.dataset.filter;
  saveUserSettings({ gdriveFilter });
  [...gdriveFilterPills.children].forEach(c => c.classList.toggle('active', c === chip));
  await loadGdriveFiles();
});

// ── Helpers ───────────────────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function getFaviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
  } catch { return ''; }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Cloud Provider Tab Switch (GDrive / OneDrive) ────────────────────────────
let activeCloudProvider = 'gdrive'; // 'gdrive' | 'onedrive'

(function initCloudProviderTabs() {
  const toggle = document.getElementById('cloud-provider-toggle');
  const toggleLabel = document.getElementById('cloud-provider-toggle-label');
  const list = document.getElementById('cloud-provider-list');
  if (!toggle || !list) return;

  const closeList = () => {
    list.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = list.classList.contains('hidden');
    list.classList.toggle('hidden', !willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', (e) => {
    if (!list.classList.contains('hidden') && !e.target.closest('#cloud-provider-dropdown')) closeList();
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.cloud-dropdown-item');
    if (!item) return;
    const cloud = item.dataset.cloud;
    activeCloudProvider = cloud;
    saveUserSettings({ activeCloudProvider: cloud });
    toggleLabel.textContent = item.textContent.trim();
    [...list.children].forEach(b => {
      const active = b === item;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    document.getElementById('gdrive-cloud-panel')?.classList.toggle('hidden', cloud !== 'gdrive');
    document.getElementById('onedrive-cloud-panel')?.classList.toggle('hidden', cloud !== 'onedrive');
    closeList();
    if (cloud === 'onedrive') initOneDriveScreen();
  });
})();

// ── OneDrive Integration ──────────────────────────────────────────────────────
const ONEDRIVE_CONFIG = {
  AUTH_ENDPOINT: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  REVOKE_ENDPOINT: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
  GRAPH_BASE: 'https://graph.microsoft.com/v1.0',
  SCOPES: 'files.read user.read',
  KEYS: {
    ACCOUNTS: 'onedrive_accounts',
    ACTIVE_ACCOUNT: 'onedrive_active_account'
  }
};

let onedriveFolderId = 'root';
let onedriveBreadcrumbs = [{ id: 'root', name: 'Meu OneDrive' }];
let onedriveSearchQuery = '';
let onedriveFilter = 'all';
let onedriveSearchDebounce = null;
let onedriveInitialized = false;

function showOnedrivePanel(panel) {
  document.getElementById('onedrive-login-panel')?.classList.toggle('hidden', panel !== 'login');
  document.getElementById('onedrive-settings-panel')?.classList.toggle('hidden', panel !== 'settings');
  document.getElementById('onedrive-browser-panel')?.classList.toggle('hidden', panel !== 'browser');
}

async function getOnedriveAccounts() {
  const data = await chrome.storage.local.get(ONEDRIVE_CONFIG.KEYS.ACCOUNTS);
  return data[ONEDRIVE_CONFIG.KEYS.ACCOUNTS] || [];
}

async function getOnedriveActiveAccount() {
  const data = await chrome.storage.local.get([ONEDRIVE_CONFIG.KEYS.ACCOUNTS, ONEDRIVE_CONFIG.KEYS.ACTIVE_ACCOUNT]);
  const accounts = data[ONEDRIVE_CONFIG.KEYS.ACCOUNTS] || [];
  const activeId = data[ONEDRIVE_CONFIG.KEYS.ACTIVE_ACCOUNT];
  return accounts.find(a => a.id === activeId) || accounts[0] || null;
}

async function getOnedriveClientId() {
  const data = await chrome.storage.local.get('onedrive_client_id');
  return data['onedrive_client_id'] || '';
}

async function onedriveSignIn({ interactive = true } = {}) {
  const clientId = await getOnedriveClientId();
  if (!clientId) throw new Error('CONFIG_REQUIRED: Client ID não configurado');
  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = new URL(ONEDRIVE_CONFIG.AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', ONEDRIVE_CONFIG.SCOPES);
  authUrl.searchParams.set('prompt', interactive ? 'select_account' : 'none');

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive }, (redirectUrl) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!redirectUrl) return reject(new Error('Login cancelado pelo usuário.'));
      resolve(redirectUrl);
    });
  });

  const parsedUrl = new URL(responseUrl);
  const hash = parsedUrl.hash.substring(1);
  const params = new URLSearchParams(hash || parsedUrl.search);
  const token = params.get('access_token');
  const expiresIn = params.get('expires_in') || '3600';
  const error = params.get('error');
  if (error) throw new Error(`Erro da Microsoft: ${error}`);
  if (!token) throw new Error('Não foi possível obter o token de acesso.');

  // Fetch user profile
  const profileRes = await fetch(`${ONEDRIVE_CONFIG.GRAPH_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!profileRes.ok) throw new Error('Falha ao obter perfil Microsoft.');
  const profile = await profileRes.json();

  const account = {
    id: profile.id || `ms_${Date.now()}`,
    name: profile.displayName || 'Usuário Microsoft',
    email: profile.mail || profile.userPrincipalName || '',
    token,
    tokenExpiry: Date.now() + parseInt(expiresIn, 10) * 1000
  };

  const accounts = await getOnedriveAccounts();
  const existing = accounts.findIndex(a => a.id === account.id);
  if (existing >= 0) accounts[existing] = account;
  else accounts.push(account);

  await chrome.storage.local.set({
    [ONEDRIVE_CONFIG.KEYS.ACCOUNTS]: accounts,
    [ONEDRIVE_CONFIG.KEYS.ACTIVE_ACCOUNT]: account.id
  });
  return account;
}

async function onedriveSignOut(accountId) {
  const accounts = await getOnedriveAccounts();
  const filtered = accounts.filter(a => a.id !== accountId);
  const active = filtered[0]?.id || null;
  await chrome.storage.local.set({
    [ONEDRIVE_CONFIG.KEYS.ACCOUNTS]: filtered,
    [ONEDRIVE_CONFIG.KEYS.ACTIVE_ACCOUNT]: active
  });
}

async function getValidOnedriveToken() {
  let account = await getOnedriveActiveAccount();
  if (!account?.token) return null;

  // Token expirado (ou perto de expirar): tenta renovar silenciosamente antes de usar.
  if (!account.tokenExpiry || Date.now() > account.tokenExpiry - 60000) {
    try {
      account = await onedriveSignIn({ interactive: false });
    } catch {
      // Renovação silenciosa falhou (ex: sessão da Microsoft expirou de vez) —
      // devolve o token atual mesmo assim e deixa a chamada à API decidir.
    }
  }
  return account?.token || null;
}

async function loadOnedriveFiles() {
  renderOnedriveBreadcrumbs();
  const listEl = document.getElementById('onedrive-files-list');
  const emptyEl = document.getElementById('onedrive-empty-state');
  const emptyText = document.getElementById('onedrive-empty-text');
  if (!listEl) return;
  listEl.innerHTML = '';

  try {
    let token = await getValidOnedriveToken();
    if (!token) { showOnedrivePanel('login'); return; }

    let url;
    if (onedriveSearchQuery.trim()) {
      url = `${ONEDRIVE_CONFIG.GRAPH_BASE}/me/drive/root/search(q='${encodeURIComponent(onedriveSearchQuery)}')?$select=id,name,folder,size,lastModifiedDateTime,file,webUrl,@microsoft.graph.downloadUrl&$top=50`;
    } else if (onedriveFolderId === 'root') {
      url = `${ONEDRIVE_CONFIG.GRAPH_BASE}/me/drive/root/children?$select=id,name,folder,size,lastModifiedDateTime,file,webUrl,@microsoft.graph.downloadUrl&$orderby=folder%20desc,lastModifiedDateTime%20desc&$top=50`;
    } else {
      url = `${ONEDRIVE_CONFIG.GRAPH_BASE}/me/drive/items/${onedriveFolderId}/children?$select=id,name,folder,size,lastModifiedDateTime,file,webUrl,@microsoft.graph.downloadUrl&$orderby=folder%20desc,lastModifiedDateTime%20desc&$top=50`;
    }

    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      // Token pode ter expirado entre a checagem e a chamada — tenta renovar uma vez e refazer.
      try {
        const refreshed = await onedriveSignIn({ interactive: false });
        token = refreshed.token;
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }
    if (!res.ok) {
      if (res.status === 401) { showOnedrivePanel('login'); setOnedriveStatus('Sessão expirada. Conecte novamente.', 'error'); return; }
      throw new Error(`Erro HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.value || [];

    // Apply filter
    const filtered = items.filter(item => {
      if (onedriveFilter === 'all') return true;
      if (onedriveFilter === 'folder') return !!item.folder;
      if (onedriveFilter === 'document') return item.file?.mimeType?.includes('word') || item.file?.mimeType?.includes('document');
      if (onedriveFilter === 'image') return item.file?.mimeType?.startsWith('image/');
      if (onedriveFilter === 'pdf') return item.file?.mimeType === 'application/pdf';
      return true;
    });

    if (filtered.length === 0) {
      emptyEl?.classList.remove('hidden');
      if (emptyText) emptyText.textContent = onedriveSearchQuery ? `Nenhum arquivo encontrado para "${onedriveSearchQuery}".` : 'Nenhum arquivo encontrado aqui.';
      return;
    }
    emptyEl?.classList.add('hidden');
    renderOnedriveFiles(filtered, token);
  } catch (err) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (emptyText) emptyText.textContent = 'Erro ao carregar arquivos do OneDrive.';
  }
}

function setOnedriveStatus(msg, kind) {
  const el = document.getElementById('onedrive-login-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-msg' + (kind ? ` ${kind}` : '');
  el.classList.remove('hidden');
}

function renderOnedriveBreadcrumbs() {
  const el = document.getElementById('onedrive-breadcrumbs');
  if (!el) return;
  el.innerHTML = '';
  if (onedriveSearchQuery) {
    const span = document.createElement('span');
    span.className = 'crumb active';
    span.textContent = `Busca: "${onedriveSearchQuery}"`;
    el.appendChild(span);
    return;
  }
  onedriveBreadcrumbs.forEach((item, index) => {
    if (index > 0) { const sep = document.createElement('span'); sep.textContent = '/'; el.appendChild(sep); }
    const isLast = index === onedriveBreadcrumbs.length - 1;
    const span = document.createElement('span');
    span.className = `crumb ${isLast ? 'active' : ''}`;
    span.textContent = item.name;
    if (!isLast) {
      span.addEventListener('click', async () => {
        onedriveBreadcrumbs = onedriveBreadcrumbs.slice(0, index + 1);
        onedriveFolderId = item.id;
        await loadOnedriveFiles();
      });
    }
    el.appendChild(span);
  });
}

function onedriveFormatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function renderOnedriveFiles(items, token) {
  const listEl = document.getElementById('onedrive-files-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  items.forEach(item => {
    const isFolder = !!item.folder;
    const li = document.createElement('li');
    li.className = 'download-item';
    li.style.cursor = 'pointer';

    const icon = isFolder ? GDRIVE_ICON_SVG.folder : (item.file?.mimeType?.startsWith('image/') ? GDRIVE_ICON_SVG.image : (item.file?.mimeType === 'application/pdf' ? GDRIVE_ICON_SVG.file : (item.file?.mimeType?.includes('word') || item.file?.mimeType?.includes('document') ? GDRIVE_ICON_SVG['file-text'] : (item.file?.mimeType?.includes('sheet') || item.file?.mimeType?.includes('excel') ? GDRIVE_ICON_SVG.table : GDRIVE_ICON_SVG.file))));
    const sizeLabel = !isFolder && item.size ? ` · ${window.GDriveService.formatBytes(item.size)}` : '';
    const downloadLink = item['@microsoft.graph.downloadUrl'] || null;

    li.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#0078d4">${icon}</svg>
      <span class="download-name">${escHtml(item.name)} <span style="color:var(--text-muted)">— ${onedriveFormatDate(item.lastModifiedDateTime)}${sizeLabel}</span></span>
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${!isFolder && downloadLink ? `<button class="page-action-btn onedrive-download-btn" title="Baixar arquivo" style="color:#0078d4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>` : ''}
        ${!isFolder && item.webUrl ? `<button class="page-action-btn onedrive-open-btn" title="Abrir no OneDrive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>` : ''}
      </div>
    `;

    li.addEventListener('click', async (e) => {
      if (e.target.closest('.onedrive-open-btn') || e.target.closest('.onedrive-download-btn')) return;
      if (isFolder) {
        onedriveBreadcrumbs.push({ id: item.id, name: item.name });
        onedriveFolderId = item.id;
        onedriveSearchQuery = '';
        const si = document.getElementById('onedrive-search-input');
        if (si) si.value = '';
        await loadOnedriveFiles();
      } else if (item.webUrl) {
        chrome.tabs.create({ url: item.webUrl });
      }
    });

    li.querySelector('.onedrive-open-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: item.webUrl });
    });

    li.querySelector('.onedrive-download-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: downloadLink });
    });

    listEl.appendChild(li);
  });
}

async function updateOnedriveAccountsBar() {
  const accounts = await getOnedriveAccounts();
  const activeAcc = await getOnedriveActiveAccount();
  const bar = document.getElementById('onedrive-accounts-bar');
  const select = document.getElementById('onedrive-account-select');
  if (!bar || !select) return;
  if (accounts.length > 0) {
    bar.classList.remove('hidden');
    select.innerHTML = '';
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = `${acc.name} (${acc.email || acc.id})`;
      if (acc.id === activeAcc?.id) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = async () => {
      await chrome.storage.local.set({ [ONEDRIVE_CONFIG.KEYS.ACTIVE_ACCOUNT]: select.value });
      onedriveFolderId = 'root';
      onedriveBreadcrumbs = [{ id: 'root', name: 'Meu OneDrive' }];
      await activateOnedriveBrowser();
    };
  } else {
    bar.classList.add('hidden');
  }
}

async function activateOnedriveBrowser() {
  const account = await getOnedriveActiveAccount();
  if (!account) { showOnedrivePanel('login'); return; }
  showOnedrivePanel('browser');
  const nameEl = document.getElementById('onedrive-user-name');
  const emailEl = document.getElementById('onedrive-user-email');
  const initialsEl = document.getElementById('onedrive-avatar-initials');
  if (nameEl) nameEl.textContent = account.name || 'Usuário Microsoft';
  if (emailEl) emailEl.textContent = account.email || '';
  if (initialsEl) initialsEl.textContent = (account.name || 'MS').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  await updateOnedriveAccountsBar();
  // Fetch quota
  try {
    const token = await getValidOnedriveToken();
    const qRes = await fetch(`${ONEDRIVE_CONFIG.GRAPH_BASE}/me/drive?$select=quota`, { headers: { Authorization: `Bearer ${token}` } });
    if (qRes.ok) {
      const qData = await qRes.json();
      const used = qData.quota?.used || 0;
      const total = qData.quota?.total || 0;
      const quotaFill = document.getElementById('onedrive-quota-fill');
      const quotaLabel = document.getElementById('onedrive-quota-label');
      if (quotaFill && total > 0) quotaFill.style.width = `${Math.min(100, Math.round((used / total) * 100))}%`;
      if (quotaLabel) quotaLabel.textContent = `${window.GDriveService.formatBytes(used)} de ${window.GDriveService.formatBytes(total)} usados`;
    }
  } catch {}
  await loadOnedriveFiles();
}

async function initOneDriveScreen() {
  if (!onedriveInitialized) {
    setupOnedriveEvents();
    onedriveInitialized = true;
  }
  const redirectUriEl = document.getElementById('onedrive-redirect-uri');
  if (redirectUriEl) redirectUriEl.value = chrome.identity.getRedirectURL();
  const searchInput = document.getElementById('onedrive-search-input');
  if (searchInput) searchInput.value = onedriveSearchQuery;
  const filterPills = document.getElementById('onedrive-filter-pills');
  if (filterPills) {
    [...filterPills.children].forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === onedriveFilter);
    });
  }
  const clientId = await getOnedriveClientId();
  const clientIdInput = document.getElementById('onedrive-client-id-input');
  if (clientIdInput && clientId) clientIdInput.value = clientId;
  const account = await getOnedriveActiveAccount();
  if (account?.token) {
    await activateOnedriveBrowser();
  } else {
    showOnedrivePanel('login');
    await updateOnedriveAccountsBar();
  }
}

function setupOnedriveEvents() {
  // Login btn
  document.getElementById('btn-onedrive-login')?.addEventListener('click', async () => {
    const clientId = await getOnedriveClientId();
    if (!clientId) {
      setOnedriveStatus('Configure o Client ID antes de conectar.', 'error');
      showOnedrivePanel('settings');
      return;
    }
    document.getElementById('btn-onedrive-login').disabled = true;
    try {
      await onedriveSignIn();
      await activateOnedriveBrowser();
    } catch (err) {
      setOnedriveStatus(err.message || 'Erro ao conectar ao OneDrive.', 'error');
    } finally {
      document.getElementById('btn-onedrive-login').disabled = false;
    }
  });

  // Add another account
  document.getElementById('btn-onedrive-add-account')?.addEventListener('click', async () => {
    const clientId = await getOnedriveClientId();
    if (!clientId) { setOnedriveStatus('Configure o Client ID primeiro.', 'error'); showOnedrivePanel('settings'); return; }
    try {
      await onedriveSignIn();
      await activateOnedriveBrowser();
      setOnedriveStatus('Nova conta conectada com sucesso!', 'success');
    } catch (err) {
      setOnedriveStatus(err.message || 'Erro ao adicionar conta.', 'error');
    }
  });

  // Remove selected account
  document.getElementById('btn-onedrive-remove-account')?.addEventListener('click', async () => {
    const select = document.getElementById('onedrive-account-select');
    const id = select?.value;
    if (!id) return;
    await onedriveSignOut(id);
    const acc = await getOnedriveActiveAccount();
    if (acc) await activateOnedriveBrowser(); else showOnedrivePanel('login');
    await updateOnedriveAccountsBar();
  });

  // Settings
  document.getElementById('btn-onedrive-goto-settings')?.addEventListener('click', () => showOnedrivePanel('settings'));
  document.getElementById('btn-onedrive-back-settings')?.addEventListener('click', () => showOnedrivePanel('login'));

  document.getElementById('btn-onedrive-copy-redirect')?.addEventListener('click', async () => {
    const el = document.getElementById('onedrive-redirect-uri');
    if (el?.value) await navigator.clipboard.writeText(el.value);
  });

  document.getElementById('btn-onedrive-save-settings')?.addEventListener('click', async () => {
    const input = document.getElementById('onedrive-client-id-input');
    const clientId = input?.value.trim();
    if (!clientId) return;
    await chrome.storage.local.set({ onedrive_client_id: clientId });
    const statusEl = document.getElementById('onedrive-settings-status');
    if (statusEl) { statusEl.textContent = 'Conectando…'; statusEl.className = 'status-msg'; statusEl.classList.remove('hidden'); }
    try {
      await onedriveSignIn();
      await activateOnedriveBrowser();
    } catch (err) {
      if (statusEl) { statusEl.textContent = err.message || 'Erro ao conectar.'; statusEl.className = 'status-msg error'; }
    }
  });

  // Switch account (show login panel with account select)
  document.getElementById('btn-onedrive-switch-account')?.addEventListener('click', () => {
    showOnedrivePanel('login');
    updateOnedriveAccountsBar();
  });

  // Logout
  document.getElementById('btn-onedrive-logout')?.addEventListener('click', async () => {
    const acc = await getOnedriveActiveAccount();
    if (acc) await onedriveSignOut(acc.id);
    onedriveFolderId = 'root';
    onedriveBreadcrumbs = [{ id: 'root', name: 'Meu OneDrive' }];
    showOnedrivePanel('login');
    await updateOnedriveAccountsBar();
  });

  // Refresh
  document.getElementById('btn-onedrive-refresh')?.addEventListener('click', () => loadOnedriveFiles());

  // Search
  document.getElementById('onedrive-search-input')?.addEventListener('input', (e) => {
    clearTimeout(onedriveSearchDebounce);
    onedriveSearchDebounce = setTimeout(() => {
      onedriveSearchQuery = e.target.value.trim();
      saveUserSettings({ onedriveSearchQuery });
      loadOnedriveFiles();
    }, 350);
  });

  // Filter chips
  document.getElementById('onedrive-filter-pills')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    onedriveFilter = chip.dataset.filter;
    saveUserSettings({ onedriveFilter });
    [...document.getElementById('onedrive-filter-pills').children].forEach(c => c.classList.toggle('active', c === chip));
    loadOnedriveFiles();
  });
}

// ── E-mail Temporário ──────────────────────────────────────────────────────
let emailInitialized = false;
let tempMailPollInterval = null;
let currentOpenMessageId = null;
let currentOpenMessageData = null;

async function initEmailScreen() {
  if (!emailInitialized) {
    setupEmailEvents();
    emailInitialized = true;
  }
  await populateTempMailAccountSelect();
  await startTempMailPolling();
}

function setupEmailEvents() {
  const accountSelect     = document.getElementById('temp-mail-account-select');
  const btnCopyTempMail   = document.getElementById('btn-copy-temp-mail');
  const btnDeleteAccount  = document.getElementById('btn-delete-temp-account');
  const btnRefreshTempMail = document.getElementById('btn-refresh-temp-mail');
  const btnNewTempMail    = document.getElementById('btn-new-temp-mail');
  const btnReaderBack     = document.getElementById('btn-reader-back');
  const btnReaderDownload = document.getElementById('btn-reader-download');
  const btnReaderDelete   = document.getElementById('btn-reader-delete');

  // Trocar de e-mail temporário ativo
  accountSelect?.addEventListener('change', async () => {
    await window.TempMailService.setActiveAccountId(accountSelect.value);
    await refreshTempMailMessages(false);
  });

  // Copiar e-mail temporário ativo
  btnCopyTempMail?.addEventListener('click', () => {
    const address = accountSelect?.selectedOptions?.[0]?.textContent || '';
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        setTempMailStatus('Endereço de e-mail copiado!', 'success');
        btnCopyTempMail.classList.add('copied');
        setTimeout(() => btnCopyTempMail.classList.remove('copied'), 1500);
      });
    }
  });

  // Excluir e-mail temporário ativo
  btnDeleteAccount?.addEventListener('click', async () => {
    const activeId = accountSelect?.value;
    if (!activeId) return;
    if (!confirm('Excluir este e-mail temporário e todas as mensagens recebidas nele?')) return;
    try {
      setTempMailStatus('Excluindo e-mail temporário…');
      await window.TempMailService.deleteAccount(activeId);
      await populateTempMailAccountSelect();
      setTempMailStatus('E-mail temporário excluído.', 'success');
    } catch (err) {
      setTempMailStatus('Erro ao excluir: ' + (err?.message || err), 'error');
    }
  });

  // Atualizar mensagens
  btnRefreshTempMail?.addEventListener('click', async () => {
    await refreshTempMailMessages(false);
  });

  // Criar novo e-mail temporário
  btnNewTempMail?.addEventListener('click', async () => {
    btnNewTempMail.disabled = true;
    setTempMailStatus('Criando novo endereço de e-mail temporário…');
    try {
      await window.TempMailService.createNewAccount();
      await populateTempMailAccountSelect();
      setTempMailStatus('Novo e-mail gerado com sucesso!', 'success');
    } catch (err) {
      setTempMailStatus('Erro ao gerar novo e-mail: ' + (err?.message || err), 'error');
    } finally {
      btnNewTempMail.disabled = false;
    }
  });

  // Voltar do leitor de mensagem para a lista
  btnReaderBack?.addEventListener('click', () => {
    document.getElementById('temp-mail-reader')?.classList.add('hidden');
    document.getElementById('temp-mail-list-container')?.classList.remove('hidden');
    currentOpenMessageId = null;
    currentOpenMessageData = null;
    refreshTempMailMessages(true);
  });

  // Baixar mensagem aberta (.eml)
  btnReaderDownload?.addEventListener('click', async () => {
    if (!currentOpenMessageData) return;
    downloadMessageAsEml(currentOpenMessageData);
  });

  // Excluir mensagem aberta
  btnReaderDelete?.addEventListener('click', async () => {
    if (!currentOpenMessageId) return;
    const activeId = document.getElementById('temp-mail-account-select')?.value;
    try {
      setTempMailStatus('Excluindo mensagem…');
      await window.TempMailService.deleteMessage(activeId, currentOpenMessageId);
      document.getElementById('temp-mail-reader')?.classList.add('hidden');
      document.getElementById('temp-mail-list-container')?.classList.remove('hidden');
      currentOpenMessageId = null;
      currentOpenMessageData = null;
      setTempMailStatus('Mensagem excluída com sucesso.', 'success');
      await refreshTempMailMessages(true);
    } catch (err) {
      setTempMailStatus('Erro ao excluir mensagem: ' + (err?.message || err), 'error');
    }
  });
}

function setTempMailStatus(msg, kind) {
  const statusEl = document.getElementById('temp-mail-status');
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (kind ? ` ${kind}` : '');
  statusEl.classList.remove('hidden');
}

async function populateTempMailAccountSelect() {
  const select = document.getElementById('temp-mail-account-select');
  if (!select) return;

  setTempMailStatus('Conectando à caixa de entrada temporária…');
  try {
    // Garante que exista ao menos um e-mail temporário ativo.
    await window.TempMailService.getActiveAccount();

    const accounts = await window.TempMailService.getAccounts();
    const activeId = await window.TempMailService.getActiveAccountId();

    select.innerHTML = '';
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.address;
      if (acc.id === activeId) opt.selected = true;
      select.appendChild(opt);
    });

    setTempMailStatus('Caixa ativa e pronta para receber e-mails!', 'success');
    await refreshTempMailMessages(false);
  } catch (err) {
    setTempMailStatus('Erro ao carregar e-mail temporário: ' + (err?.message || err), 'error');
  }
}

async function startTempMailPolling() {
  if (tempMailPollInterval) clearInterval(tempMailPollInterval);
  tempMailPollInterval = setInterval(async () => {
    if (currentScreen === 'email' && !currentOpenMessageId) {
      await refreshTempMailMessages(true);
    }
  }, 12000);
}

async function refreshTempMailMessages(isSilent = false) {
  const listEl = document.getElementById('temp-mail-messages-list');
  const emptyEl = document.getElementById('temp-mail-empty');
  const msgCountEl = document.getElementById('temp-mail-msg-count');
  const activeId = document.getElementById('temp-mail-account-select')?.value;
  if (!activeId) return;

  if (!isSilent) setTempMailStatus('Verificando novas mensagens…');

  try {
    const messages = await window.TempMailService.getMessages(activeId);
    if (msgCountEl) msgCountEl.textContent = `${messages.length} mensagem(ns)`;

    if (messages.length === 0) {
      if (listEl) listEl.innerHTML = '';
      emptyEl?.classList.remove('hidden');
      if (!isSilent) setTempMailStatus('Nenhuma mensagem recebida ainda.', 'success');
      return;
    }

    emptyEl?.classList.add('hidden');
    renderTempMailMessages(messages, activeId);
    if (!isSilent) setTempMailStatus(`${messages.length} mensagem(ns) encontrada(s)!`, 'success');
  } catch (err) {
    if (!isSilent) setTempMailStatus('Falha ao atualizar mensagens: ' + (err?.message || err), 'error');
  }
}

function renderTempMailMessages(messages, accountId) {
  const listEl = document.getElementById('temp-mail-messages-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  messages.forEach(msg => {
    const li = document.createElement('li');
    const isSeen = msg.seen;
    li.className = `inbox-msg-card ${isSeen ? '' : 'unread'}`;

    const senderName = msg.from?.name || msg.from?.address || 'Remetente Desconhecido';
    const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const subject = msg.subject || '(Sem assunto)';
    const snippet = msg.intro || '';

    li.innerHTML = `
      <div class="inbox-msg-card-top">
        <span class="inbox-msg-sender" title="${escHtml(senderName)}">${escHtml(senderName)}</span>
        <span class="inbox-msg-time">${dateStr}</span>
      </div>
      <span class="inbox-msg-subject">${escHtml(subject)}</span>
      ${snippet ? `<span class="inbox-msg-snippet">${escHtml(snippet)}</span>` : ''}
      <div class="page-actions inbox-msg-actions" style="opacity:1">
        <button class="page-action-btn cred-copy-user-btn msg-copy-btn" title="Copiar e-mail do remetente" aria-label="Copiar e-mail do remetente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button class="page-action-btn cred-reveal-btn msg-open-btn" title="Abrir mensagem" aria-label="Abrir mensagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
        <button class="page-action-btn cred-edit-btn msg-download-btn" title="Baixar mensagem (.eml)" aria-label="Baixar mensagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/></svg>
        </button>
        <button class="page-action-btn delete-btn cred-delete-btn msg-delete-btn" title="Excluir mensagem" aria-label="Excluir mensagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    `;

    li.querySelector('.msg-copy-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(msg.from?.address || '');
        e.currentTarget.classList.add('copied');
        setTimeout(() => e.currentTarget.classList.remove('copied'), 1200);
      } catch {}
    });

    li.querySelector('.msg-open-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openTempMailMessage(accountId, msg.id);
    });

    li.querySelector('.msg-download-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const fullMsg = await window.TempMailService.getMessage(accountId, msg.id);
        downloadMessageAsEml(fullMsg);
      } catch {}
    });

    li.querySelector('.msg-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.TempMailService.deleteMessage(accountId, msg.id);
        await refreshTempMailMessages(true);
      } catch {}
    });

    li.addEventListener('click', () => {
      openTempMailMessage(accountId, msg.id);
    });

    listEl.appendChild(li);
  });
}

function downloadMessageAsEml(msg) {
  const from = `${msg.from?.name || ''} <${msg.from?.address || ''}>`;
  const to = Array.isArray(msg.to) ? msg.to.map(t => t.address).join(', ') : '';
  const date = msg.createdAt ? new Date(msg.createdAt).toUTCString() : new Date().toUTCString();
  const subject = msg.subject || '(Sem assunto)';
  const htmlBody = msg.html ? (Array.isArray(msg.html) ? msg.html.join('') : msg.html) : '';
  const body = htmlBody || msg.text || '';
  const contentType = htmlBody ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

  const eml = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Content-Type: ${contentType}`,
    '',
    body
  ].join('\r\n');

  const blob = new Blob([eml], { type: 'message/rfc822' });
  const objectUrl = URL.createObjectURL(blob);
  const safeSubject = subject.replace(/[^\w\-]+/g, '_').slice(0, 50) || 'email';
  chrome.downloads.download({ url: objectUrl, filename: `${safeSubject}.eml`, saveAs: true });
}

async function openTempMailMessage(accountId, messageId) {
  currentOpenMessageId = messageId;
  const listContainer = document.getElementById('temp-mail-list-container');
  const readerPanel = document.getElementById('temp-mail-reader');
  const readerSubject = document.getElementById('reader-subject');
  const readerFrom = document.getElementById('reader-from');
  const readerDate = document.getElementById('reader-date');
  const readerBodyContent = document.getElementById('reader-body-content');
  const reader2faCard = document.getElementById('reader-2fa-card');
  const reader2faCode = document.getElementById('reader-2fa-code');
  const readerAttachmentsBox = document.getElementById('reader-attachments-box');
  const readerAttachmentsList = document.getElementById('reader-attachments-list');

  setTempMailStatus('Carregando mensagem…');

  try {
    const msg = await window.TempMailService.getMessage(accountId, messageId);
    currentOpenMessageData = msg;
    listContainer?.classList.add('hidden');
    readerPanel?.classList.remove('hidden');

    if (readerSubject) readerSubject.textContent = msg.subject || '(Sem assunto)';
    if (readerFrom) readerFrom.textContent = `${msg.from?.name || ''} <${msg.from?.address || ''}>`;
    if (readerDate) readerDate.textContent = msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR') : '';

    // Extrator de código 2FA / OTP
    const rawContent = (msg.text || '') + ' ' + (msg.html ? (Array.isArray(msg.html) ? msg.html.join(' ') : msg.html) : '');
    const code = window.TempMailService.extractVerificationCode(rawContent, msg.subject);

    if (code && reader2faCard && reader2faCode) {
      reader2faCode.textContent = code;
      reader2faCard.classList.remove('hidden');
      const copyBtn = document.getElementById('btn-copy-2fa');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(code).then(() => {
            copyBtn.textContent = 'Copiado!';
            setTimeout(() => { copyBtn.textContent = 'Copiar Código'; }, 2000);
          });
        };
      }
    } else {
      reader2faCard?.classList.add('hidden');
    }

    // Renderizar corpo
    if (readerBodyContent) {
      readerBodyContent.innerHTML = '';
      if (msg.html && (Array.isArray(msg.html) ? msg.html.length : true)) {
        const htmlStr = Array.isArray(msg.html) ? msg.html.join('') : msg.html;
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.minHeight = '240px';
        iframe.style.border = 'none';
        iframe.style.background = 'white';
        iframe.style.borderRadius = 'var(--r-sm)';
        iframe.sandbox = 'allow-same-origin';
        iframe.srcdoc = `<style>body{font-family:sans-serif;font-size:13px;color:#111;margin:10px;line-height:1.4}a{color:#7c5cff}</style>${htmlStr}`;
        readerBodyContent.appendChild(iframe);
      } else {
        const p = document.createElement('pre');
        p.style.whiteSpace = 'pre-wrap';
        p.style.wordBreak = 'break-word';
        p.style.fontFamily = 'inherit';
        p.textContent = msg.text || '(Mensagem sem texto legível)';
        readerBodyContent.appendChild(p);
      }
    }

    // Anexos
    if (readerAttachmentsBox && readerAttachmentsList) {
      if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        readerAttachmentsList.innerHTML = '';
        msg.attachments.forEach(att => {
          const a = document.createElement('a');
          a.className = 'chip';
          a.style.textDecoration = 'none';
          a.textContent = `📎 ${att.filename} (${Math.round((att.size || 0) / 1024)} KB)`;
          a.href = `https://api.mail.tm${att.downloadUrl}`;
          a.target = '_blank';
          readerAttachmentsList.appendChild(a);
        });
        readerAttachmentsBox.classList.remove('hidden');
      } else {
        readerAttachmentsBox.classList.add('hidden');
      }
    }

    setTempMailStatus('Mensagem carregada.', 'success');
  } catch (err) {
    setTempMailStatus('Erro ao carregar e-mail: ' + (err?.message || err), 'error');
  }
}

// ── Automação (gravar/reproduzir/gerar com IA) ──────────────────────────────

if (autoSubnavSegmented) {
  autoSubnavSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    [...autoSubnavSegmented.children].forEach(b => b.classList.toggle('active', b === btn));
    const tab = btn.dataset.autotab;
    autoPanelList.classList.toggle('hidden', tab !== 'list');
    autoPanelRecord.classList.toggle('hidden', tab !== 'record');
    autoPanelAi.classList.toggle('hidden', tab !== 'ai');
    autoPanelSettings.classList.toggle('hidden', tab !== 'settings');
    if (tab === 'list') { loadAutomations().then(renderAutomations); }
    if (tab === 'settings') { loadAutoSettingsIntoForm(); }
  });
}

async function getActiveAutoTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function autoInjectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['sidepanel/automation/automation-content.js']
    });
  } catch (e) {
    // provavelmente já injetado, ou página protegida (chrome://, webstore, etc.)
  }
}

function setAutoRecordStatus(msg, kind) {
  if (!autoRecordStatus) return;
  autoRecordStatus.textContent = msg;
  autoRecordStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  autoRecordStatus.classList.remove('hidden');
}

function setAutoAiStatus(msg, kind) {
  if (!autoAiStatus) return;
  autoAiStatus.textContent = msg;
  autoAiStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  autoAiStatus.classList.remove('hidden');
}

function setAutoSettingsStatus(msg, kind) {
  if (!autoSettingsStatus) return;
  autoSettingsStatus.textContent = msg;
  autoSettingsStatus.className = 'status-msg' + (kind ? ` ${kind}` : '');
  autoSettingsStatus.classList.remove('hidden');
}

// ---------- Storage ----------

async function loadAutomations() {
  try {
    const { automations: stored = [] } = await chrome.storage.local.get('automations');
    automations = stored;
  } catch { automations = []; }
}

async function saveAutomationsList() {
  await chrome.storage.local.set({ automations });
}

async function getAutoAiSettings() {
  const { automationAiSettings = { provider: 'google', apiKey: '', model: '' } } =
    await chrome.storage.local.get('automationAiSettings');
  return automationAiSettings;
}

async function loadAutoSettingsIntoForm() {
  const settings = await getAutoAiSettings();
  if (autoProviderSelect) autoProviderSelect.value = settings.provider || 'google';
  if (autoModelInput) autoModelInput.value = settings.model || '';
  if (autoApiKeyInput) autoApiKeyInput.value = settings.apiKey || '';
}

if (btnAutoSaveSettings) {
  btnAutoSaveSettings.addEventListener('click', async () => {
    const automationAiSettings = {
      provider: autoProviderSelect.value,
      model: autoModelInput.value.trim(),
      apiKey: autoApiKeyInput.value.trim()
    };
    await chrome.storage.local.set({ automationAiSettings });
    setAutoSettingsStatus('Configurações salvas.', 'success');
  });
}

// ---------- Lista / execução ----------

const AUTO_STEP_LABELS = {
  click: 'Clicar', input: 'Preencher', select: 'Selecionar', check: 'Marcar',
  keypress: 'Tecla', scroll: 'Rolar', wait: 'Esperar', navigate: 'Navegar'
};

function autoStepDetail(step) {
  let detail = step.label || step.selector || '';
  if (step.type === 'input') detail = `${step.label || step.selector} = "${step.value}"`;
  if (step.type === 'scroll') detail = `até ${step.y}px`;
  if (step.type === 'wait') detail = `${step.ms}ms`;
  return detail;
}

function renderAutomations() {
  autoList.innerHTML = '';
  if (!automations.length) {
    autoEmptyState.classList.remove('hidden');
    return;
  }
  autoEmptyState.classList.add('hidden');

  automations.forEach((auto) => {
    const li = document.createElement('li');
    li.className = 'download-item';
    li.innerHTML = `
      <span class="download-name">${escHtml(auto.name)} <span style="color:var(--text-muted)">— ${auto.steps.length} passo(s)</span></span>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="page-action-btn run-btn" title="Executar" aria-label="Executar automação">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="page-action-btn delete-btn" title="Excluir" aria-label="Excluir automação">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    `;
    li.querySelector('.run-btn').addEventListener('click', () => runAutomationOnActiveTab(auto));
    li.querySelector('.delete-btn').addEventListener('click', async () => {
      automations = automations.filter(a => a.id !== auto.id);
      await saveAutomationsList();
      renderAutomations();
    });
    autoList.appendChild(li);
  });
}

async function runAutomationOnActiveTab(automation) {
  const tab = await getActiveAutoTab();
  if (!tab?.id) return;
  await autoInjectContentScript(tab.id);
  chrome.tabs.sendMessage(tab.id, { type: 'AUTOFLOW_RUN', automation }, () => {
    if (chrome.runtime.lastError) { /* aba não suporta scripts (ex: chrome://) */ }
  });
}

// ---------- Gravação ----------

function renderAutoRecordSteps() {
  autoRecordStepsList.innerHTML = '';
  autoCurrentSteps.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'download-item';
    const title = AUTO_STEP_LABELS[step.type] || step.type;
    li.innerHTML = `<span class="download-name">${i + 1}. ${escHtml(title)} <span style="color:var(--text-muted)">${escHtml(autoStepDetail(step))}</span></span>`;
    autoRecordStepsList.appendChild(li);
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AUTOFLOW_RECORDING_UPDATE') {
    autoCurrentSteps = msg.steps;
    renderAutoRecordSteps();
  }
});

if (btnAutoStartRecord) {
  btnAutoStartRecord.addEventListener('click', async () => {
    const tab = await getActiveAutoTab();
    if (!tab?.id) { setAutoRecordStatus('Nenhuma aba ativa encontrada.', 'error'); return; }
    await autoInjectContentScript(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'AUTOFLOW_START_RECORDING' }, () => {
      if (chrome.runtime.lastError) {
        setAutoRecordStatus('Não foi possível gravar nesta página.', 'error');
        return;
      }
      autoRecording = true;
      autoCurrentSteps = [];
      autoRecordNameInput.value = '';
      renderAutoRecordSteps();
      autoRecordIdle.classList.add('hidden');
      autoRecordActive.classList.remove('hidden');
    });
  });
}

if (btnAutoStopSave) {
  btnAutoStopSave.addEventListener('click', async () => {
    const tab = await getActiveAutoTab();
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'AUTOFLOW_STOP_RECORDING' }, async (res) => {
      const steps = res?.steps || autoCurrentSteps;
      const name = autoRecordNameInput.value.trim() || `Automação ${new Date().toLocaleString()}`;
      await loadAutomations();
      automations.push({ id: `auto_${Date.now()}`, name, steps, createdAt: Date.now() });
      await saveAutomationsList();
      autoRecording = false;
      autoRecordActive.classList.add('hidden');
      autoRecordIdle.classList.remove('hidden');
      const listTabBtn = document.querySelector('#auto-subnav-segmented [data-autotab="list"]');
      listTabBtn?.click();
      renderAutomations();
    });
  });
}

if (btnAutoCancelRecord) {
  btnAutoCancelRecord.addEventListener('click', async () => {
    const tab = await getActiveAutoTab();
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'AUTOFLOW_STOP_RECORDING' }, () => {});
    }
    autoRecording = false;
    autoRecordActive.classList.add('hidden');
    autoRecordIdle.classList.remove('hidden');
  });
}

// ---------- Criar com IA ----------

if (btnAutoAiGenerate) {
  btnAutoAiGenerate.addEventListener('click', async () => {
    const instruction = autoAiInstructionInput.value.trim();
    if (!instruction) { setAutoAiStatus('Descreva a automação primeiro.', 'error'); return; }

    const settings = await getAutoAiSettings();
    if (!settings.apiKey) {
      setAutoAiStatus('Configure sua chave de API em ⚙️ Config.', 'error');
      return;
    }

    setAutoAiStatus('Analisando a página…');
    const tab = await getActiveAutoTab();
    if (!tab?.id) { setAutoAiStatus('Nenhuma aba ativa encontrada.', 'error'); return; }
    await autoInjectContentScript(tab.id);

    chrome.tabs.sendMessage(tab.id, { type: 'AUTOFLOW_EXTRACT_INTERACTIVE_ELEMENTS' }, async (res) => {
      if (chrome.runtime.lastError || !res) {
        setAutoAiStatus('Não foi possível ler a página. Recarregue e tente novamente.', 'error');
        return;
      }
      setAutoAiStatus('Gerando automação com IA…');
      try {
        const aiRes = await chrome.runtime.sendMessage({
          type: 'AUTOFLOW_GENERATE_AI',
          instruction,
          elements: res.elements,
          settings
        });
        if (!aiRes || !aiRes.ok) {
          setAutoAiStatus('Erro: ' + (aiRes?.error || 'falha desconhecida'), 'error');
          return;
        }
        if (!aiRes.steps.length) {
          setAutoAiStatus('A IA não conseguiu identificar passos. Tente reformular.', 'error');
          return;
        }
        const name = autoAiNameInput.value.trim() || `IA: ${instruction.slice(0, 30)}`;
        await loadAutomations();
        automations.push({ id: `auto_${Date.now()}`, name, steps: aiRes.steps, createdAt: Date.now() });
        await saveAutomationsList();
        setAutoAiStatus('Automação criada!', 'success');
        autoAiInstructionInput.value = '';
        autoAiNameInput.value = '';
        setTimeout(() => {
          const listTabBtn = document.querySelector('#auto-subnav-segmented [data-autotab="list"]');
          listTabBtn?.click();
          renderAutomations();
        }, 500);
      } catch (err) {
        setAutoAiStatus('Erro: ' + (err?.message || err), 'error');
      }
    });
  });
}

// ── Redes Sociais Downloader ─────────────────────────────────────────────
function setSocialStatus(message, type = '') {
  socialStatus.textContent = message;
  socialStatus.classList.toggle('hidden', !message);
  socialStatus.classList.toggle('error', type === 'error');
  socialStatus.classList.toggle('success', type === 'success');
}

async function socialActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scanSocialMedia() {
  setSocialStatus('');
  const tab = await socialActiveTab();
  if (!tab?.id || !/^https?:/.test(tab.url || '')) {
    renderSocialMedia([], 'A aba atual não permite leitura de conteúdo.');
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'scan-page' });
    renderSocialMedia(response?.media || [], `${response?.site || 'site'} · ${response?.title || 'página'}`);
  } catch {
    renderSocialMedia([], 'Abra uma página compatível e atualize a aba para ativar o detector.');
  }
}

function renderSocialMedia(items, pageInfo) {
  socialMediaItems = items;
  socialPageInfo.textContent = pageInfo;
  socialCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'} encontrados`;
  socialDownloadAll.disabled = items.length === 0;
  socialEmpty.classList.toggle('hidden', items.length > 0);
  socialMediaList.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'social-media-row';
    const preview = document.createElement(item.type === 'video' ? 'video' : 'img');
    preview.src = item.url;
    preview.alt = item.type;
    if (item.type === 'video') preview.controls = true;
    const details = document.createElement('div');
    details.className = 'social-media-details';
    details.textContent = `${item.type === 'video' ? 'Vídeo' : item.type === 'audio' ? 'Áudio' : 'Imagem'} · ${socialHost(item.url)}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary btn-xs';
    button.textContent = 'Baixar';
    button.addEventListener('click', () => downloadSocialMedia(item, index, button));
    row.append(preview, details, button);
    socialMediaList.append(row);
  });
}

function socialHost(rawUrl) {
  try { return new URL(rawUrl).hostname; } catch { return 'URL desconhecida'; }
}

async function downloadSocialMedia(item, index, button) {
  button.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'download-media',
      url: item.url,
      mediaType: item.type,
      index,
      prefix: 'social-media'
    });
    if (!response?.ok) setSocialStatus(response?.error || 'Não foi possível iniciar o download.', 'error');
  } catch (error) {
    setSocialStatus(error?.message || 'Não foi possível iniciar o download.', 'error');
  } finally {
    button.disabled = false;
  }
}

socialRefresh?.addEventListener('click', scanSocialMedia);
socialSelectPage?.addEventListener('click', async () => {
  const tab = await socialActiveTab();
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'enable-selection-mode' });
    setSocialStatus('Seleção ativada na página atual.', 'success');
  } catch {
    setSocialStatus('Atualize a aba para ativar a seleção.', 'error');
  }
});
socialDownloadAll?.addEventListener('click', async () => {
  const buttons = socialMediaList.querySelectorAll('button');
  for (let index = 0; index < socialMediaItems.length; index += 1) {
    await downloadSocialMedia(socialMediaItems[index], index, buttons[index]);
  }
});

// ── Tradutor ───────────────────────────────────────────────────────────────
(() => {
  const input = document.getElementById('tr-input');
  const output = document.getElementById('tr-output');
  const target = document.getElementById('tr-target');
  const detected = document.getElementById('tr-detected');
  const status = document.getElementById('tr-status');
  if (!input) return;

  const SUPPORTED = ['pt', 'en', 'es'];
  let lastLangs = [];
  let timer = null;
  let runId = 0;

  const langName = code => {
    try { return new Intl.DisplayNames(['pt-BR'], { type: 'language' }).of(code) || code; } catch { return code; }
  };
  const showStatus = (msg, kind = 'error') => {
    status.textContent = msg || '';
    status.className = `status-msg ${kind}${msg ? '' : ' hidden'}`;
  };

  // Divide em frases/linhas mantendo os separadores, para detectar o idioma de cada trecho.
  function splitChunks(text) {
    return text.match(/[^\n.!?。！？]+[.!?。！？]*\s*|\n+/g) || [text];
  }

  async function translateChunk(chunk, tl) {
    if (!chunk.trim()) return { text: chunk, lang: null };
    const lead = chunk.match(/^\s*/)[0];
    const trail = chunk.match(/\s*$/)[0];
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t'
      + `&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk.trim())}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Serviço de tradução retornou HTTP ${resp.status}`);
    const data = await resp.json();
    const text = (data[0] || []).map(p => p[0]).join('');
    return { text: lead + text + trail, lang: data[2] || null };
  }

  async function translate() {
    const text = input.value;
    const id = ++runId;
    if (!text.trim()) {
      output.value = '';
      detected.textContent = '';
      lastLangs = [];
      showStatus('');
      return;
    }
    showStatus('Traduzindo...', 'info');
    try {
      const chunks = splitChunks(text);
      const results = new Array(chunks.length);
      let next = 0;
      const worker = async () => {
        while (next < chunks.length) {
          const i = next++;
          results[i] = await translateChunk(chunks[i], target.value);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, chunks.length) }, worker));
      if (id !== runId) return;
      output.value = results.map(r => r.text).join('');
      const counts = {};
      results.forEach(r => { if (r.lang) counts[r.lang] = (counts[r.lang] || 0) + 1; });
      lastLangs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      detected.textContent = lastLangs.length ? `Detectado: ${lastLangs.map(langName).join(', ')}` : '';
      showStatus('');
    } catch (e) {
      if (id === runId) showStatus(`Falha ao traduzir: ${e.message}`);
    }
  }

  const schedule = () => { clearTimeout(timer); timer = setTimeout(translate, 600); };
  input.addEventListener('input', schedule);
  target.addEventListener('change', translate);

  document.getElementById('tr-clear').addEventListener('click', () => {
    runId++;
    input.value = '';
    output.value = '';
    detected.textContent = '';
    lastLangs = [];
    showStatus('');
    input.focus();
  });

  document.getElementById('tr-copy').addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      output.select();
      document.execCommand('copy');
    }
    showStatus('Tradução copiada.', 'success');
    setTimeout(() => showStatus(''), 1500);
  });

  document.getElementById('tr-swap').addEventListener('click', () => {
    if (!output.value) return;
    const origin = lastLangs.find(l => SUPPORTED.includes(l) && l !== target.value);
    input.value = output.value;
    target.value = origin || (target.value === 'pt' ? 'en' : 'pt');
    translate();
  });
})();
