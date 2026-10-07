// sidepanel/ai/ai-client.js
// Multi-provider AI client with native Tool Calling (Google Gemini, Groq, OpenRouter, OpenAI, Ollama, custom).
// Implements an autonomous ReAct agent loop for multi-step browser automation.
// Plain script (no import/export) — exposes window.SidebarAI.{getStoredConfig, runAgentLoop}.
'use strict';

(function (global) {
  const { getGeminiTools, getOpenAITools } = global.SidebarAI.ToolsDefinitions;
  const executeTool = global.SidebarAI.executeTool;

  const DEFAULT_SYSTEM_PROMPT = `Você é o assistente de Inteligência Artificial integrado diretamente ao navegador Brave (Sidebar 1.0).
Sua missão é ajudar o usuário a navegar, extrair informações, automatizar tarefas, ler páginas, gerenciar abas, extensões, favoritos, histórico, downloads e privacidade.

Diretrizes:
1. Sempre que o usuário solicitar uma ação que dependa do conteúdo da página ou do estado do navegador (ex: ler página, fechar abas, listar favoritos, limpar dados, gerenciar extensões etc.), utilize as ferramentas adequadas.
2. Responda em Português do Brasil com linguagem clara, educada, precisa e bem formatada em Markdown.
3. Se precisar realizar uma cadeia de ações (ex: ler página -> resumir -> baixar arquivo), execute cada ferramenta passo a passo e explique o resultado final.
4. Ao manipular abas, extensões ou dados do usuário (ex: fechar abas, limpar cache, desinstalar extensão), seja transparente e confirme o que foi feito.`;

  async function getStoredConfig() {
    const result = await chrome.storage.local.get([
      'aiProvider', 'aiApiKey', 'aiModel', 'aiCustomEndpoint', 'aiTemperature', 'aiSystemPrompt', 'aiEnableTools'
    ]);

    return {
      provider: result.aiProvider || 'gemini',
      apiKey: result.aiApiKey || '',
      model: result.aiModel || 'gemini-2.5-flash',
      customEndpoint: result.aiCustomEndpoint || '',
      temperature: result.aiTemperature !== undefined ? result.aiTemperature : 0.7,
      systemPrompt: result.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT,
      enableTools: result.aiEnableTools !== undefined ? result.aiEnableTools : true
    };
  }

  async function runAgentLoop({ userPrompt, conversationHistory = [], onProgress }) {
    const config = await getStoredConfig();

    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error('Chave de API não configurada. Abra as Configurações da IA para inserir sua chave gratuita ou paga.');
    }

    let contextPrefix = '';
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        contextPrefix = `[Contexto da Aba Ativa Atual: Título: "${tabs[0].title}", URL: ${tabs[0].url}, TabId: ${tabs[0].id}]\n\n`;
      }
    } catch (e) {
      // Ignore if not accessible
    }

    const promptWithContext = contextPrefix + userPrompt;

    if (config.provider === 'gemini') {
      return await runGeminiAgentLoop({ prompt: promptWithContext, history: conversationHistory, config, onProgress });
    } else {
      return await runOpenAIAgentLoop({ prompt: promptWithContext, history: conversationHistory, config, onProgress });
    }
  }

  // --- Google Gemini Agent Loop ---
  async function runGeminiAgentLoop({ prompt, history, config, onProgress }) {
    const { apiKey, model, temperature, systemPrompt, enableTools } = config;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    for (const msg of history.slice(-6)) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const tools = enableTools ? getGeminiTools() : undefined;
    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const payload = { contents, generationConfig: { temperature } };
      if (systemPrompt) payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      if (tools) payload.tools = tools;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        let parsedErr = errText;
        try { parsedErr = JSON.parse(errText).error?.message || errText; } catch (e) {}
        throw new Error(`Erro Gemini (${res.status}): ${parsedErr}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content) throw new Error('Resposta vazia da API do Gemini.');

      const modelParts = candidate.content.parts || [];
      contents.push(candidate.content);

      const functionCalls = modelParts.filter(p => p.functionCall).map(p => p.functionCall);

      if (functionCalls.length > 0 && enableTools) {
        const toolResponseParts = [];
        for (const call of functionCalls) {
          if (onProgress) onProgress({ type: 'tool_start', tool: call.name, args: call.args });
          const result = await executeTool(call.name, call.args || {});
          if (onProgress) onProgress({ type: 'tool_finish', tool: call.name, result });
          toolResponseParts.push({ functionResponse: { name: call.name, response: { output: result } } });
        }
        contents.push({ role: 'user', parts: toolResponseParts });
        continue;
      }

      const textPart = modelParts.find(p => p.text);
      const finalAnswer = textPart ? textPart.text : 'Ação concluída com sucesso.';
      if (onProgress) onProgress({ type: 'final_response', text: finalAnswer });
      return finalAnswer;
    }

    return 'Aviso: Limite de iterações do agente atingido.';
  }

  // --- OpenAI-Compatible Agent Loop (Groq, OpenRouter, OpenAI, Ollama, Custom) ---
  async function runOpenAIAgentLoop({ prompt, history, config, onProgress }) {
    const { provider, apiKey, model, customEndpoint, temperature, systemPrompt, enableTools } = config;

    let url = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
    else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
    else if (provider === 'ollama') url = `${(customEndpoint || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
    else if (provider === 'custom') url = `${customEndpoint.replace(/\/+$/, '')}/chat/completions`;

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const msg of history.slice(-6)) messages.push({ role: msg.role, content: msg.content });
    messages.push({ role: 'user', content: prompt });

    const tools = enableTools ? getOpenAITools() : undefined;
    const maxIterations = 10;
    let iteration = 0;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://brave.com';
      headers['X-Title'] = 'Sidebar 1.0 - Inteligência Artificial';
    }

    while (iteration < maxIterations) {
      iteration++;

      const payload = { model, messages, temperature };
      if (tools) { payload.tools = tools; payload.tool_choice = 'auto'; }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });

      if (!res.ok) {
        const errText = await res.text();
        let parsedErr = errText;
        try { parsedErr = JSON.parse(errText).error?.message || errText; } catch (e) {}
        throw new Error(`Erro ${provider.toUpperCase()} (${res.status}): ${parsedErr}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice || !choice.message) throw new Error('Resposta vazia da API do modelo.');

      const assistantMsg = choice.message;
      messages.push(assistantMsg);

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && enableTools) {
        for (const call of assistantMsg.tool_calls) {
          const funcName = call.function.name;
          let funcArgs = {};
          try { funcArgs = JSON.parse(call.function.arguments || '{}'); } catch (e) { funcArgs = {}; }

          if (onProgress) onProgress({ type: 'tool_start', tool: funcName, args: funcArgs });
          const result = await executeTool(funcName, funcArgs);
          if (onProgress) onProgress({ type: 'tool_finish', tool: funcName, result });

          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue;
      }

      const finalAnswer = assistantMsg.content || 'Ação concluída com sucesso.';
      if (onProgress) onProgress({ type: 'final_response', text: finalAnswer });
      return finalAnswer;
    }

    return 'Aviso: Limite de iterações do agente atingido.';
  }

  global.SidebarAI = global.SidebarAI || {};
  global.SidebarAI.getStoredConfig = getStoredConfig;
  global.SidebarAI.runAgentLoop = runAgentLoop;
  global.SidebarAI.DEFAULT_SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;
})(window);
