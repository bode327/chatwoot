(function() {
    'use strict';

    // We wrap it in a setTimeout to ensure it runs after the DOM is ready, since
    // Chatwoot's dynamic plugin loader injects the script asynchronously.
    setTimeout(() => {
        const CONFIG = {
            TAB_NAME: 'Bot',
            ACCOUNT_ID: window.location.pathname.split('/')[3] || (window.$chatwootStore ? window.$chatwootStore.getters.getCurrentAccountId : '1'),
            API_URL: window.location.origin
        };

        // --- CSS ---
        const style = document.createElement('style');
        style.innerHTML = `
            /* Esconde a lista nativa quando a aba Bot está ativa */
            .hidden-by-bot { display: none !important; }

            /* Container da lista de conversas do Bot */
            #bot-conv-container {
                height: calc(100vh - 180px);
                overflow-y: auto;
                background: transparent;
                width: 100%;
            }

            /* Estilo da Aba Ativa */
            .bot-tab-active {
                border-bottom: 2px solid #1f93ff !important;
                color: #1f93ff !important;
            }

            /* Estilo do Badge (Contador) */
            .bot-badge {
                background: #e0e7ff;
                color: #3730a3;
                padding: 0 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
                margin-left: 5px;
                min-width: 18px;
                text-align: center;
                display: inline-block;
            }
            .dark .bot-badge {
                background: rgba(99, 102, 241, 0.2);
                color: #818cf8;
            }
        `;
        document.head.appendChild(style);

        let isActive = false;

        // --- AUTENTICAÇÃO (Igual ao Contador) ---
        function getAuthHeaders() {
            try {
                const cookieMatch = document.cookie.match(/cw_d_session_info=([^;]+)/);
                if (cookieMatch) {
                    const sessionData = JSON.parse(decodeURIComponent(cookieMatch[1]));
                    if (sessionData['access-token']) {
                        return {
                            'access-token': sessionData['access-token'],
                            'client': sessionData['client'],
                            'uid': sessionData['uid'],
                            'token-type': 'Bearer'
                        };
                    }
                }
            } catch (e) {}

            const storageToken = localStorage.getItem('auth_token');
            if (storageToken) {
                try {
                    const parsed = JSON.parse(storageToken);
                    return { 'api_access_token': parsed.token || parsed };
                } catch (e) {
                    return { 'api_access_token': storageToken };
                }
            }
            return null;
        }

        async function fetchBotData() {
            const headers = getAuthHeaders();
            if (!headers) return [];

            // Re-fetch Account ID just in case the URL changed in the SPA
            const currentAccountId = window.location.pathname.split('/')[3] || CONFIG.ACCOUNT_ID;

            const urls = [
                `${CONFIG.API_URL}/api/v1/accounts/${currentAccountId}/conversations?status=pending&sort_by=last_activity_at`,
                `${CONFIG.API_URL}/api/v1/accounts/${currentAccountId}/conversations?status=snoozed&sort_by=last_activity_at`
            ];

            try {
                const results = await Promise.all(urls.map(u => fetch(u, { headers }).then(r => r.ok ? r.json() : {data:{payload:[]}})));
                const all = [].concat(...results.map(r => r.data.payload));
                // Remove duplicatas e ordena
                const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
                return unique.sort((a, b) => b.last_activity_at - a.last_activity_at);
            } catch (e) { return []; }
        }

        function renderList(conversations) {
            let container = document.getElementById('bot-conv-container');
            if (!container) return;

            container.innerHTML = conversations.length ? '' : '<div class="p-4 text-center text-slate-400 text-sm mt-4">Nenhum chamado pendente no Bot.</div>';

            conversations.forEach(conv => {
                const sender = conv.meta?.sender || { name: 'Visitante' };
                // Formata data
                const date = new Date(conv.last_activity_at * 1000);
                const dateStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const currentAccountId = window.location.pathname.split('/')[3] || CONFIG.ACCOUNT_ID;

                const html = `
                    <a href="/app/accounts/${currentAccountId}/conversations/${conv.id}" class="block w-full cursor-pointer border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-100 font-bold flex-shrink-0">
                                ${sender.thumbnail ? `<img src="${sender.thumbnail}" class="w-full h-full rounded-full object-cover">` : (sender.name || '?')[0].toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="font-medium text-sm text-slate-800 dark:text-slate-100 truncate pr-2">${sender.name}</span>
                                    <span class="text-[10px] text-slate-400 whitespace-nowrap">${dateStr}</span>
                                </div>
                                <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    ${conv.messages?.[0]?.content || '📎 Anexo ou mensagem vazia'}
                                </div>
                            </div>
                        </div>
                    </a>
                `;
                const div = document.createElement('div');
                div.innerHTML = html;
                div.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', e.currentTarget.href);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                });
                container.appendChild(div.firstElementChild);
            });
        }

        function toggleBot(show) {
            isActive = show;
            // Seletores mais agressivos para esconder a lista nativa
            const nativeLists = document.querySelectorAll('.vue-recycle-scroller, .conversations-list, .empty-state, .spinner, .conversation-group');
            let botContainer = document.getElementById('bot-conv-container');

            // Tenta achar o wrapper correto
            const wrap = document.querySelector('.conversations-list-wrap') ||
                         document.querySelector('section[class*="conversations"]') ||
                         document.querySelector('aside + section'); // Fallback comum

            if (show) {
                nativeLists.forEach(el => el.classList.add('hidden-by-bot'));

                if (!botContainer && wrap) {
                    botContainer = document.createElement('div');
                    botContainer.id = 'bot-conv-container';

                    // Insere logo após o cabeçalho de abas (header)
                    const header = wrap.querySelector('header') || wrap.querySelector('div[class*="header"]');
                    if (header) {
                        header.after(botContainer);
                    } else {
                        wrap.appendChild(botContainer);
                    }
                }

                if (botContainer) botContainer.classList.remove('hidden-by-bot');

                // Carrega dados
                document.getElementById('bot-count-badge').innerHTML = '...';
                fetchBotData().then(data => {
                    document.getElementById('bot-count-badge').textContent = data.length;
                    renderList(data);
                });

            } else {
                nativeLists.forEach(el => el.classList.remove('hidden-by-bot'));
                if (botContainer) botContainer.classList.add('hidden-by-bot');
            }

            // Atualiza estilo visual da aba
            const myTab = document.getElementById('custom-bot-link');
            if(myTab) {
                const allTabs = myTab.closest('ul').querySelectorAll('a');
                if (show) {
                    allTabs.forEach(t => t.style.opacity = '0.6'); // Apaga as outras
                    myTab.style.opacity = '1';
                    myTab.classList.add('bot-tab-active');
                    myTab.classList.remove('border-transparent');
                } else {
                    allTabs.forEach(t => t.style.opacity = '1');
                    myTab.classList.remove('bot-tab-active');
                    myTab.classList.add('border-transparent');
                }
            }
        }

        function inject() {
            // --- CORREÇÃO DO LOCAL DE INJEÇÃO ---
            // Procura todos os links da página
            const anchors = Array.from(document.querySelectorAll('a'));

            // Encontra especificamente o link que contém "Todos" ou "All" (que é uma das abas)
            // E garante que NÃO está dentro do elemento <nav> ou <aside> (que seria a sidebar)
            const nativeTab = anchors.find(el =>
                (el.innerText.includes('Todos') || el.innerText.includes('All') || el.innerText.includes('Minhas')) &&
                !el.closest('nav') &&
                !el.closest('aside')
            );

            if (!nativeTab) return; // Se não achou a aba nativa, não faz nada ainda

            const tabsUl = nativeTab.closest('ul');
            if (!tabsUl || document.getElementById('custom-bot-li')) return;

            // Cria a aba
            const li = document.createElement('li');
            li.id = 'custom-bot-li';
            li.className = 'flex-shrink-0 mx-1'; // Classes do Tailwind usadas no layout
            li.innerHTML = `
                <a id="custom-bot-link" class="cursor-pointer flex items-center px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors border-b-2 border-transparent">
                    ${CONFIG.TAB_NAME}
                    <span id="bot-count-badge" class="bot-badge">0</span>
                </a>
            `;

            tabsUl.appendChild(li);

            // Click na nossa aba
            li.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleBot(true);
            });

            // Click nas outras abas (para desativar a nossa)
            tabsUl.addEventListener('click', (e) => {
                const clicked = e.target.closest('a');
                if (clicked && clicked.id !== 'custom-bot-link') {
                    toggleBot(false);
                }
            });

            // Loop de atualização dos dados
            setInterval(async () => {
                const data = await fetchBotData();
                const badge = document.getElementById('bot-count-badge');
                if(badge) badge.textContent = data.length;
                if(isActive) renderList(data);
            }, 5000);
        }

        // Observer para rodar quando a tela mudar
        const observer = new MutationObserver(() => {
            // Tenta injetar se encontrar a estrutura de abas
            inject();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Tenta rodar de imediato também
        setTimeout(inject, 1000);
        setTimeout(inject, 3000);

        console.log("Chatwoot Bot Tab Plugin: Carregado e registrado com sucesso!");
    }, 1000); // 1s delay to let Vue mount
})();