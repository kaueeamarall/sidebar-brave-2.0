// sidepanel/ai/tools-definitions.js
// Tool (function-calling) schema definitions for the "Inteligência Artificial" agent.
// Plain script (no import/export) — exposes window.SidebarAI.ToolsDefinitions.
'use strict';

(function (global) {
  const TOOLS = [
    // --- Page & DOM Interactions ---
    {
      name: "read_current_page",
      description: "Lê o conteúdo textual estruturado, título, URL, metadados e estrutura da página web ativa atual.",
      parameters: {
        type: "object",
        properties: {
          max_length: { type: "number", description: "Limite máximo aproximado de caracteres a extrair (padrão: 12000)" }
        }
      }
    },
    {
      name: "get_page_elements",
      description: "Identifica elementos interativos na página ativa (botões, campos de texto, links, formulários) com seus seletores CSS e rótulos de acessibilidade.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Seletor CSS opcional para filtrar os elementos (ex: 'button, input, a')" }
        }
      }
    },
    {
      name: "click_element",
      description: "Clica em um elemento da página atual usando seu seletor CSS ou texto visível.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Seletor CSS do elemento (ex: '#submit-btn', 'button.primary')" },
          text: { type: "string", description: "Texto visível do botão/link caso o seletor exato não seja conhecido" }
        }
      }
    },
    {
      name: "fill_form_field",
      description: "Preenche um campo de entrada de formulário (input, textarea, select) na página ativa e opcionalmente submete.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Seletor CSS do campo (ex: 'input[name=\"q\"]', '#email', 'textarea')" },
          value: { type: "string", description: "Valor a ser digitado/inserido no campo" },
          submit: { type: "boolean", description: "Se deve simular a tecla Enter ou submeter o formulário após preencher (padrão: false)" }
        },
        required: ["selector", "value"]
      }
    },
    {
      name: "scroll_page",
      description: "Rola a página ativa para cima, baixo, topo, rodapé ou até um elemento específico.",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["down", "up", "top", "bottom", "element"], description: "Direção do deslocamento da página" },
          selector: { type: "string", description: "Seletor CSS do elemento caso a direção seja 'element'" },
          amount: { type: "number", description: "Quantidade de pixels para rolar quando direction for 'up' ou 'down' (padrão: 600)" }
        },
        required: ["direction"]
      }
    },
    {
      name: "execute_page_script",
      description: "Executa um trecho de código JavaScript seguro no contexto da página ativa e retorna o resultado.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Expressão ou função JavaScript para rodar na página e extrair/manipular dados (ex: 'return document.title;')" }
        },
        required: ["code"]
      }
    },
    {
      name: "capture_screenshot",
      description: "Captura uma imagem da parte visível da aba ativa do navegador.",
      parameters: { type: "object", properties: {} }
    },

    // --- Tabs & Windows Management ---
    {
      name: "list_tabs",
      description: "Lista todas as abas abertas no navegador com ID, título, URL, status ativa, fixada, áudio e grupo.",
      parameters: {
        type: "object",
        properties: { current_window_only: { type: "boolean", description: "Se deve listar apenas abas da janela atual (padrão: false)" } }
      }
    },
    {
      name: "switch_tab",
      description: "Alterna a visualização para uma aba específica usando seu tab_id.",
      parameters: { type: "object", properties: { tab_id: { type: "number", description: "ID numérico da aba para focar" } }, required: ["tab_id"] }
    },
    {
      name: "create_tab",
      description: "Abre uma nova aba com a URL fornecida.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL para abrir" },
          active: { type: "boolean", description: "Se a nova aba deve ser ativada imediatamente (padrão: true)" }
        },
        required: ["url"]
      }
    },
    {
      name: "close_tabs",
      description: "Fecha uma ou mais abas do navegador pelos seus IDs numéricos.",
      parameters: {
        type: "object",
        properties: { tab_ids: { type: "array", items: { type: "number" }, description: "Lista de IDs das abas a fechar" } },
        required: ["tab_ids"]
      }
    },
    {
      name: "duplicate_tab",
      description: "Duplica uma aba pelo seu tab_id.",
      parameters: { type: "object", properties: { tab_id: { type: "number", description: "ID da aba a duplicar" } }, required: ["tab_id"] }
    },
    {
      name: "pin_tab",
      description: "Fixa ou desafixa uma aba no navegador.",
      parameters: {
        type: "object",
        properties: { tab_id: { type: "number" }, pinned: { type: "boolean", description: "true para fixar, false para desafixar" } },
        required: ["tab_id", "pinned"]
      }
    },
    {
      name: "mute_tab",
      description: "Silencia ou ativa o som de uma aba.",
      parameters: {
        type: "object",
        properties: { tab_id: { type: "number" }, muted: { type: "boolean" } },
        required: ["tab_id", "muted"]
      }
    },
    {
      name: "group_tabs",
      description: "Agrupa abas em um grupo colorido nomeado na barra de abas.",
      parameters: {
        type: "object",
        properties: {
          tab_ids: { type: "array", items: { type: "number" }, description: "Lista de IDs das abas a agrupar" },
          title: { type: "string", description: "Nome/rótulo do grupo" },
          color: { type: "string", enum: ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"] }
        },
        required: ["tab_ids"]
      }
    },
    {
      name: "set_zoom",
      description: "Altera o nível de zoom da aba atual ou especificada (ex: 1.0 = 100%).",
      parameters: {
        type: "object",
        properties: { zoom_factor: { type: "number" }, tab_id: { type: "number" } },
        required: ["zoom_factor"]
      }
    },

    // --- History & Bookmarks ---
    {
      name: "search_history",
      description: "Pesquisa o histórico de navegação por palavras-chave com limite e período configuráveis.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Termo de busca a procurar no título ou URL das páginas visitadas" },
          max_results: { type: "number", description: "Quantidade máxima de registros a retornar (padrão: 15)" },
          start_days_ago: { type: "number", description: "Buscar a partir de quantos dias atrás (padrão: 7)" }
        },
        required: ["text"]
      }
    },
    {
      name: "delete_history_url",
      description: "Remove uma URL específica do histórico de navegação.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    },
    {
      name: "search_bookmarks",
      description: "Pesquisa favoritos salvos no navegador pelo título ou URL.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    },
    {
      name: "create_bookmark",
      description: "Salva um novo favorito no navegador.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, url: { type: "string" }, parent_id: { type: "string" } },
        required: ["title", "url"]
      }
    },
    {
      name: "get_top_sites",
      description: "Retorna a lista dos sites mais frequentemente visitados pelo usuário no navegador.",
      parameters: { type: "object", properties: {} }
    },

    // --- Extensions Management ---
    {
      name: "list_extensions",
      description: "Lista as extensões instaladas no navegador com nome, versão e status de ativação.",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "set_extension_enabled",
      description: "Ativa ou desativa uma extensão instalada pelo seu ID.",
      parameters: {
        type: "object",
        properties: { extension_id: { type: "string" }, enabled: { type: "boolean" } },
        required: ["extension_id", "enabled"]
      }
    },
    {
      name: "uninstall_extension",
      description: "Desinstala uma extensão pelo seu ID (pedirá confirmação nativa do navegador).",
      parameters: { type: "object", properties: { extension_id: { type: "string" } }, required: ["extension_id"] }
    },

    // --- Privacy & Browsing Data ---
    {
      name: "clear_browsing_data",
      description: "Limpa dados de navegação como cache, cookies, histórico, downloads e formulários por período.",
      parameters: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["last_hour", "last_day", "last_week", "last_month", "all_time"] },
          data_types: { type: "array", items: { type: "string", enum: ["cache", "cookies", "downloads", "history", "formData", "passwords"] } }
        },
        required: ["timeframe"]
      }
    },
    {
      name: "get_privacy_settings",
      description: "Consulta o status atual das configurações de privacidade suportadas.",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "set_privacy_setting",
      description: "Altera uma configuração de privacidade do navegador.",
      parameters: {
        type: "object",
        properties: {
          setting_name: { type: "string", enum: ["doNotTrack", "autofillAddress", "autofillCreditCard", "networkPrediction", "thirdPartyCookies"] },
          value: { type: "boolean" }
        },
        required: ["setting_name", "value"]
      }
    },
    {
      name: "get_content_settings",
      description: "Verifica permissões de conteúdo (javascript, popups, cookies, notifications, images) para o site ativo.",
      parameters: { type: "object", properties: { content_type: { type: "string", enum: ["javascript", "popups", "cookies", "notifications", "images"] } }, required: ["content_type"] }
    },
    {
      name: "set_content_settings",
      description: "Define regras de permissão (allow/block) para recursos como popups, javascript, cookies ou imagens.",
      parameters: {
        type: "object",
        properties: {
          content_type: { type: "string", enum: ["popups", "javascript", "cookies", "notifications", "images"] },
          setting: { type: "string", enum: ["allow", "block", "ask"] },
          scope: { type: "string", enum: ["current_site", "global"] }
        },
        required: ["content_type", "setting"]
      }
    },

    // --- Downloads ---
    {
      name: "download_file",
      description: "Inicia o download de um arquivo da web ou salva um conteúdo textual (markdown, resumo, código, relatório) diretamente em um arquivo no computador.",
      parameters: {
        type: "object",
        properties: { filename: { type: "string" }, content: { type: "string" }, url: { type: "string" } },
        required: ["filename"]
      }
    },
    {
      name: "search_downloads",
      description: "Pesquisa na lista de downloads recentes do navegador por nome de arquivo ou status.",
      parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } } }
    }
  ];

  function getOpenAITools() {
    return TOOLS.map(tool => ({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.parameters }
    }));
  }

  function getGeminiTools() {
    return [{
      functionDeclarations: TOOLS.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters }))
    }];
  }

  global.SidebarAI = global.SidebarAI || {};
  global.SidebarAI.ToolsDefinitions = { TOOLS, getOpenAITools, getGeminiTools };
})(window);
