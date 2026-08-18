<?php
if (!function_exists('isLoggedIn') || !isLoggedIn()) {
    return;
}
?>
<div id="staffChatbot" class="font-sans">
    <section id="staffChatbotPanel" class="hidden fixed bottom-5 left-[96px] z-[9999] w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        <div class="bg-brand-black text-white px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-brand text-brand-black flex items-center justify-center shadow-sm">
                    <i class="fa-solid fa-robot text-sm"></i>
                </div>
                <div>
                    <p class="text-sm font-bold">BrewMate AI</p>
                    <p class="text-[11px] text-white/70">Assistant for staff and admin workflows</p>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" id="staffChatbotReset" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Reset conversation">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button type="button" id="staffChatbotExpand" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Maximize chat">
                    <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                </button>
                <button type="button" id="staffChatbotClose" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Close staff guide">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>

        <div id="staffChatbotMessages" class="h-80 overflow-y-auto p-4 flex flex-col gap-2.5 bg-[#F8F7F3]">
            <div class="max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 text-sm text-gray-700 shadow-sm">
                Hello! ? I'm BrewMate AI. I can guide you step-by-step so staff and admins can use the POS smoothly ?
            </div>
            <div class="max-w-[95%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 shadow-sm">
                <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Topics</p>
                <div class="flex flex-wrap gap-2">
                    
                    <button type="button" id="staffChatbotStartTutorial" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-light text-brand-black border border-brand/40">Chatbot tutorial</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Take an order</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Apply discount</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Amount received</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Recommended items</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Time-based menu</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Ticket parts</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Order panel controls</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Add new user</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">How to reserve a table</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">How to add a table</button>
                    <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Add new item</button>
                </div>
            </div>
        </div>

        <div class="p-3 border-t border-gray-200 bg-white">
            <div id="staffChatbotTeachBox" class="hidden mb-3 rounded-xl border border-brand/40 bg-brand-light p-3">
                <p class="text-xs font-bold text-brand-black mb-2">Teach the guide this answer</p>
                <textarea id="staffChatbotTeachAnswer" rows="3" class="w-full resize-none rounded-lg border border-brand/40 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Type the correct staff guidance..."></textarea>
                <div class="mt-2 flex items-center justify-end gap-2">
                    <button type="button" id="staffChatbotTeachCancel" class="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-white">Cancel</button>
                    <button type="button" id="staffChatbotTeachSave" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-black text-brand hover:bg-brand-dark hover:text-white">Save Lesson</button>
                </div>
            </div>
            <form id="staffChatbotForm" class="flex items-center gap-2">
                <button type="button" id="staffChatbotQuickTopicsBtn" class="w-10 h-10 rounded-xl border border-gray-200 bg-[#F8F7F3] text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-brand-black transition-colors" title="Show quick topics">
                    <i class="fa-solid fa-list"></i>
                </button>
                <input id="staffChatbotInput" type="text" autocomplete="off" placeholder="Ask BrewMate AI..." class="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                <button type="submit" class="w-10 h-10 rounded-xl bg-brand-black text-brand flex items-center justify-center hover:bg-brand-dark hover:text-white transition-colors" title="Send">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </form>
        </div>
    </section>
</div>

<script>
(() => {
    const root = document.getElementById('staffChatbot');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const sidebar = document.getElementById('sidebar');
    const close = document.getElementById('staffChatbotClose');
    const reset = document.getElementById('staffChatbotReset');
    const expand = document.getElementById('staffChatbotExpand');
    const panel = document.getElementById('staffChatbotPanel');
    const form = document.getElementById('staffChatbotForm');
    const input = document.getElementById('staffChatbotInput');
    const quickTopicsBtn = document.getElementById('staffChatbotQuickTopicsBtn');
    const messages = document.getElementById('staffChatbotMessages');
    const teachBox = document.getElementById('staffChatbotTeachBox');
    const teachAnswer = document.getElementById('staffChatbotTeachAnswer');
    const teachCancel = document.getElementById('staffChatbotTeachCancel');
    const teachSave = document.getElementById('staffChatbotTeachSave');
    let pendingQuestion = '';
    const greetingCard = messages?.firstElementChild || null;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'staffChatbotToggle';
    toggle.title = 'BrewMate AI';
    toggle.className = 'w-full flex items-center gap-3 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-2 font-medium transition-all rounded-xl';
    toggle.innerHTML = '<i class="fa-solid fa-headset w-5 text-center"></i> <span class="nav-text">BrewMate AI</span>';
    const toggleLabel = toggle.querySelector('.nav-text');

    if (sidebar) {
        const sidebarBottom = sidebar.querySelector('.space-y-4');
        const logoutLink = sidebar.querySelector('a[onclick="showLogoutModal()"]');
        if (logoutLink && logoutLink.parentElement) {
            logoutLink.parentElement.insertBefore(toggle, logoutLink);
        } else if (sidebarBottom) {
            sidebarBottom.prepend(toggle);
        } else {
            sidebar.appendChild(toggle);
        }
    } else {
        root.appendChild(toggle);
        toggle.className = 'fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full bg-brand text-brand-black shadow-xl border border-brand-dark/20 flex items-center justify-center hover:bg-brand-dark hover:text-white transition-colors';
        toggle.innerHTML = '<i class="fa-solid fa-headset text-xl"></i>';
        panel.className = panel.className.replace('left-[96px]', 'right-5');
    }

    const updatePanelPosition = () => {
        if (!sidebar) return;
        const rect = sidebar.getBoundingClientRect();
        panel.style.left = `${Math.max(16, rect.right + 16)}px`;
    };

    const syncSidebarState = () => {
        if (!sidebar || !toggleLabel) return;
        const isCollapsed = localStorage.getItem('sidebarCollapsed') !== 'false';
        toggleLabel.classList.toggle('hidden', isCollapsed);
        toggle.classList.toggle('justify-center', isCollapsed);
    };

    syncSidebarState();
    const CHATBOT_OPEN_KEY = 'staffChatbotOpen';
    const CHATBOT_EXPANDED_KEY = 'staffChatbotExpanded';
    const CHATBOT_HISTORY_KEY = 'staffChatbotHistory';
    const DEFAULT_MESSAGES_HTML = messages ? messages.innerHTML : '';

    panel.classList.add('staff-chatbot-panel');

    const ensurePanelAnimationStyle = () => {
        if (document.getElementById('staffChatbotPanelAnimStyle')) return;
        const style = document.createElement('style');
        style.id = 'staffChatbotPanelAnimStyle';
        style.textContent = `
            .staff-chatbot-panel-open-enter {
                opacity: 0;
                transform: translateY(10px) scale(0.98);
            }
            .staff-chatbot-panel-open-active {
                opacity: 1;
                transform: translateY(0) scale(1);
                transition: opacity 180ms ease, transform 180ms ease;
            }
            .staff-chatbot-panel-close-active {
                opacity: 0;
                transform: translateY(8px) scale(0.98);
                transition: opacity 140ms ease, transform 140ms ease;
            }
            .staff-chatbot-intro-enter {
                opacity: 0;
                transform: translateY(8px);
            }
            .staff-chatbot-intro-active {
                opacity: 1;
                transform: translateY(0);
                transition: opacity 450ms ease, transform 450ms ease;
            }
            .staff-chatbot-panel {
                transition: width 180ms ease, max-width 180ms ease;
            }
            .staff-chatbot-panel-expanded {
                width: min(720px, calc(100vw - 2rem)) !important;
            }
            .staff-chatbot-panel-expanded #staffChatbotMessages {
                height: min(62vh, 640px) !important;
            }
        `;
        document.head.appendChild(style);
    };

    const setExpanded = (expanded) => {
        panel.classList.toggle('staff-chatbot-panel-expanded', expanded);
        if (expand) {
            expand.title = expanded ? 'Minimize chat' : 'Maximize chat';
            expand.innerHTML = expanded
                ? '<i class="fa-solid fa-down-left-and-up-right-to-center"></i>'
                : '<i class="fa-solid fa-up-right-and-down-left-from-center"></i>';
        }
        localStorage.setItem(CHATBOT_EXPANDED_KEY, expanded ? 'true' : 'false');
        messages.scrollTop = messages.scrollHeight;
    };

    const QUICK_TOPICS_HTML = `
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Topics</p>
        <div class="flex flex-wrap gap-2">
            <button type="button" id="staffChatbotStartTutorial" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-light text-brand-black border border-brand/40">Chatbot tutorial</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Take an order</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Apply discount</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Amount received</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Recommended items</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Time-based menu</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Ticket parts</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Order panel controls</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Add new user</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">How to reserve a table</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">How to add a table</button>
            <button type="button" class="staff-chatbot-suggestion text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Add new item</button>
        </div>
    `;

    const bindSuggestionButtons = (scope = document) => {
        scope.querySelectorAll('.staff-chatbot-suggestion').forEach((button) => {
            button.onclick = () => {
                const topic = button.textContent.trim();
                if (topic === 'Chatbot tutorial') {
                    startTutorial();
                    return;
                }
                if (topic === 'Manage inventory items' || topic === 'Add new item') {
                    const isItemsPage = /\/items\.php$/i.test(window.location.pathname);
                    if (!isItemsPage) {
                        window.location.href = 'items.php?chatbot_tutorial=' + encodeURIComponent(topic);
                        return;
                    }
                }
                if (topic === 'Add new user') {
                    const isSettingsPage = /\/settings\.php$/i.test(window.location.pathname);
                    if (!isSettingsPage) {
                        window.location.href = 'settings.php?chatbot_tutorial=' + encodeURIComponent(topic);
                        return;
                    }
                }
                askBot(topic);
            };
        });
    };

    const runOpenIntroSequence = () => {
        const quickTopicsCard = messages?.querySelector('.staff-chatbot-quick-topics');
        if (!greetingCard || !quickTopicsCard) return;

        greetingCard.classList.remove('staff-chatbot-intro-active');
        quickTopicsCard.classList.remove('staff-chatbot-intro-active');
        greetingCard.classList.add('staff-chatbot-intro-enter');
        quickTopicsCard.classList.add('hidden', 'staff-chatbot-intro-enter');

        requestAnimationFrame(() => {
            greetingCard.classList.remove('staff-chatbot-intro-enter');
            greetingCard.classList.add('staff-chatbot-intro-active');

            setTimeout(() => {
                quickTopicsCard.classList.remove('hidden');
                requestAnimationFrame(() => {
                    quickTopicsCard.classList.remove('staff-chatbot-intro-enter');
                    quickTopicsCard.classList.add('staff-chatbot-intro-active');
                });
            }, 900);
        });
    };

    const showQuickTopicsAgain = () => {
        const quickTopicsCard = document.createElement('div');
        quickTopicsCard.className = 'staff-chatbot-quick-topics max-w-[95%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 shadow-sm';
        quickTopicsCard.innerHTML = QUICK_TOPICS_HTML;
        quickTopicsCard.classList.remove('hidden', 'staff-chatbot-intro-active');
        quickTopicsCard.classList.add('staff-chatbot-intro-enter');
        messages.appendChild(quickTopicsCard);
        bindSuggestionButtons(quickTopicsCard);
        requestAnimationFrame(() => {
            quickTopicsCard.classList.remove('staff-chatbot-intro-enter');
            quickTopicsCard.classList.add('staff-chatbot-intro-active');
            messages.scrollTop = messages.scrollHeight;
        });
        saveChatHistory();
    };

    const openPanel = () => {
        ensurePanelAnimationStyle();
        updatePanelPosition();
        panel.classList.remove('hidden', 'staff-chatbot-panel-close-active', 'staff-chatbot-panel-open-active');
        panel.classList.add('staff-chatbot-panel-open-enter');
        requestAnimationFrame(() => {
            panel.classList.remove('staff-chatbot-panel-open-enter');
            panel.classList.add('staff-chatbot-panel-open-active');
            runOpenIntroSequence();
        });
        localStorage.setItem(CHATBOT_OPEN_KEY, 'true');
        input.focus();
    };

    const closePanel = () => {
        ensurePanelAnimationStyle();
        panel.classList.remove('staff-chatbot-panel-open-enter', 'staff-chatbot-panel-open-active');
        panel.classList.add('staff-chatbot-panel-close-active');
        localStorage.setItem(CHATBOT_OPEN_KEY, 'false');
        setTimeout(() => {
            panel.classList.add('hidden');
            panel.classList.remove('staff-chatbot-panel-close-active');
        }, 145);
    };

    const formatStepsReply = (text) => {
        const normalized = String(text || '').replace(/\r\n/g, '\n');
        const match = normalized.match(/^(.*?):\s*(1\..*)$/s);
        if (!match) return null;

        const title = match[1].trim();
        const stepsPart = match[2].trim();
        const rawSteps = stepsPart.split(/\n?\s*(?=\d+\.)/).map((item) => item.trim()).filter(Boolean);
        if (rawSteps.length < 2) return null;

        const steps = rawSteps.map((item) => item.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        if (steps.length < 2) return null;

        return { title, steps };
    };

    const ensureChatAnimationStyle = () => {
        if (document.getElementById('staffChatbotMessageAnimStyle')) return;
        const style = document.createElement('style');
        style.id = 'staffChatbotMessageAnimStyle';
        style.textContent = `
            .staff-chatbot-message-enter {
                opacity: 0;
                transform: translateY(8px);
            }
            .staff-chatbot-message-active {
                opacity: 1;
                transform: translateY(0);
                transition: opacity 180ms ease, transform 180ms ease;
            }
            #staffChatbotMessages > * {
                margin: 0 !important;
            }
            .staff-chatbot-bubble > p {
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    };

    const serializeMessageNode = (node) => {
        if (!node) return null;
        return {
            html: node.innerHTML,
            className: node.className || ''
        };
    };

    const saveChatHistory = () => {
        if (!messages) return;
        const payload = Array.from(messages.children).map((node) => serializeMessageNode(node)).filter(Boolean);
        try {
            localStorage.setItem(CHATBOT_HISTORY_KEY, JSON.stringify(payload));
        } catch (e) {
            // Ignore storage quota errors.
        }
    };

    const restoreChatHistory = () => {
        if (!messages) return;
        let raw = null;
        try {
            raw = localStorage.getItem(CHATBOT_HISTORY_KEY);
        } catch (e) {
            raw = null;
        }
        if (!raw) return;

        let list = [];
        try {
            list = JSON.parse(raw);
        } catch (e) {
            list = [];
        }
        if (!Array.isArray(list) || list.length === 0) return;

        messages.innerHTML = '';
        list.forEach((item) => {
            if (!item || typeof item.html !== 'string') return;
            const bubble = document.createElement('div');
            bubble.className = typeof item.className === 'string' ? item.className : '';
            if (!bubble.className.includes('staff-chatbot-bubble')) {
                bubble.className = `${bubble.className} staff-chatbot-bubble`.trim();
            }
            bubble.innerHTML = item.html;
            messages.appendChild(bubble);
        });
        if (!messages.querySelector('.staff-chatbot-quick-topics')) {
            const quick = document.createElement('div');
            quick.className = 'staff-chatbot-quick-topics max-w-[95%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 shadow-sm';
            quick.innerHTML = QUICK_TOPICS_HTML;
            messages.appendChild(quick);
        }
        bindSuggestionButtons(messages);
        messages.scrollTop = messages.scrollHeight;
    };

    const resetConversation = () => {
        if (!messages) return;
        messages.innerHTML = DEFAULT_MESSAGES_HTML;
        localStorage.removeItem(CHATBOT_HISTORY_KEY);
        bindSuggestionButtons(messages);
        messages.scrollTop = messages.scrollHeight;
    };
    const addMessage = (text, sender) => {
        const bubble = document.createElement('div');
        bubble.className = sender === 'user'
            ? 'staff-chatbot-bubble self-end ml-auto block w-fit max-w-[85%] text-right bg-brand text-brand-black rounded-2xl rounded-tr-md px-3 py-2 text-sm font-medium shadow-sm'
            : 'staff-chatbot-bubble block w-fit max-w-[85%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 text-sm text-gray-700 shadow-sm';
        if (sender === 'bot') {
            const structured = formatStepsReply(text);
            if (structured) {
                const title = document.createElement('p');
                title.className = 'text-xs font-bold uppercase tracking-wider text-gray-500 mb-2';
                title.textContent = structured.title;
                bubble.appendChild(title);

                const flow = document.createElement('div');
                flow.className = 'space-y-1.5';

                structured.steps.forEach((step, index) => {
                    const stepBox = document.createElement('div');
                    stepBox.className = 'rounded-lg border border-gray-200 bg-[#F8F7F3] px-2.5 py-2 text-xs text-gray-700';
                    stepBox.textContent = `${index + 1}. ${step}`;
                    flow.appendChild(stepBox);

                    if (index < structured.steps.length - 1) {
                        const arrow = document.createElement('div');
                        arrow.className = 'text-center text-[10px] text-gray-400 font-bold';
                        arrow.textContent = '->';
                        flow.appendChild(arrow);
                    }
                });

                bubble.appendChild(flow);
            } else {
                bubble.textContent = text;
            }
        } else {
            bubble.textContent = text;
        }
        if (sender === 'bot') {
            ensureChatAnimationStyle();
            bubble.classList.add('staff-chatbot-message-enter');
        }

        messages.appendChild(bubble);
        if (sender === 'bot') {
            requestAnimationFrame(() => {
                bubble.classList.remove('staff-chatbot-message-enter');
                bubble.classList.add('staff-chatbot-message-active');
            });
        }
        messages.scrollTop = messages.scrollHeight;
        saveChatHistory();
        return bubble;
    };

    const TOPIC_FOLLOWUPS = {
        'Take an order': ['What details should I confirm before sending?', 'How do I handle a customer order change?'],
        'Dine-in table flow': ['What if no table is available?', 'How do I move a guest to another table?'],
        'Take-out flow': ['How do I mark it as take-out correctly?', 'What final check before handing out?'],
        'Process payment': ['What if the cash is not exact?', 'How do I handle split payment requests?'],
        'Apply discount': ['What proof should I check first?', 'How do I verify discount was applied?'],
        'Amount received': ['What if customer cash is lower than total?', 'How do I confirm the right change amount?'],
        'Recommended items': ['How should I suggest recommended items to customers?', 'When should I avoid recommending an item?'],
        'Time-based menu': ['What is the time-based menu used for?', 'How do I collapse or open the time-based menu panel?'],
        'Ticket parts': ['What details should I verify first in a ticket?', 'Which parts affect completion and payment checks?'],
        'Order panel controls': ['When should I use Clear All?', 'How do I adjust quantity and remove one item safely?'],
        'Add new user': ['What details are required for a new user?', 'Which role should I choose for the staff account?'],
        'Print receipt': ['What if receipt printing fails?', 'How do I reprint a receipt?'],
        'Complete ticket': ['What should I verify before completion?', 'How do I fix a wrong item before closing?'],
        'Cancel order': ['When should I cancel instead of edit?', 'What should I log after cancellation?'],
        'Check table status': ['How do I quickly find free tables?', 'What if table status looks wrong?'],
        'Restock item': ['Which items should be restocked first?', 'How do I confirm stock was updated?'],
        'Low stock alerts': ['How do I prioritize low stock items?', 'Who should be notified for urgent restock?'],
        'Sales report guide': ['What should I check before submitting report?', 'How do I verify totals are correct?'],
        'Manage users': ['How do I safely deactivate a user?', 'What role should I assign for cashier?'],
        'Add new item': ['What item details are required?', 'How do I set opening stock correctly?'],
        'Manage inventory items': ['How do I edit item price safely?', 'How do I mark an item unavailable?'],
        'Login help': ['What to check first on login errors?', 'When should I reset password?']
    };
    const GUIDE_PROMPT_BY_TOPIC = {
        'Take an order': 'guide me how to take an order',
        'Dine-in table flow': 'guide me how to handle dine-in table flow',
        'Take-out flow': 'guide me how to handle take-out flow',
        'Process payment': 'guide me how to process payment',
        'Apply discount': 'guide me how to apply discount',
        'Amount received': 'guide me how to enter amount received',
        'Recommended items': 'guide me where recommended items are located',
        'Time-based menu': 'guide me where time-based menu is and how to collapse open it',
        'Ticket parts': 'guide me all parts of a ticket',
        'Order panel controls': 'guide me where clear all plus minus and delete are',
        'Add new user': 'guide me how to add new user',
        'Print receipt': 'guide me how to print receipt',
        'Complete ticket': 'guide me how to complete ticket',
        'Cancel order': 'guide me how to cancel order',
        'Check table status': 'guide me how to check table status',
        'How to reserve a table': 'guide me how to reserve a table',
        'How to add a table': 'guide me how to add a table',
        'Restock item': 'guide me how to restock item',
        'Low stock alerts': 'guide me how to handle low stock alerts',
        'Sales report guide': 'guide me how to create sales report',
        'Manage users': 'guide me how to manage users',
        'Add new item': 'guide me how to add new item',
        'Manage inventory items': 'guide me how to manage inventory items',
        'Login help': 'guide me how to fix login issues'
    };

    const getGuidePrompt = (topic) => GUIDE_PROMPT_BY_TOPIC[topic] || `guide me how to ${String(topic || 'this').toLowerCase()}`;
    const GUIDE_TO_TOPIC = Object.fromEntries(
        Object.entries(GUIDE_PROMPT_BY_TOPIC).map(([topic, prompt]) => [prompt.toLowerCase().trim(), topic])
    );
    const resolveTutorialTopic = (message) => {
        const normalized = String(message || '').toLowerCase().trim();
        return GUIDE_TO_TOPIC[normalized] || message;
    };
    const openTutorialTopic = (topic) => {
        const resolvedTopic = resolveTutorialTopic(topic);
        const isItemsPage = /\/items\.php$/i.test(window.location.pathname);
        if ((resolvedTopic === 'Manage inventory items' || resolvedTopic === 'Add new item') && !isItemsPage) {
            window.location.href = 'items.php?chatbot_tutorial=' + encodeURIComponent(resolvedTopic);
            return;
        }
        const isSettingsPage = /\/settings\.php$/i.test(window.location.pathname);
        if (resolvedTopic === 'Add new user' && !isSettingsPage) {
            window.location.href = 'settings.php?chatbot_tutorial=' + encodeURIComponent(resolvedTopic);
            return;
        }
        startTutorial(resolvedTopic);
    };

    const askBot = async (message) => {
        const cleanMessage = message.trim();
        if (!cleanMessage) return;
        const resolvedGuideTopic = resolveTutorialTopic(cleanMessage);
        if (resolvedGuideTopic !== cleanMessage && tutorialFlows?.byTopic?.[resolvedGuideTopic]) {
            openTutorialTopic(resolvedGuideTopic);
            return;
        }

        teachBox.classList.add('hidden');
        addMessage(cleanMessage, 'user');
        input.value = '';
        input.disabled = true;
        const loading = addMessage('Checking the staff guide...', 'bot');

        try {
            const response = await fetch('api.php?action=staff_chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '<?php echo csrfToken(); ?>' },
                body: JSON.stringify({ message: cleanMessage })
            });
            const result = await response.json();
            loading.remove();
            addMessage(result.success ? result.reply : (result.error || 'The staff guide is unavailable right now.'), 'bot');
            if (result.success) {
                const topicFollowUps = TOPIC_FOLLOWUPS[cleanMessage] || ['Can you explain this in simpler steps?', 'What should I do if this fails?'];
                const hasGuideTopic = Object.prototype.hasOwnProperty.call(GUIDE_PROMPT_BY_TOPIC, cleanMessage);
                const guidePrompt = hasGuideTopic ? getGuidePrompt(cleanMessage) : '';
                const followUpButtonsHtml = topicFollowUps.map((q) => `<button type="button" class="staff-chatbot-followup text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">${q}</button>`).join('');
                const guideButtonHtml = hasGuideTopic
                    ? `<button type="button" class="staff-chatbot-followup-guide text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-light text-brand-black border border-brand/40" data-topic="${String(cleanMessage).replace(/"/g, '&quot;')}">${guidePrompt}</button>`
                    : '';
                const followUp = document.createElement('div');
                followUp.className = 'staff-chatbot-bubble max-w-[95%] bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 shadow-sm';
                followUp.innerHTML = `
                    <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Follow-up</p>
                    <div class="flex flex-wrap gap-2">
                        ${followUpButtonsHtml}
                        ${guideButtonHtml}
                    </div>
                `;
                ensureChatAnimationStyle();
                followUp.classList.add('staff-chatbot-message-enter');
                messages.appendChild(followUp);
                requestAnimationFrame(() => {
                    followUp.classList.remove('staff-chatbot-message-enter');
                    followUp.classList.add('staff-chatbot-message-active');
                });
                messages.scrollTop = messages.scrollHeight;
                saveChatHistory();

                followUp.querySelectorAll('.staff-chatbot-followup').forEach((btn) => {
                    btn.addEventListener('click', () => askBot(btn.textContent || 'Show next step'));
                });
                const guideBtn = followUp.querySelector('.staff-chatbot-followup-guide');
                if (guideBtn) {
                    guideBtn.addEventListener('click', () => {
                        const topic = guideBtn.getAttribute('data-topic') || cleanMessage;
                        openTutorialTopic(topic);
                    });
                }
            }
            if (result.success && result.needs_training) {
                pendingQuestion = cleanMessage;
                teachAnswer.value = '';
                teachBox.classList.remove('hidden');
            }
        } catch (error) {
            loading.remove();
            addMessage('The staff guide is unavailable right now.', 'bot');
        } finally {
            input.disabled = false;
            input.focus();
        }
    };

    toggle.addEventListener('click', () => {
        if (panel.classList.contains('hidden')) {
            openPanel();
        } else {
            closePanel();
        }
    });
    restoreChatHistory();
    setExpanded(localStorage.getItem(CHATBOT_EXPANDED_KEY) === 'true');
    if (localStorage.getItem(CHATBOT_OPEN_KEY) === 'true') {
        openPanel();
    }
    window.addEventListener('resize', updatePanelPosition);
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        setTimeout(() => {
            syncSidebarState();
            updatePanelPosition();
        }, 0);
    });
    close.addEventListener('click', closePanel);
    reset?.addEventListener('click', resetConversation);
    expand?.addEventListener('click', () => {
        setExpanded(!panel.classList.contains('staff-chatbot-panel-expanded'));
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        askBot(input.value);
    });

    quickTopicsBtn?.addEventListener('click', showQuickTopicsAgain);
    teachCancel.addEventListener('click', () => {
        teachBox.classList.add('hidden');
        teachAnswer.value = '';
        pendingQuestion = '';
    });
    teachSave.addEventListener('click', async () => {
        const answer = teachAnswer.value.trim();
        if (!pendingQuestion || !answer) return;

        teachSave.disabled = true;
        teachSave.textContent = 'Saving...';
        try {
            const response = await fetch('api.php?action=staff_chatbot_learn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '<?php echo csrfToken(); ?>' },
                body: JSON.stringify({ question: pendingQuestion, answer })
            });
            const result = await response.json();
            addMessage(result.success ? result.reply : (result.error || 'I could not save that lesson.'), 'bot');
            if (result.success) {
                teachBox.classList.add('hidden');
                teachAnswer.value = '';
                pendingQuestion = '';
            }
        } catch (error) {
            addMessage('I could not save that lesson right now.', 'bot');
        } finally {
            teachSave.disabled = false;
            teachSave.textContent = 'Save Lesson';
            input.focus();
        }
    });
    
    const tutorialButton = document.getElementById('staffChatbotStartTutorial');
    let tutorialActive = false;
    let tutorialStep = 0;

    const tutorialFlows = {
        default: [

        {
            target: '#staffChatbotMessages',
            title: 'Read quick topics',
            text: 'These quick topics help staff start common tasks faster.'
        },
        {
            target: '.staff-chatbot-suggestion',
            title: 'Use a suggestion',
            text: 'Click any quick topic to ask BrewMate automatically.'
        },
        {
            target: '#staffChatbotQuickTopicsBtn',
            title: 'Show quick topics again',
            text: 'Use this button anytime to show the quick topics card again.'
        },
        {
            target: '#staffChatbotReset',
            title: 'Reset chat',
            text: 'Use Reset Chat to clear messages and restart the conversation.'
        },
        {
            target: '#staffChatbotExpand',
            title: 'Minimize or maximize',
            text: 'Use this button to minimize or maximize the chatbot panel size.'
        },
        {
            target: '#staffChatbotInput',
            title: 'Type a question',
            text: 'You can type your own question here, then press Send.'
        },
        {
            target: '#staffChatbotForm button[type="submit"]',
            title: 'Send message',
            text: 'Click Send to get a step-by-step answer from BrewMate.'
        },
        {
            target: '#staffChatbotClose',
            title: 'Close panel',
            text: 'Click close when done, or reopen BrewMate anytime from the sidebar.'
        }
        ],
        byTopic: {
            'Take an order': [
                { target: '[onclick^="addToCart("]', title: 'Add first item', text: 'Click Add on the selected menu item to put it in cart.' },
                { target: 'button[onclick="showBillModal()"]', title: 'Open bill/cart', text: 'Click Print Bill to review items and proceed with order setup.' },
                { target: '#dineInBtn', title: 'Choose order type', text: 'Select Dine In or Take Out based on customer request.' },
                { target: '#staffChatbotTutorialMockCard', title: 'Assign table (Dine In)', text: 'For dine-in, click the table name area to pick an available table.', mockModal: 'table_select' },
                { target: '#staffChatbotTutorialMockCard', title: 'Sample Bill Review', text: 'Review cart items, total, payment method, and amount received.', mockModal: 'bill_review' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Finish with confirmation', text: 'Ask BrewMate for a final order checklist before completing payment.' }
            ],
            'Process payment': [
                { target: '#staffChatbotMessages', title: 'Use payment topic', text: 'Use Process payment topic for the exact workflow.' },
                { target: '#staffChatbotInput', title: 'Confirm payment type', text: 'Type payment details if needed (cash, card, etc.).' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Get payment steps', text: 'Send to receive payment and receipt steps.' }
            ],
            'Print receipt': [
                { target: '#staffChatbotMessages', title: 'Select receipt topic', text: 'Choose the Print receipt topic to avoid missing steps.' },
                { target: '#staffChatbotInput', title: 'Add ticket detail', text: 'Type a ticket reference if you need a specific receipt.' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Send to print guide', text: 'Send and follow the print instructions.' }
            ],
            'Dine-in table flow': [
                { target: '#dineInBtn', title: 'Set Dine In', text: 'Set order type to Dine In before assigning a table.' },
                { target: 'button[onclick="showTableSelectModal()"]', title: 'Open table selector', text: 'Click table label to open available tables.' },
                { target: '#tableSelectModal', title: 'Pick table', text: 'Select an available table and confirm.' },
                { target: '#selectedTableLabel', title: 'Verify assignment', text: 'Confirm selected table is shown in the order panel.' }
            ],
            'Take-out flow': [
                { target: '#takeAwayBtn', title: 'Set Take Out', text: 'Switch order type to Take Out.' },
                { target: '[onclick^="addToCart("]', title: 'Add item', text: 'Add customer items to the cart.' },
                { target: 'button[onclick="showBillModal()"]', title: 'Review bill', text: 'Open bill and verify totals for take-out order.' },
                { target: '#billModal', title: 'Finalize take-out', text: 'Complete payment and finish the take-out order.' }
            ],
            'Apply discount': [
                { target: 'button[onclick="showBillModal()"]', title: 'Open bill', text: 'Open the bill before applying discount.' },
                { target: '#staffChatbotTutorialMockCard', title: 'Open discount options', text: 'Click Coupon to open discount choices.', mockModal: 'apply_discount' },
                { target: '#tutorialMockDiscountType', title: 'Select discount', text: 'Choose Senior, PWD, or custom discount then confirm.', mockModal: 'apply_discount' },
                { target: '#tutorialMockDiscountTotal', title: 'Check updated total', text: 'Verify total reflects the selected discount.', mockModal: 'apply_discount' }
            ],
            'Amount received': [
                { target: 'button[onclick="showBillModal()"]', title: 'Open bill', text: 'Open the bill to enter payment details.' },
                { target: '#staffChatbotTutorialMockCard', title: 'Enter amount received', text: 'Type the cash amount received from the customer.', mockModal: 'amount_received' },
                { target: '#tutorialMockAmountReceivedChange', title: 'Check computed change', text: 'Verify the change value is correct before completing the order.', mockModal: 'amount_received' }
            ],
            'Recommended items': [
                { target: '#staffChatbotTutorialMockCard', title: 'Locate recommended area', text: 'This is where recommended items are shown to help upsell.', mockModal: 'recommended_items_location' },
                { target: '#tutorialMockRecommendedCard', title: 'Use recommendations', text: 'Suggest these items when they match the customer order.', mockModal: 'recommended_items_location' }
            ],
            'Time-based menu': [
                { target: '#timeMenuPanel', title: 'Locate time-based menu', text: 'Find the Time-based Menu panel on the right side of the Menu screen.' },
                { target: '#timeMenuToggle', title: 'Collapse or open panel', text: 'Click this header button to collapse or open the time-based menu panel.' },
                { target: '#timeMenuContent', title: 'Use featured items', text: 'When expanded, use these featured items for faster time-based suggestions.' }
            ],
            'Ticket parts': [
                { target: '#staffChatbotTutorialMockCard', title: 'Ticket header', text: 'Header shows order number, customer name, table/order type, and time.', mockModal: 'ticket_parts' },
                { target: '#tutorialMockTicketItems', title: 'Items section', text: 'This section lists ordered items with quantity and line totals.', mockModal: 'ticket_parts' },
                { target: '#tutorialMockTicketTotals', title: 'Totals and payment', text: 'Verify subtotal, tax, total, and payment method before completing.', mockModal: 'ticket_parts' },
                { target: '#tutorialMockTicketActions', title: 'Action buttons', text: 'Use actions like Print, Start, Complete, or Cancel as needed.', mockModal: 'ticket_parts' }
            ],
            'Order panel controls': [
                { target: '#staffChatbotTutorialMockCard', title: 'Clear All button', text: 'Use Clear All to remove all current cart items at once.', mockModal: 'order_panel_controls' },
                { target: '#tutorialMockOrderPanelQty', title: 'Add or subtract quantity', text: 'Use + and - buttons to quickly adjust quantity per item.', mockModal: 'order_panel_controls' },
                { target: '#tutorialMockOrderPanelDelete', title: 'Delete one item', text: 'Use the trash icon to remove a single item from the order panel.', mockModal: 'order_panel_controls' }
            ],
            'Add new user': [
                { target: '#staffChatbotTutorialMockCard', title: 'Open Add User', text: 'In Settings, use Add User to create a staff account.', mockModal: 'add_new_user' },
                { target: '#tutorialMockAddUserFields', title: 'Fill user details', text: 'Enter employee ID, username, PIN, full name, and role.', mockModal: 'add_new_user' },
                { target: '#tutorialMockAddUserRole', title: 'Choose user role', text: 'Select Admin for full access or Cashier for cashier workflows.', mockModal: 'add_new_user' },
                { target: '#tutorialMockAddUserSubmit', title: 'Save user', text: 'Click Add User to create the account.', mockModal: 'add_new_user' }
            ],
            'Complete ticket': [
                { target: 'button[onclick="showBillModal()"]', title: 'Open bill', text: 'Open bill to proceed with order completion.' },
                { target: '#billModal', title: 'Finalize details', text: 'Check items, totals, payment method, and customer amount.' },
                { target: '#staffChatbotInput', title: 'Ask final checks', text: 'Ask BrewMate for final verification steps if needed.' }
            ],
            'Cancel order': [
                { target: '.fa-trash-can', title: 'Clear order action', text: 'Use the clear/remove controls to cancel current order items.' },
                { target: '#clearCartModal', title: 'Confirm cancellation', text: 'Confirm the clear action to cancel the order safely.' },
                { target: '#staffChatbotInput', title: 'Document reason', text: 'Optionally record the cancellation reason with BrewMate guidance.' }
            ],
            'Check table status': [
                { target: 'button[onclick="showTableSelectModal()"]', title: 'Open table list', text: 'Open the table selector to view available tables.' },
                { target: '#tableSelectModal', title: 'Review status', text: 'Check table availability and choose the right table.' }
            ],
            'How to reserve a table': [
                { target: '.grid [onclick^="showTableDetails("]', title: 'Open a table', text: 'Click a table card to open Table Details.' },
                { target: '#staffChatbotTutorialMockCard', title: 'Sample Table Details Modal', text: 'This is a sample modal preview used only for tutorial.', mockModal: 'reserve_table' },
                { target: '#tutorialMockReserveReservedBtn', title: 'Set as Reserved', text: 'In the real modal, click Reserved to mark this table as reserved.', mockModal: 'reserve_table' }
            ],
            'How to add a table': [
                { target: '#staffChatbotTutorialMockCard', title: 'Open Add Table', text: 'Use the + button in Table Services to open Add Table.', mockModal: 'add_table' },
                { target: '#tutorialMockAddTableFields', title: 'Fill table info', text: 'Enter table number, chairs, and area.', mockModal: 'add_table' },
                { target: '#tutorialMockAddTableSubmit', title: 'Save table', text: 'Click Add Table to create the new table.', mockModal: 'add_table' }
            ],
            'Restock item': [
                { target: '#staffChatbotInput', title: 'Ask restock steps', text: 'Use this topic to get restock workflow for inventory updates.' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Send restock request', text: 'Send and follow the step-by-step restock instructions.' }
            ],
            'Low stock alerts': [
                { target: '#stockNotificationModal', title: 'Open stock alerts', text: 'Check low stock notification list and flagged items.' },
                { target: '#staffChatbotInput', title: 'Ask priority actions', text: 'Ask BrewMate which low-stock items should be restocked first.' }
            ],
            'Sales report guide': [
                { target: '#staffChatbotInput', title: 'Request report steps', text: 'Ask for end-of-day sales report workflow.' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Follow report checklist', text: 'Send and follow the checklist for report generation.' }
            ],
            'Manage users': [
                { target: '#staffChatbotInput', title: 'Ask user-management steps', text: 'Request add/edit/deactivate user guidance.' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Run admin checklist', text: 'Follow BrewMate admin steps before saving changes.' }
            ],
            'Add new item': [
                { target: 'button[onclick="showAddItemModal()"]', title: 'Open Add Item form', text: 'Click Add New Dish to start creating a new menu item.' },
                { target: '#staffChatbotTutorialMockCard', title: 'Sample Add Item Modal', text: 'This sample modal shows what to fill in, without opening the real form.', mockModal: 'add_new_item' },
                { target: '#tutorialMockAddItemSubmit', title: 'Save item', text: 'In the real modal, click Add Item to save and confirm it appears in the list.', mockModal: 'add_new_item' }
            ],
            'Manage inventory items': [
                { target: 'button[onclick="showAddItemModal()"]', title: 'Add new item', text: 'Click Add New Dish to create a new inventory product.' },
                { target: 'input[name="search"]', title: 'Find existing item', text: 'Use search to quickly locate an item to edit or restock.' },
                { target: 'button[onclick^="quickAddStock("]', title: 'Quick restock', text: 'Use +1 / +5 / +10 stock buttons for fast quantity updates.' },
                { target: 'main', title: 'Review inventory list', text: 'Check price, stock, and availability before saving changes.' }
            ],
            'Login help': [
                { target: '#staffChatbotInput', title: 'Describe login issue', text: 'Enter the exact login problem for targeted help.' },
                { target: '#staffChatbotForm button[type="submit"]', title: 'Follow troubleshooting', text: 'Use BrewMate troubleshooting steps in order.' }
            ]
        },
        active: null
    };

    const tutorialOverlay = document.createElement('div');
    tutorialOverlay.id = 'staffChatbotTutorialOverlay';
    tutorialOverlay.className = 'hidden fixed inset-0 z-[10000] bg-black/25';

    const tutorialStyle = document.createElement('style');
    tutorialStyle.textContent = `
        .staff-chatbot-tutorial-focus {
            opacity: 1 !important;
            filter: none !important;
            transform: none;
            z-index: 10002 !important;
        }
        .staff-chatbot-tutorial-card-enter {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
        }
        .staff-chatbot-tutorial-card-active {
            opacity: 1;
            transform: translateY(0) scale(1);
            transition: opacity 180ms ease, transform 180ms ease;
        }
        .staff-chatbot-tutorial-card-exit {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
            transition: opacity 140ms ease, transform 140ms ease;
        }
    `;
    document.head.appendChild(tutorialStyle);

    const tutorialCard = document.createElement('div');
    tutorialCard.id = 'staffChatbotTutorialCard';
    tutorialCard.className = 'hidden fixed z-[10001] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl';
    tutorialCard.innerHTML = `
        <p id="staffChatbotTutorialTitle" class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"></p>
        <p id="staffChatbotTutorialText" class="text-sm text-gray-700 mb-3"></p>
        <div class="flex items-center justify-between gap-2">
            <button type="button" id="staffChatbotTutorialSkip" class="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100">Skip</button>
            <button type="button" id="staffChatbotTutorialNext" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-black text-brand hover:bg-brand-dark hover:text-white">Next</button>
        </div>
    `;

    document.body.appendChild(tutorialOverlay);
    document.body.appendChild(tutorialCard);
    const tutorialMockModal = document.createElement('div');
    tutorialMockModal.id = 'staffChatbotTutorialMockModal';
    tutorialMockModal.className = 'hidden fixed inset-0 z-[10000] bg-black/35 p-4 overflow-y-auto';
    tutorialMockModal.innerHTML = `
        <div id="staffChatbotTutorialMockCard" class="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl p-5 mx-auto">
            <div id="tutorialMockModalContent"></div>
        </div>
    `;
    document.body.appendChild(tutorialMockModal);
    const tutorialMockModalContent = tutorialMockModal.querySelector('#tutorialMockModalContent');

    const tutorialTitle = document.getElementById('staffChatbotTutorialTitle');
    const tutorialText = document.getElementById('staffChatbotTutorialText');
    const tutorialNext = document.getElementById('staffChatbotTutorialNext');
    const tutorialSkip = document.getElementById('staffChatbotTutorialSkip');
    let currentTutorialHighlight = null;
    let tutorialAnimating = false;
    let tutorialStepRetries = 0;
    let tutorialSessionId = 0;

    const clearTutorialHighlight = () => {
        if (currentTutorialHighlight) {
            currentTutorialHighlight.removeAttribute('data-tutorial-highlight');
            currentTutorialHighlight.classList.remove('relative', 'z-[10002]', 'ring-4', 'ring-brand', 'rounded-xl', 'staff-chatbot-tutorial-focus');
            currentTutorialHighlight = null;
        }

        // Safety cleanup in case earlier states left multiple highlighted nodes.
        document.querySelectorAll('[data-tutorial-highlight]').forEach((el) => {
            el.removeAttribute('data-tutorial-highlight');
            el.classList.remove('relative', 'z-[10002]', 'ring-4', 'ring-brand', 'rounded-xl', 'staff-chatbot-tutorial-focus');
        });
    };

    const stopTutorial = () => {
        tutorialSessionId += 1;
        tutorialActive = false;
        tutorialFlows.active = null;
        tutorialStepRetries = 0;
        tutorialOverlay.classList.add('hidden');
        tutorialCard.classList.add('hidden');
        tutorialMockModal.classList.add('hidden');
        tutorialMockModal.classList.remove('grid', 'place-items-center');
        clearTutorialHighlight();
    };

    const showTutorialMockModal = (type) => {
        if (!tutorialMockModalContent) return;
        if (type === 'reserve_table') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Table Details</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-2">Table T3</h3>
                <p class="text-sm text-gray-500 mb-4">4 Guests • Normal Area</p>
                <div class="grid grid-cols-3 gap-2 mb-4" id="tutorialMockReserveActions">
                    <button type="button" class="bg-green-50 text-green-700 border border-green-200 py-2 rounded-xl text-xs font-bold">Available</button>
                    <button type="button" id="tutorialMockReserveReservedBtn" class="bg-brand-light text-brand-dark border border-brand py-2 rounded-xl text-xs font-bold">Reserved</button>
                    <button type="button" class="bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded-xl text-xs font-bold">Cleaning</button>
                </div>
                <p class="text-xs text-gray-500">Tutorial sample only.</p>
            `;
        } else if (type === 'add_new_item') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Add New Dish</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Add Item Modal</h3>
                <div class="space-y-2 mb-4">
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                </div>
                <button type="button" id="tutorialMockAddItemSubmit" class="w-full bg-brand-black text-brand py-2.5 rounded-xl font-bold text-sm">Add Item</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'table_select') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Table</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Table Selection Modal</h3>
                <div class="grid grid-cols-3 gap-2 mb-4">
                    <button type="button" class="h-10 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold">T1</button>
                    <button type="button" class="h-10 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold">T2</button>
                    <button type="button" class="h-10 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold">T3</button>
                    <button type="button" class="h-10 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-xs font-bold">T4</button>
                    <button type="button" class="h-10 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold">T5</button>
                    <button type="button" class="h-10 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-xs font-bold">T6</button>
                </div>
                <div class="flex gap-2">
                    <button type="button" class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold">Cancel</button>
                    <button type="button" class="flex-1 bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Done</button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'bill_review') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bill Review</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Checkout Modal</h3>
                <div class="space-y-2 mb-3 text-sm">
                    <div class="flex justify-between"><span>Spanish Latte x1</span><span>₱120</span></div>
                    <div class="flex justify-between"><span>Cheesecake x1</span><span>₱140</span></div>
                    <div class="border-t border-gray-200 pt-2 flex justify-between font-bold"><span>Total</span><span>₱260</span></div>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <button type="button" class="h-9 rounded-lg border border-brand bg-brand-light text-brand-black text-xs font-bold">Cash</button>
                    <button type="button" class="h-9 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold">GCash</button>
                </div>
                <div class="h-9 rounded-lg border border-gray-200 bg-gray-50 mb-3"></div>
                <button type="button" class="w-full bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Complete Order</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'apply_discount') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discount</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Discount Modal</h3>
                <div class="grid grid-cols-3 gap-2 mb-3" id="tutorialMockDiscountType">
                    <button type="button" class="h-9 rounded-lg border border-brand bg-brand-light text-brand-black text-xs font-bold">Senior</button>
                    <button type="button" class="h-9 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold">PWD</button>
                    <button type="button" class="h-9 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold">Custom</button>
                </div>
                <div class="space-y-1.5 text-sm mb-3">
                    <div class="flex justify-between"><span>Subtotal</span><span>₱260</span></div>
                    <div class="flex justify-between text-green-700"><span>Discount</span><span>-₱52</span></div>
                    <div id="tutorialMockDiscountTotal" class="flex justify-between font-bold border-t border-gray-200 pt-2"><span>Total</span><span>₱208</span></div>
                </div>
                <button type="button" class="w-full bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Apply Discount</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'add_table') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Add Table</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Add Table Modal</h3>
                <div id="tutorialMockAddTableFields" class="space-y-2 mb-3">
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                </div>
                <button type="button" id="tutorialMockAddTableSubmit" class="w-full bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Add Table</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'amount_received') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Received</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Payment Section</h3>
                <div class="space-y-2 mb-3 text-sm">
                    <div class="flex justify-between"><span>Total</span><span>₱260</span></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div id="tutorialMockAmountReceivedChange" class="flex justify-between font-bold border-t border-gray-200 pt-2"><span>Change</span><span>₱40</span></div>
                </div>
                <button type="button" class="w-full bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Complete Order</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'recommended_items_location') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recommended Items</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Recommended Area</h3>
                <div id="tutorialMockRecommendedCard" class="rounded-xl border border-gray-200 p-3 bg-[#F8F7F3]">
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recommended for Upsell</p>
                    <div class="space-y-1.5 text-sm">
                        <div class="flex justify-between"><span>Spanish Latte</span><span class="font-bold">₱120</span></div>
                        <div class="flex justify-between"><span>Iced Latte</span><span class="font-bold">₱110</span></div>
                        <div class="flex justify-between"><span>Blueberry Cheesecake</span><span class="font-bold">₱140</span></div>
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'ticket_parts') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ticket Parts</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Ticket Breakdown</h3>
                <div class="rounded-xl border border-gray-200 bg-[#F8F7F3] p-3 mb-2">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Order #A-1023</p>
                    <p class="font-bold text-brand-black">Guest Name</p>
                    <p class="text-xs text-gray-500">Table 3 • Dine In • 10:25 AM</p>
                </div>
                <div id="tutorialMockTicketItems" class="rounded-xl border border-gray-200 bg-white p-3 mb-2 text-sm">
                    <div class="flex justify-between"><span>Spanish Latte x1</span><span>₱120</span></div>
                    <div class="flex justify-between"><span>Cheesecake x1</span><span>₱140</span></div>
                </div>
                <div id="tutorialMockTicketTotals" class="rounded-xl border border-gray-200 bg-white p-3 mb-2 text-sm">
                    <div class="flex justify-between"><span>Subtotal</span><span>₱260</span></div>
                    <div class="flex justify-between"><span>Tax</span><span>₱31.20</span></div>
                    <div class="flex justify-between font-bold border-t border-gray-200 pt-1.5 mt-1.5"><span>Total</span><span>₱291.20</span></div>
                </div>
                <div id="tutorialMockTicketActions" class="grid grid-cols-2 gap-2">
                    <button type="button" class="h-9 rounded-lg border border-gray-200 bg-white text-xs font-bold">Print</button>
                    <button type="button" class="h-9 rounded-lg bg-brand-black text-brand text-xs font-bold">Complete</button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else if (type === 'order_panel_controls') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Order Panel Controls</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Order Panel</h3>
                <div class="rounded-xl border border-gray-200 bg-white p-3 mb-2">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-sm font-bold text-brand-black">Current Order</p>
                        <button type="button" class="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">Clear All</button>
                    </div>
                    <div id="tutorialMockOrderPanelQty" class="rounded-lg border border-gray-200 p-2.5 text-sm mb-2">
                        <div class="flex justify-between items-center">
                            <span>Spanish Latte</span>
                            <div class="flex items-center gap-1.5">
                                <button type="button" class="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold">-</button>
                                <span class="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded border">1</span>
                                <button type="button" class="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold">+</button>
                            </div>
                        </div>
                    </div>
                    <div id="tutorialMockOrderPanelDelete" class="flex items-center justify-between rounded-lg border border-gray-200 p-2.5 text-sm">
                        <span>Cheesecake</span>
                        <button type="button" class="text-gray-500 hover:text-red-600"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <p class="text-xs text-gray-500">Tutorial sample only.</p>
            `;
        } else if (type === 'add_new_user') {
            tutorialMockModalContent.innerHTML = `
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Add User</p>
                <h3 class="text-xl font-serif font-bold text-brand-black mb-3">Sample Add User Form</h3>
                <div id="tutorialMockAddUserFields" class="space-y-2 mb-3">
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                    <div class="h-9 rounded-lg border border-gray-200 bg-gray-50"></div>
                </div>
                <div id="tutorialMockAddUserRole" class="grid grid-cols-2 gap-2 mb-3">
                    <button type="button" class="h-9 rounded-lg border border-brand bg-brand-light text-brand-black text-xs font-bold">Admin</button>
                    <button type="button" class="h-9 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-xs font-bold">Cashier</button>
                </div>
                <button type="button" id="tutorialMockAddUserSubmit" class="w-full bg-brand-black text-brand py-2 rounded-lg text-xs font-bold">Add User</button>
                <p class="text-xs text-gray-500 mt-2">Tutorial sample only.</p>
            `;
        } else {
            tutorialMockModalContent.innerHTML = '';
        }
        tutorialMockModal.classList.remove('hidden');
        tutorialMockModal.classList.add('grid', 'place-items-center');
    };

    const isVisibleForTutorial = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    };

    const showTutorialStep = () => {
        const sessionIdAtStart = tutorialSessionId;
        if (!tutorialActive) return;
        clearTutorialHighlight();
        const steps = tutorialFlows.active || tutorialFlows.default;
        const step = steps[tutorialStep];
        if (!step) {
            stopTutorial();
            return;
        }
        tutorialMockModal.classList.add('hidden');
        tutorialMockModal.classList.remove('grid', 'place-items-center');
        if (step.mockModal) {
            showTutorialMockModal(step.mockModal);
        }

        if (step.target !== '#staffChatbotToggle' && panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            updatePanelPosition();
        }

        let target = document.querySelector(step.target);
        if (!target || !isVisibleForTutorial(target)) {
            if (tutorialStepRetries < 12) {
                tutorialStepRetries += 1;
                setTimeout(() => {
                    if (sessionIdAtStart !== tutorialSessionId) return;
                    showTutorialStep();
                }, 120);
                return;
            }
            tutorialStepRetries = 0;
            tutorialStep += 1;
            showTutorialStep();
            return;
        }
        tutorialStepRetries = 0;

        currentTutorialHighlight = target;
        target.setAttribute('data-tutorial-highlight', 'true');
        target.classList.add('relative', 'z-[10002]', 'ring-4', 'ring-brand', 'rounded-xl', 'staff-chatbot-tutorial-focus');

        const rect = target.getBoundingClientRect();
        tutorialTitle.textContent = `Step ${tutorialStep + 1}: ${step.title}`;
        tutorialText.textContent = step.text;
        tutorialNext.textContent = tutorialStep === steps.length - 1 ? 'Finish' : 'Next';

        const margin = 12;
        tutorialCard.style.maxHeight = `${Math.max(180, window.innerHeight - (margin * 2))}px`;
        tutorialCard.style.overflowY = 'auto';

        tutorialOverlay.classList.remove('hidden');
        tutorialCard.classList.remove('hidden');
        tutorialCard.classList.remove('staff-chatbot-tutorial-card-enter', 'staff-chatbot-tutorial-card-exit');
        tutorialCard.classList.add('staff-chatbot-tutorial-card-active');

        // Measure after showing; hidden elements report incorrect dimensions.
        const cardRect = tutorialCard.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const placeAbove = spaceBelow < cardRect.height + margin && rect.top > cardRect.height + margin;
        const desiredTop = placeAbove ? (rect.top - cardRect.height - 10) : (rect.bottom + 10);
        const top = Math.max(margin, Math.min(desiredTop, window.innerHeight - cardRect.height - margin));

        // Prefer aligning to target, but flip toward the right edge when needed.
        let desiredLeft = rect.left;
        if (desiredLeft + cardRect.width > window.innerWidth - margin) {
            desiredLeft = rect.right - cardRect.width;
        }
        const left = Math.max(margin, Math.min(desiredLeft, window.innerWidth - cardRect.width - margin));

        tutorialCard.style.top = `${top}px`;
        tutorialCard.style.left = `${left}px`;

    };

    const sanitizeTutorialSteps = (steps) => {
        if (!Array.isArray(steps)) return [];
        const seen = new Set();
        const clean = [];
        for (const step of steps) {
            if (!step || !step.target || !step.title) continue;
            const key = `${step.target}||${step.title}||${step.text || ''}||${step.mockModal || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            clean.push(step);
        }
        return clean;
    };

    const startTutorial = (topic = null) => {
        stopTutorial();
        tutorialSessionId += 1;
        tutorialActive = true;
        tutorialAnimating = false;
        tutorialStep = 0;
        tutorialStepRetries = 0;
        const rawSteps = (topic && tutorialFlows.byTopic[topic]) ? tutorialFlows.byTopic[topic] : tutorialFlows.default;
        tutorialFlows.active = sanitizeTutorialSteps(rawSteps);
        if (!tutorialFlows.active.length) {
            tutorialFlows.active = sanitizeTutorialSteps(tutorialFlows.default);
        }
        showTutorialStep();
    };

    tutorialNext.addEventListener('click', () => {
        if (!tutorialActive || tutorialAnimating) return;
        tutorialAnimating = true;
        const sessionIdAtClick = tutorialSessionId;

        tutorialCard.classList.remove('staff-chatbot-tutorial-card-enter', 'staff-chatbot-tutorial-card-active');
        tutorialCard.classList.add('staff-chatbot-tutorial-card-exit');

        setTimeout(() => {
            if (sessionIdAtClick !== tutorialSessionId || !tutorialActive) return;
            tutorialStep += 1;
            showTutorialStep();
            tutorialCard.classList.remove('staff-chatbot-tutorial-card-active', 'staff-chatbot-tutorial-card-exit');
            tutorialCard.classList.add('staff-chatbot-tutorial-card-enter');

            requestAnimationFrame(() => {
                tutorialCard.classList.remove('staff-chatbot-tutorial-card-enter');
                tutorialCard.classList.add('staff-chatbot-tutorial-card-active');
                setTimeout(() => {
                    tutorialAnimating = false;
                }, 190);
            });
        }, 140);
    });

    tutorialSkip.addEventListener('click', stopTutorial);
    tutorialOverlay.addEventListener('click', stopTutorial);
    window.addEventListener('resize', () => {
        if (tutorialActive) showTutorialStep();
    });

    tutorialButton?.addEventListener('click', () => startTutorial());
    const tutorialParam = new URLSearchParams(window.location.search).get('chatbot_tutorial');
    if (tutorialParam && tutorialFlows.byTopic[tutorialParam]) {
        openPanel();
        askBot(tutorialParam);
        startTutorial(tutorialParam);
        const url = new URL(window.location.href);
        url.searchParams.delete('chatbot_tutorial');
        window.history.replaceState({}, '', url.toString());
    }
    bindSuggestionButtons(document);
})();
</script>










