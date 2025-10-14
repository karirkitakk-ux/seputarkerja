class ChatWidget {
    constructor() {
        this.isOpen = false;
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
    const API_KEY = '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';
    
    console.log('🔍 DEBUG: Starting API request...');
    console.log('🔍 DEBUG: User message:', userMessage);
    console.log('🔍 DEBUG: Message length:', userMessage.length);
    
    try {
        const fetchData = fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "KarirKita Career Assistant",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "deepseek/deepseek-r1-distill-llama-70b:free",
                "messages": [
                    {
                        "role": "user",
                        "content": userMessage
                    }
                ],
                "max_tokens": 600, // Ganti dari 10 ke 300
                "temperature": 0.7
            })
        });

        console.log('🔍 DEBUG: Fetch request sent, waiting for response...');

        const response = await fetchData;
        
        console.log('🔍 DEBUG: Response status:', response.status);
        console.log('🔍 DEBUG: Response ok:', response.ok);
        console.log('🔍 DEBUG: Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ DEBUG: API Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ DEBUG: API Success response:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ DEBUG: Invalid response format:', data);
            throw new Error('Invalid response format from API');
        }
        
        const aiResponse = data.choices[0].message.content;
        console.log('✅ DEBUG: AI Response:', aiResponse);
        console.log('✅ DEBUG: Response length:', aiResponse.length);
        
        return aiResponse;
        
    } catch (error) {
        console.error('💥 DEBUG: Catch block error:', error);
        throw error;
    }
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

// Clear chat history function
function clearChatHistory() {
    localStorage.removeItem('karirkita_chat_history');
    location.reload();
}
