# Bridge IMAP/SMTP (Cliente de E-mail)

Serviço local que traduz REST <-> IMAP/SMTP para a funcionalidade **Cliente de E-mail** da extensão **Barra Lateral Plus**, usado apenas para contas genéricas (sem API própria, ex.: Zoho, provedores corporativos, servidores próprios). Contas Gmail e Outlook usam a Gmail API / Microsoft Graph diretamente e não precisam deste serviço.

Não confundir com `bridge/` (a bridge Python usada pelo Menu de Contexto / Context Commander desta mesma extensão, que escuta na porta 27182) — são serviços independentes.

## Uso
```bash
npm install
npm start
```
Sobe em `http://127.0.0.1:2003`, escutando apenas em localhost.

## Segurança
- As credenciais (e-mail/senha ou senha de app) trafegam apenas entre a extensão e este processo local, nunca saem da máquina.
- Recomenda-se usar "senhas de app" quando o provedor oferecer (Gmail, Yahoo, etc. exigem isso quando 2FA está ativo) em vez da senha principal da conta.
- Rode o bridge apenas localmente; não exponha a porta 2003 na rede.
