# Chatwoot Plugin System: Instalação em Imagem Docker Pré-Compilada

Este guia explica como instalar o sistema de plugins do Chatwoot (incluindo o Bot Tab) em uma imagem Docker já compilada que está em produção, sem a necessidade de reconstruir a imagem do zero ou compilar dependências Node/Ruby no servidor do cliente.

## Entendendo o Processo

Imagens do Chatwoot em produção utilizam "Assets Pré-compilados" (os arquivos `.vue` são convertidos em JavaScript puro dentro de `public/packs`).
Para atualizar o Chatwoot com nossa alteração, precisamos:
1. Copiar os novos arquivos do servidor em Ruby (`app/controllers`, `lib/`, etc.).
2. Substituir a pasta `public/` compilada por uma que contém os pontos de injeção (*Hooks*) do Plugin System.
3. Reiniciar os serviços.

## Passo 1: Preparando o "Patch" localmente

Se você tem este repositório (com o código fonte aberto modificado) na sua máquina:

1. Compile os assets do frontend na sua máquina:
   ```bash
   RAILS_ENV=production bundle exec rake assets:precompile
   ```
2. Após compilar, os arquivos atualizados estarão na pasta `public/`.
3. Crie um arquivo `patch.tar.gz` contendo a pasta `app/`, `lib/`, e `public/`:
   ```bash
   tar -czvf chatwoot-plugin-patch.tar.gz app/ lib/ public/ config/routes.rb
   ```

## Passo 2: Aplicando o Patch no Servidor de Produção (Docker)

Leve o arquivo `chatwoot-plugin-patch.tar.gz` para o servidor do cliente.

1. Identifique o ID do container do Chatwoot web:
   ```bash
   docker ps | grep chatwoot_web
   ```

2. Copie o patch para dentro do container:
   ```bash
   docker cp chatwoot-plugin-patch.tar.gz <CONTAINER_ID>:/app/
   ```

3. Entre no container como root:
   ```bash
   docker exec -u root -it <CONTAINER_ID> /bin/bash
   ```

4. Extraia e substitua os arquivos (dentro do container):
   ```bash
   cd /app
   tar -xzvf chatwoot-plugin-patch.tar.gz
   rm chatwoot-plugin-patch.tar.gz
   ```

5. Saia do container e reinicie o serviço para o Ruby recarregar as rotas e arquivos do backend:
   ```bash
   docker restart <CONTAINER_ID>
   # Lembre-se de reiniciar o sidekiq também, se houver:
   docker restart chatwoot_worker
   ```

## Passo 3: Instalando o Plugin do Bot

Agora que o sistema está atualizado para suportar plugins dinâmicos:

1. Acesse o **Super Admin** do Chatwoot (`https://seu-chatwoot.com/super_admin`).
2. No menu lateral, procure por **Plugins**.
3. Clique em **Upload / Adicionar Novo Plugin**.
4. Faça o upload do arquivo `bot-tab-plugin.zip`.
5. Ative o plugin.

Ao recarregar o Chatwoot no seu painel de atendente, a aba "Bot" aparecerá e o contador buscará os atendimentos não atribuídos que estão com os robôs, **atualizando sozinho sem precisar clicar**, rodando silenciosamente no *background*.

## Desenvolvendo seu próprio Plugin

A estrutura de um arquivo `.zip` para upload deve conter:

- `plugin.json` (Manifesto contendo `identifier`, `name`, `version`)
- `frontend/dist/plugin.js` (O seu código compilado via Vite/Webpack usando Vue 3 ou Vanilla JS e a API `window.ChatwootPluginRegistry`)
- `backend/` (Opcional, contendo classes e rotas extras para a API)

Ao desenvolver em Vue, compile com o Vite usando `pnpm build` para gerar o `dist/plugin.js`.