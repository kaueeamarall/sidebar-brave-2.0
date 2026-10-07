# sidebar-brave-2.0
Barra Lateral para Brave Browser com diversas funcoes inclusas
Stage key small files.

# Barra Lateral Plus

Extensão para navegadores Chromium (Brave, Chrome, Edge) em Manifest V3. Reúne em um painel lateral páginas fixadas, notas, cliente de e-mail, exportação de conteúdo, downloader, encurtador de URL, automação de navegador com IA e execução de comandos locais do Windows.

**Versão atual:** 1.4.0 (conforme `manifest.json`)

---

## Funcionalidades

- **📌 Páginas fixadas**: salva links e os exibe dentro do painel lateral ou em novas abas. Para permitir a exibição em iframe, a regra `rules.json` remove cabeçalhos como `X-Frame-Options` e `Content-Security-Policy` de sub-frames.
- **📝 Bloco de notas**: guarda ideias, anotações e listas.
- **🗂️ Abas salvas**: salva a aba atual ou todas as abas abertas para restaurar depois.
- **✉️ Cliente de e-mail**
  - Gmail via Gmail API (OAuth).
  - Outlook / Microsoft 365 via Microsoft Graph (OAuth).
  - Contas IMAP/SMTP genéricas via bridge local (`bridge-email/`).
  - Compositor com inserção da página ativa e de notas, rascunhos, responder e encaminhar.
- **📄 Exportação de conteúdo**: converte páginas para PDF, Markdown ou DOCX.
- **⬇️ Downloader**
  - Mídia por URL (vídeo, áudio, imagem).
  - Redes sociais: Instagram, X/Twitter, Facebook, TikTok, Reddit, YouTube, Pinterest, LinkedIn, Threads e Snapchat.
  - Salvar a página atual (SingleFile).
  - Baixar extensões da Chrome Web Store (.CRX / .ZIP).
- **🔗 Encurtador de URL**: usa o TinyURL.
- **🔑 Cofre de senhas**: criptografia AES-GCM local, protegida por senha-mestra.
- **📍 Gerenciador de endereços**: copia endereços cadastrados em um clique.
- **☁️ Nuvem**: navegação em arquivos do Google Drive e do OneDrive.
- **⚡ Menu de Contexto (Context Commander)**: comandos personalizados no clique direito.
  - Tipos de comando: PowerShell, CMD, execução de script (.ps1/.py/.bat), abrir URL ou programa, webhook HTTP (GET/POST/PUT) e JavaScript na página.
  - Variáveis como `{{url}}` e `{{domain}}`.
  - Pastas, contextos (página, link, seleção), histórico e notificações.
  - Comandos padrão incluídos: ping no domínio, abrir PowerShell, destacar seleção e extrair links da página.
- **🤖 IA e automação de navegador**
  - Gravação e reprodução de automações, com geração de automações por IA.
  - Provedores suportados: Google Gemini, OpenAI, Groq, OpenRouter, Anthropic (Claude), Ollama (local) e endpoint customizado.
  - *Tool calling* nativo, com ferramentas para:
    - páginas: ler página, listar elementos, clicar, preencher formulários, rolar, executar JS e capturar tela;
    - abas: listar, trocar, criar, fechar, duplicar, fixar, silenciar, agrupar e ajustar zoom;
    - histórico e favoritos: pesquisar e apagar histórico, criar favoritos, ver sites mais visitados;
    - extensões: listar, ativar/desativar e desinstalar;
    - privacidade e conteúdo: limpar dados de navegação, ler e alterar configurações de privacidade e de conteúdo.
- **⚙️ Configurações**: tema (claro, escuro ou seguir o navegador), idioma (Português-BR, Inglês, Espanhol) e backup com exportação/importação de configurações.

---

## Estrutura do projeto

```
extensao-brave/
├── manifest.json                  # Manifesto MV3 (permissões, scripts, side panel)
├── rules.json                     # Regras declarativeNetRequest (iframes no painel)
├── CHROMEWEBSTORE.md              # Texto de listagem e justificativa de permissões
├── icone.jpg, icons/              # Ícones (16, 48, 128 px)
├── src/
│   ├── background.js              # Service worker (menus, alarmes, mensageria, etc.)
│   ├── ccCommandRunner.js         # Executor de comandos do Menu de Contexto
│   ├── ccDefaults.js              # Configurações e comandos padrão
│   └── Microsoft.Services.Store.winmd
├── sidepanel/
│   ├── sidepanel.html / .css / .js   # Interface principal do painel lateral
│   ├── emailclient.js                # Cliente de e-mail
│   ├── social-downloader-content.js  # Content script de download em redes sociais
│   ├── social-downloader-page-ui.css
│   ├── extension-downloader-content.js  # Content script da Chrome Web Store
│   ├── screen-accent.js
│   ├── ai/                        # ai-client, tools-definitions, tool-executor, content/
│   ├── automation/                # automation-content.js (gravar/reproduzir)
│   └── lib/                       # crypto, docx, zip, extract, gdrive, e-mail (Gmail, Graph, IMAP, OAuth, storage)
├── singlefile/                    # Biblioteca SingleFile (salvar página completa)
├── bridge/                        # Bridge local Python (Menu de Contexto), porta 27182
└── bridge-email/                  # Bridge local Node.js (IMAP/SMTP), porta 2003
```

---

## Requisitos

- Navegador Chromium com suporte a Side Panel (Brave, Chrome, Edge).
- **Bridge de comandos (opcional):** Windows com Python 3 no PATH.
- **Bridge de e-mail (opcional):** Node.js e npm.
- **IA (opcional):** chave de API do provedor escolhido. O Ollama não exige chave.

---

## Instalação da extensão

1. Abra `brave://extensions` (ou `chrome://extensions`).
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta `extensao-brave`.
4. Fixe o ícone **Barra Lateral Plus** e clique nele para abrir o painel lateral.

---

## Bridge de comandos locais (`bridge/`)

Servidor HTTP em Python que permite à extensão executar comandos e scripts no Windows. Usa apenas a biblioteca padrão do Python. O ícone da bandeja usa `pystray` e `pillow`, instalados automaticamente pelo `.bat`.

- **Endereço:** `http://127.0.0.1:27182` (altere com a variável `BRIDGE_PORT`).
- **Teste de integridade:** `GET /health`.
- **Autenticação:** token opcional, definido em `bridge_config.json` e enviado no cabeçalho `X-Bridge-Token` ou `Authorization: Bearer`. Sem token, o bridge roda em "modo livre local".

### Iniciar manualmente
```bat
bridge\iniciar_bridge.bat
```

### Iniciar com o Windows (Agendador de Tarefas)
```powershell
powershell -ExecutionPolicy Bypass -File bridge\instalar_servico_bridge.ps1
```
Registra a tarefa `ContextCommanderBridge`, que inicia no logon, sem janela. Para remover:
```powershell
powershell -ExecutionPolicy Bypass -File bridge\remover_servico_bridge.ps1
```

### Configurar na extensão
Na aba **⚙️ Bridge**, informe a URL do Bridge (`http://127.0.0.1:27182`) e o token, se houver. Use **Testar conexão** para validar.

---

## Bridge de e-mail IMAP/SMTP (`bridge-email/`)

Serviço Node.js que traduz REST para IMAP/SMTP. É usado apenas por contas genéricas (Zoho, provedores corporativos, servidores próprios). Gmail e Outlook usam suas APIs diretamente e não precisam dele.

```bash
cd bridge-email
npm install
npm start
```

- **Endereço:** `http://127.0.0.1:2003`, escutando apenas em localhost.
- **Dependências:** `express`, `cors`, `imapflow`, `mailparser`, `nodemailer`.
- Não confundir com `bridge/`. São serviços independentes.

---

## Configuração de contas e IA

- **Gmail:** informe o **Client ID** do Google Cloud. Registre o URI de redirecionamento exibido na extensão.
- **Outlook:** informe o **Application (Client) ID** e o **Tenant** do Azure. Registre o URI de redirecionamento exibido na extensão.
- **IMAP/SMTP:** use a opção **+ Adicionar conta IMAP/SMTP** e mantenha o `bridge-email` em execução. Prefira senhas de aplicativo.
- **IA:** em **✨ IA**, escolha o provedor, informe a chave de API e o modelo (padrão: `gemini-2.5-flash`). Ollama e endpoints customizados aceitam URL própria.

---

## Permissões

| Permissão | Uso |
|---|---|
| `storage` | Configurações, notas, páginas fixadas, contas |
| `tabs`, `activeTab` | Informações e controle das abas |
| `sidePanel` | Interface lateral |
| `contextMenus` | Menu de contexto e Context Commander |
| `declarativeNetRequest` | Pré-visualização de páginas em iframe |
| `scripting` | Extração de conteúdo, automação e scripts na página |
| `downloads` | Salvar exportações e mídias |
| `identity` | OAuth (Google Drive, Gmail, Microsoft) |
| `notifications`, `alarms`, `offscreen` | Avisos, tarefas agendadas e processamento em segundo plano |
| `host_permissions` (`<all_urls>`, localhost, APIs Google/Microsoft) | Exportação, download, automação e integração com as bridges |

---

## Segurança e privacidade

- Credenciais de e-mail trafegam apenas entre a extensão e o bridge local.
- O cofre de senhas usa AES-GCM com senha-mestra, localmente.
- Os bridges escutam somente em `127.0.0.1`. **Não exponha as portas 27182 e 2003 na rede.**
- Defina um **token** no bridge de comandos, pois ele executa comandos no sistema.
- As ferramentas de IA podem executar JavaScript, clicar, preencher formulários e alterar configurações do navegador. Revise as ações antes de confiar nelas.
- Chaves de API são enviadas diretamente aos provedores de IA escolhidos.
- A regra `rules.json` remove cabeçalhos de segurança de sub-frames para permitir páginas fixadas, o que reduz a proteção contra clickjacking nesses frames.

---

## Histórico de versões

- **1.4.0:** versão atual do manifesto. Inclui automação com IA, downloader universal e Menu de Contexto com bridge.
- **1.2.0:** servidor e cliente de e-mail (Gmail/Outlook).
- **1.1.0:** Google Drive, exportação DOCX/MD/PDF, cofre de senhas e menus de contexto.
- **1.0.0:** páginas fixadas, notas, downloader e encurtador.

---

## Tecnologias

JavaScript (ES Modules), HTML/CSS, Chrome Extensions MV3 (Side Panel, DNR, Scripting, Identity), SingleFile, Python 3 (`http.server`, `pystray`, `pillow`), Node.js (Express, ImapFlow, Nodemailer, Mailparser).

Nenhum arquivo da pasta foi alterado.
