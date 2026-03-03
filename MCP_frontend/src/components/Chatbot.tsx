import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

interface ChatbotConfig {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
    temperature: number;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatbotProps {
    isDbConnected: boolean;
    isZwcadConnected?: boolean;
    onDisconnect: () => void;
}

const MODEL_OPTIONS: Record<string, { label: string; value: string }[]> = {
    openai: [
        { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
        { label: 'gpt-4o', value: 'gpt-4o' },
    ],
    anthropic: [
        { label: 'claude-sonnet-4-20250514', value: 'claude-sonnet-4-20250514' },
        { label: 'claude-3-5-haiku-20241022', value: 'claude-3-5-haiku-20241022' },
    ],
};

export const Chatbot: React.FC<ChatbotProps> = ({ isDbConnected, isZwcadConnected = false, onDisconnect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [config, setConfig] = useState<ChatbotConfig>({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '',
        temperature: 0.7,
    });
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);
    const toggleConfig = () => setIsConfigOpen(!isConfigOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (!config.apiKey) {
            const errorMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: '⚠️ Por favor configura tu API Key en el panel de configuración (ícono ⚙️).',
            };
            setMessages(prev => [...prev, errorMsg]);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    provider: config.provider,
                    model: config.model,
                    api_key: config.apiKey,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(errData.detail || `Error ${res.status}`);
            }

            const data = await res.json();

            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content || 'Sin respuesta del modelo.',
            };
            setMessages(prev => [...prev, botResponse]);
        } catch (err) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Error: ${err instanceof Error ? err.message : 'No se pudo obtener respuesta.'}`,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await fetch(`${API_BASE}/disconnect`, { method: 'DELETE' });
            // Also disconnect ZWCAD if connected
            if (isZwcadConnected) {
                await fetch(`${API_BASE}/disconnect-zwcad`, { method: 'DELETE' });
            }
        } catch {
            // Even if the call fails, we disconnect on frontend
        }
        setIsDisconnecting(false);
        onDisconnect();
    };

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'provider') {
            const newProvider = value as 'openai' | 'anthropic';
            const defaultModel = MODEL_OPTIONS[newProvider][0].value;
            setConfig(prev => ({
                ...prev,
                provider: newProvider,
                model: defaultModel,
            }));
        } else {
            setConfig(prev => ({
                ...prev,
                [name]: name === 'temperature' ? parseFloat(value) : value,
            }));
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Interface */}
            <div
                className={`
                    w-96 h-[600px] glass-card rounded-3xl flex flex-col
                    transition-all duration-300 ease-out origin-bottom-right
                    ${isOpen
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-10 pointer-events-none absolute bottom-0 right-0'
                    }
                `}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0A1128]/95 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--electric-cyan)] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm tracking-wide">Asistente AI</h3>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <span className={`text-[10px] flex items-center gap-1.5 ${isDbConnected ? 'text-emerald-400' : 'text-white/40'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                                    {isDbConnected ? 'BD CONECTADA' : 'BD DESCONECTADA'}
                                </span>
                                {isZwcadConnected && (
                                    <span className="text-[10px] flex items-center gap-1.5 text-[var(--electric-cyan)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--electric-cyan)] animate-pulse"></span>
                                        ZWCAD CONECTADO
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleConfig} className="text-white/70 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                        <button onClick={toggleChat} className="text-white/70 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* Config Overlay */}
                    <div className={`absolute inset-0 bg-[#0A1128] z-20 p-6 flex flex-col gap-4 transition-transform duration-300 ${isConfigOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-bold text-lg">Configuración</h4>
                            <button onClick={toggleConfig} className="text-white/50 hover:text-white">
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>

                        {/* Provider */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--silver-mist)] mb-1">PROVEEDOR</label>
                            <select
                                name="provider"
                                value={config.provider}
                                onChange={handleConfigChange}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--electric-cyan)]"
                            >
                                <option value="openai" className="bg-slate-800">OpenAI</option>
                                <option value="anthropic" className="bg-slate-800">Anthropic</option>
                            </select>
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--silver-mist)] mb-1">MODELO</label>
                            <select
                                name="model"
                                value={config.model}
                                onChange={handleConfigChange}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--electric-cyan)]"
                            >
                                {MODEL_OPTIONS[config.provider].map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-800">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--silver-mist)] mb-1">API KEY</label>
                            <input
                                type="password"
                                name="apiKey"
                                value={config.apiKey}
                                onChange={handleConfigChange}
                                placeholder={config.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--electric-cyan)]"
                            />
                        </div>

                        {/* Temperature */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--silver-mist)] mb-1">
                                TEMPERATURA: {config.temperature}
                            </label>
                            <input
                                type="range"
                                name="temperature"
                                min="0"
                                max="2"
                                step="0.1"
                                value={config.temperature}
                                onChange={handleConfigChange}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--electric-cyan)]"
                            />
                        </div>

                        <div className="mt-auto">
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">logout</span>
                                {isDisconnecting ? 'Desconectando...' : 'Desconectar Todo'}
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                                <span className="material-symbols-outlined text-4xl">smart_toy</span>
                                <p className="text-sm">Inicia una conversación...</p>
                                {!isDbConnected && !isZwcadConnected && (
                                    <p className="text-xs text-white/20 text-center mt-2 px-8">
                                        Conecta una BD o ZWCAD para potenciar al asistente.
                                    </p>
                                )}
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-[var(--electric-cyan)] text-white'
                                            : 'bg-white/10 text-white'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl px-4 py-3 flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2 shrink-0">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm focus:outline-none focus:border-[var(--electric-cyan)] transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-[var(--electric-cyan)] text-white rounded-full hover:bg-[var(--electric-cyan)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={toggleChat}
                className={`
                    mt-4 p-4 rounded-full bg-[var(--electric-cyan)] text-white shadow-lg shadow-[var(--electric-cyan)]/30
                    hover:scale-110 transition-all duration-300
                    ${isOpen ? 'translate-y-20 opacity-0 pointer-events-none absolute' : 'translate-y-0 opacity-100 relative'}
                `}
            >
                <span className="material-symbols-outlined text-3xl">chat</span>
            </button>
        </div>
    );
};
