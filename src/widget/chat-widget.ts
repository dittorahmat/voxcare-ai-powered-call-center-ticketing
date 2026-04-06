/**
 * Chat Widget - Embeddable live chat widget for external websites.
 * Usage: <script src="https://voxcare.com/widget.js" data-account-id="xxx"></script>
 * 
 * This file is the SOURCE. Build separately with: vite build --config widget.vite.config.ts
 * Output: dist/widget.js (standalone, no React dependency)
 */

(function () {
  'use strict';

  const DEFAULTS = {
    position: 'bottom-right',
    color: '#6366f1',
    text: 'Chat with us',
    apiUrl: '',
    accountId: '',
  };

  function getOptions() {
    const script = document.currentScript as HTMLScriptElement | null;
    if (!script) return DEFAULTS;
    return {
      position: script.dataset.position || DEFAULTS.position,
      color: script.dataset.color || DEFAULTS.color,
      text: script.dataset.text || DEFAULTS.text,
      apiUrl: script.dataset.apiUrl || window.location.origin,
      accountId: script.dataset.accountId || '',
      customerName: script.dataset.customerName || null,
      customerEmail: script.dataset.customerEmail || null,
    };
  }

  function createWidget() {
    const options = getOptions();
    let isOpen = false;
    let chatSessionId: string | null = null;
    let messages: any[] = [];
    let sseConnection: EventSource | null = null;

    // Create Shadow DOM container
    const host = document.createElement('div');
    host.id = 'voxcare-chat-widget';
    host.style.cssText = `
      position: fixed;
      ${options.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Launcher button
    const launcher = document.createElement('button');
    launcher.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span style="margin-left:8px">${options.text}</span>
    `;
    launcher.style.cssText = `
      background: ${options.color};
      color: white;
      border: none;
      border-radius: 24px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s;
    `;
    launcher.onmouseenter = () => launcher.style.transform = 'scale(1.05)';
    launcher.onmouseleave = () => launcher.style.transform = 'scale(1)';
    launcher.onclick = () => toggleChat();

    // Chat panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      ${options.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      bottom: 0;
      width: 360px;
      max-height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `background: ${options.color}; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;`;
    header.innerHTML = `<strong style="font-size:16px">VoxCare Support</strong>
      <button onclick="this.closest('#voxcare-chat-widget').querySelector('[data-panel]').style.display='none'" style="background:none;border:none;color:white;cursor:pointer;font-size:18px">&times;</button>`;
    panel.appendChild(header);
    panel.setAttribute('data-panel', '');

    // Messages area
    const messagesArea = document.createElement('div');
    messagesArea.style.cssText = 'flex: 1; overflow-y: auto; padding: 12px; background: #f8fafc;';
    panel.appendChild(messagesArea);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a message...';
    input.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none;';
    input.onkeydown = (e) => { if (e.key === 'Enter') sendChatMessage(); };

    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = `background: ${options.color}; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer;`;
    sendBtn.onclick = sendChatMessage;

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);

    shadow.appendChild(launcher);
    shadow.appendChild(panel);

    function toggleChat() {
      isOpen = !isOpen;
      panel.style.display = isOpen ? 'flex' : 'none';
      launcher.style.display = isOpen ? 'none' : 'flex';

      if (isOpen && !chatSessionId) {
        createChatSession();
      }
    }

    async function createChatSession() {
      try {
        const res = await fetch(`${options.apiUrl}/api/chat-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: options.customerName || 'Website Visitor',
            customerEmail: options.customerEmail || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          chatSessionId = data.data.id;
          connectSSE();
        }
      } catch (err) {
        console.error('Failed to create chat session:', err);
      }
    }

    function connectSSE() {
      if (!chatSessionId) return;
      sseConnection = new EventSource(`${options.apiUrl}/api/chat-sessions/${chatSessionId}/stream`);
      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            addMessageToUI(data.data);
          }
        } catch { /* heartbeat */ }
      };
    }

    async function sendChatMessage() {
      const text = input.value.trim();
      if (!text || !chatSessionId) return;
      input.value = '';

      // Add local message
      const msg = { id: `local-${Date.now()}`, sender: 'customer', text, timestamp: new Date().toISOString() };
      addMessageToUI(msg);

      try {
        const res = await fetch(`${options.apiUrl}/api/chat-sessions/${chatSessionId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (data.success) {
          // AI response
          addMessageToUI({ id: `ai-${Date.now()}`, sender: 'ai', text: data.data.reply, timestamp: new Date().toISOString() });
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }

    function addMessageToUI(msg: any) {
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        margin-bottom: 8px;
        display: flex;
        ${msg.sender === 'customer' ? 'justify-content: flex-end;' : ''}
      `;
      bubble.innerHTML = `
        <div style="
          max-width: 75%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 13px;
          ${msg.sender === 'customer' ? `background: ${options.color}; color: white;` :
            msg.sender === 'ai' ? 'background: #fef3c7; color: #92400e;' :
            'background: white; color: #1e293b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);'}
        ">
          ${msg.text}
        </div>
      `;
      messagesArea.appendChild(bubble);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
