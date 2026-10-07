# Chrome Web Store Listing — Sidebar 1.0

## Metadados da Extensão

- **Nome:** Sidebar 1.0
- **Versão:** 1.2.0
- **Categoria:** Produtividade
- **Idioma padrão:** Português (Brasil)
- **Descrição curta (máx. 132 caracteres):**
  Sidebar multifunções: páginas fixadas, notas, servidor e cliente de e-mail (Gmail/Outlook), exportador, downloader e encurtador.

## Descrição Completa

O **Sidebar 1.0** é uma barra lateral completa e intuitiva desenvolvida para turbinar a sua produtividade diária no navegador. Com design moderno dark glassmorphism, ela reúne em um só lugar todas as ferramentas que você precisa:

- ✉️ **Servidor e Função de E-mail**:
  - Suporte pré-configurado para **Gmail** e **Outlook** (Hotmail / Office 365), além de servidores personalizados.
  - Configuração fácil de servidores SMTP e IMAP com suporte a Senhas de Aplicativo.
  - Envio e composição rápida em 1 clique via Webmail (Gmail/Outlook) ou cliente padrão (mailto).
  - Anexe o título e URL da página ativa no navegador em 1 clique.
  - Insira conteúdos de suas notas salvas diretamente no corpo do e-mail.
  - Acesso rápido aos atalhos de Caixa de Entrada, Não Lidos e Enviados.
  - Histórico de e-mails redigidos.

- 📌 **Páginas Fixadas**: Salve links importantes e visualize diretamente na sidebar ou em novas abas.
- 📝 **Bloco de Notas**: Guarde ideias, anotações rápidas e listas.
- 🗂️ **Abas Salvas**: Salve a aba atual ou todas as abas abertas para restaurar depois.
- 📄 **Exportar Conteúdo**: Converta páginas em PDF, Markdown ou DOCX.
- ⬇️ **Downloader**: Detecção e download facilitado de mídias.
- 🔗 **Encurtador de URL**: Encurte links instantaneamente com o TinyURL.
- 🔑 **Cofre de Senhas**: Criptografia AES-GCM local protegida por senha-mestra.
- 📍 **Gerenciador de Endereços**: Copie seus endereços cadastrados em 1 clique.
- ☁️ **Google Drive**: Navegue e consulte seus arquivos na nuvem.

## Justificativa de Permissões (Review Justifications)

| Permissão | Justificativa em Linguagem Clara |
|---|---|
| `storage` | Utilizado para salvar localmente as configurações de servidores de e-mail, páginas fixadas, notas e preferências do usuário. |
| `tabs` | Necessário para identificar o título e URL da aba ativa ao usar a função "Anexar página" no e-mail, salvar abas abertas e exportar conteúdo. |
| `sidePanel` | Necessário para renderizar a interface lateral no navegador. |
| `contextMenus` | Permite adicionar atalhos ao menu do botão direito do mouse para fixar páginas e ações rápidas. |
| `declarativeNetRequest` | Utilizado para permitir a pré-visualização de páginas fixadas dentro do painel lateral. |
| `scripting` | Necessário para extrair o conteúdo textual de páginas web durante a exportação para Markdown e PDF. |
| `downloads` | Permite salvar os arquivos gerados pelas funções de exportação (PDF/DOCX/MD) e downloader. |
| `identity` | Utilizado para autenticação OAuth segura com o Google Drive. |
| `host_permissions: <all_urls>` | Necessário para possibilitar o download e exportação de páginas em qualquer site navegado pelo usuário. |

## Histórico de Versões

- **1.2.0 (Atual)**:
  - Adicionada a função e servidor de e-mail com suporte nativo a Gmail e Outlook.
  - Compositor de e-mails com inserção rápida da página ativa e de notas.
  - Configuração de servidores SMTP/IMAP e atalhos rápidos de webmail.
  - Histórico de e-mails redigidos e enviados.
- **1.1.0**:
  - Integração com Google Drive, exportador DOCX/MD/PDF, cofre de senhas criptografado e menus de contexto personalizados.
- **1.0.0**:
  - Lançamento inicial com páginas fixadas, notas, downloader e encurtador.
