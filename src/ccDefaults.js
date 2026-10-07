// ccDefaults.js — Context Commander: configurações e comandos padrão
// Comandos entram como filhos diretos do submenu "⚙️ Menu de Contexto"
// (ou dentro de uma subpasta, se `parentId` apontar para outro comando com isFolder:true).

export const CC_DEFAULT_SETTINGS = {
  bridgeUrl: 'http://127.0.0.1:27182',
  bridgeToken: '',
  notificationsEnabled: true,
  toastOnPageEnabled: true,
  historyMaxItems: 50
};

export const CC_DEFAULT_COMMANDS = [
  {
    id: 'cc_folder_windows',
    parentId: null,
    isFolder: true,
    title: '🪟 Comandos do Windows',
    enabled: true,
    contexts: ['all']
  },
  {
    id: 'cc_cmd_ping',
    parentId: 'cc_folder_windows',
    isFolder: false,
    title: 'Ping no Domínio ({{domain}})',
    type: 'powershell',
    command: 'ping {{domain}}',
    interactive: false,
    enabled: true,
    contexts: ['page', 'link']
  },
  {
    id: 'cc_cmd_open_terminal',
    parentId: 'cc_folder_windows',
    isFolder: false,
    title: 'Abrir PowerShell Aqui (Interativo)',
    type: 'powershell',
    command: 'Write-Host "URL: {{url}}"; Write-Host "Dominio: {{domain}}"',
    interactive: true,
    enabled: true,
    contexts: ['all']
  },
  {
    id: 'cc_folder_browser',
    parentId: null,
    isFolder: true,
    title: '🌐 Scripts na Página',
    enabled: true,
    contexts: ['all']
  },
  {
    id: 'cc_js_highlight',
    parentId: 'cc_folder_browser',
    isFolder: false,
    title: 'Destacar Seleção em Amarelo',
    type: 'browser_js',
    code: `(() => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const mark = document.createElement('mark');
  mark.style.backgroundColor = '#fef08a';
  mark.style.color = '#854d0e';
  mark.style.padding = '2px 4px';
  mark.style.borderRadius = '3px';
  try { range.surroundContents(mark); } catch (e) { alert('Selecione texto contínuo para destacar.'); }
})();`,
    enabled: true,
    contexts: ['selection']
  },
  {
    id: 'cc_js_extract_links',
    parentId: 'cc_folder_browser',
    isFolder: false,
    title: 'Extrair Todos os Links da Página',
    type: 'browser_js',
    code: `(() => {
  const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith('http'));
  const unique = [...new Set(links)];
  navigator.clipboard.writeText(unique.join('\\n')).then(() => {
    alert('🔗 ' + unique.length + ' links únicos foram copiados!');
  }).catch(() => { prompt('Links extraídos:', unique.join('\\n')); });
})();`,
    enabled: true,
    contexts: ['page']
  }
];
