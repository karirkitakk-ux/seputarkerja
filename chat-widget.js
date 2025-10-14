class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.apiKey = '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';
        this.model = 'deepseek/deepseek-r1-0528-qwen3-8b:free';
        this.chatHistory = this.loadChatHistory();
        this.init();
    }

    init() {
        this.createWidget();
        this.bindEvents();
        this.renderChatHistory();
    }

    createWidget() {
        const widgetHTML = `
            <div class="chat-widget">
                <button class="chat-button">🤖</button>
                <div class="chat-container">
                    <div class="chat-header">
                        <h3>AI Career Assistant</h3>
                        <button class="close-chat">×</button>
                    </div>
                    <div class="chat-messages">
                        ${this.getWelcomeMessage()}
                    </div>
                    <div class="typing-indicator">
                        <span>AI sedang mengetik</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div class="chat-input-container">
                        <textarea class="chat-input" placeholder="Ketik pertanyaan Anda..." rows="1"></textarea>
                        <button class="send-button">➤</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        this.elements = {
            widget: document.querySelector('.chat-widget'),
            button: document.querySelector('.chat-button'),
            container: document.querySelector('.chat-container'),
            closeBtn: document.querySelector('.close-chat'),
            messages: document.querySelector('.chat-messages'),
            input: document.querySelector('.chat-input'),
            sendBtn: document.querySelector('.send-button'),
            typingIndicator: document.querySelector('.typing-indicator')
        };
    }

    getWelcomeMessage() {
        if (this.chatHistory.length > 0) {
            return this.chatHistory.map(msg => 
                `<div class="message ${msg.sender}">${this.escapeHtml(msg.text)}</div>`
            ).join('');
        } else {
            return `
                <div class="message bot">
                    Halo! Saya AI Career Assistant KarirKita! 👋<br><br>
                    Saya siap membantu Anda dengan:<br>
                    • Tips CV ATS-friendly<br>
                    • Persiapan interview<br>
                    • Nasihat karir<br>
                    • Pertanyaan seputar pekerjaan<br><br>
                    Ada yang bisa saya bantu?
                </div>
            `;
        }
    }

    // Simpan chat history ke localStorage
    saveChatHistory() {
        try {
            localStorage.setItem('karirkita_chat_history', JSON.stringify(this.chatHistory));
        } catch (e) {
            console.warn('Tidak bisa menyimpan chat history:', e);
        }
    }

    // Load chat history dari localStorage
    loadChatHistory() {
        try {
            const saved = localStorage.getItem('karirkita_chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Tidak bisa load chat history:', e);
            return [];
        }
    }

    // Render chat history
    renderChatHistory() {
        if (this.chatHistory.length > 0) {
            this.elements.messages.innerHTML = this.chatHistory.map(msg => 
                `<div class="message ${msg.sender}">${this.escapeHtml(msg.text)}</div>`
            ).join('');
            this.scrollToBottom();
        }
    }

    // Escape HTML untuk keamanan
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    bindEvents() {
        this.elements.button.addEventListener('click', () => this.toggleChat());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.input.addEventListener('input', () => {
            this.elements.input.style.height = 'auto';
            this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
        });

        // Simpan chat history ketika user meninggalkan halaman
        window.addEventListener('beforeunload', () => this.saveChatHistory());
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.elements.container.classList.toggle('active', this.isOpen);
        
        if (this.isOpen) {
            this.elements.input.focus();
        }
    }

    closeChat() {
        this.isOpen = false;
        this.elements.container.classList.remove('active');
        this.saveChatHistory();
    }

    async sendMessage() {
        const message = this.elements.input.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        this.chatHistory.push({ text: message, sender: 'user' });
        
        this.elements.input.value = '';
        this.elements.input.style.height = 'auto';
        
        // Show typing indicator
        this.showTyping();
        this.elements.sendBtn.disabled = true;

        try {
            const response = await this.getAIResponse(message);
            this.addMessage(response, 'bot');
            this.chatHistory.push({ text: response, sender: 'bot' });
            this.saveChatHistory();
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = 'Maaf, terjadi kesalahan. Silakan coba lagi.';
            this.addMessage(errorMsg, 'bot');
            this.chatHistory.push({ text: errorMsg, sender: 'bot' });
            this.saveChatHistory();
        } finally {
            this.hideTyping();
            this.elements.sendBtn.disabled = false;
        }
    }

    async getAIResponse(userMessage) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'KarirKita Career Assistant'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: `Anda adalah asisten karir yang membantu pengguna dengan pertanyaan seputar:
                        - Pembuatan CV yang ramah ATS
                        - Persiapan wawancara kerja
                        - Tips karir dan pengembangan profesional
                        - Pekerjaan unik dan peluang karir
                        - Informasi tentang berbagai profesi
                        Berikan jawaban yang informatif, praktis, dan mudah dipahami. Gunakan bahasa Indonesia yang baik dan ramah.`
                    },
                    ...this.chatHistory.slice(-10).map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    })),
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTyping() {
        this.elements.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTyping() {
        this.elements.typingIndicator.classList.remove('active');
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }
}

// Initialize chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatWidget();
});

// Clear chat history function (optional, bisa dipanggil dari console)
function clearChatHistory() {
    localStorage.removeItem('karirkita_chat_history');
    location.reload();

}
