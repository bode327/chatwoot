# Plugin de Galeria de Mídias para Chatwoot

Este diretório contém o código fonte do plugin de Galeria que consolida Imagens, Vídeos, Áudios, Documentos e Links do contato atual no Chatwoot em um modal elegante, como definido pelo modelo original.

## 1. Dependências Necessárias
Para compilar a interface deste plugin e obter o seu arquivo instalável (.zip), você precisará do **Node.js** e do **npm** instalados na sua máquina local de desenvolvimento.

## 2. Compilação do Frontend (Vue 3 / Vite)
A interface de usuário que vai sobrepor o Chatwoot deve ser compilada num pacote único Javascript (chamado estilo *IIFE*), para não haver conflitos e poder ser injetado "on the fly".

1. Acesse o diretório do frontend do plugin:
   ```bash
   cd plugins_source/gallery/frontend
   ```
2. Instale os pacotes e dependências (basicamente Vue e Vite):
   ```bash
   npm install
   ```
3. Gere o *Build* final:
   ```bash
   npm run build
   ```
4. Após o comando, a pasta `plugins_source/gallery/frontend/dist/` será criada contendo os arquivos `plugin.js` e `style.css` minificados.

## 3. Empacotando para o Chatwoot (.zip)

Agora que a interface está compilada, vamos preparar o pacote final para mandar pro Painel Super Admin (ou manualmente via Volumes se você estiver rodando no setup não-compilado via Docker Compose).

1. Retorne à raiz da pasta da galeria:
   ```bash
   cd plugins_source/gallery
   ```
2. Selecione apenas os arquivos estritamente essenciais para funcionamento. São eles:
   - O arquivo `manifest.json` (Raiz)
   - A pasta inteira `backend/`
   - O diretório recém compilado do frontend, localizado em `frontend/dist/`

**No Linux/Mac via Terminal:**
Se você possui o utilitário `zip` instalado:
```bash
zip -r gallery-plugin.zip manifest.json backend frontend/dist
```

**No Windows:**
Segure a tecla CTRL, clique no arquivo `manifest.json`, na pasta `backend` e dentro de frontend selecione a pasta `dist`. Clique com botão direito -> Enviar para -> Pasta Compactada (Zipada). Salve o arquivo gerado como `gallery-plugin.zip`.

*🚨 Importante: Nunca adicione a pasta `node_modules` ou o código cru Vue do `/src` dentro do Zip, isso pode causar o colapso da renderização em produção.*

## 4. O que fazer com o ZIP?
Suba esse `.zip` gerado no novo painel **Plugins** que aparece em `/super_admin` no seu ambiente Chatwoot.
O Chatwoot extrairá ele direto para os volumes seguros (`storage/plugins/gallery`), injetará o Ruby novo na veia sem reinicializar e fará as interfaces de usuário baixarem as bibliotecas em Javascript!