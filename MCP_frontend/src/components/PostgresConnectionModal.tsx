import React, { useState } from 'react';
import { API_BASE } from '@/lib/api';

interface PostgresConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnectionSuccess: (details: { host: string; port: number; database: string }) => void;
}

type ModalState = 'idle' | 'loading' | 'success' | 'error';

export const PostgresConnectionModal: React.FC<PostgresConnectionModalProps> = ({
    isOpen,
    onClose,
    onConnectionSuccess,
}) => {
    const [formData, setFormData] = useState({
        db_host: '',
        db_port: '5432',
        db_username: '',
        db_password: '',
        db_database: '',
    });
    const [modalState, setModalState] = useState<ModalState>('idle');
    const [resultMessage, setResultMessage] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            db_host: '',
            db_port: '5432',
            db_username: '',
            db_password: '',
            db_database: '',
        });
        setModalState('idle');
        setResultMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalState('loading');

        const payload = {
            db_host: formData.db_host.trim(),
            db_port: parseInt(formData.db_port.trim(), 10),
            db_username: formData.db_username.trim(),
            db_password: formData.db_password,
            db_database: formData.db_database.trim(),
        };

        try {
            const res = await fetch(`${API_BASE}/validate-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                setModalState('success');
                setResultMessage(data.message);
                onConnectionSuccess({
                    host: formData.db_host,
                    port: parseInt(formData.db_port, 10),
                    database: formData.db_database,
                });
            } else {
                setModalState('error');
                setResultMessage(data.message || 'Error de conexión desconocido.');
            }
        } catch (err) {
            setModalState('error');
            setResultMessage(
                err instanceof Error ? err.message : 'No se pudo conectar al servidor backend.'
            );
        }
    };

    const handleCancel = () => {
        resetForm();
        onClose();
    };

    const handleCloseSuccess = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={modalState === 'loading' ? undefined : handleCancel}
            ></div>

            {/* Modal */}
            <div className="relative glass-card rounded-3xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Conexión PostgreSQL
                </h2>

                {/* ─── LOADING STATE ─── */}
                {modalState === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-10 h-10 border-4 border-white/20 border-t-[var(--electric-cyan)] rounded-full animate-spin"></div>
                        <p className="text-white/60 text-sm">Verificando conexión...</p>
                    </div>
                )}

                {/* ─── SUCCESS STATE ─── */}
                {modalState === 'success' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-400 text-4xl">
                                check_circle
                            </span>
                        </div>
                        <p className="text-emerald-400 text-sm text-center font-semibold">
                            {resultMessage}
                        </p>
                        <p className="text-white/40 text-xs text-center">
                            {formData.db_host}:{formData.db_port} / {formData.db_database}
                        </p>

                        <button
                            onClick={handleCloseSuccess}
                            className="mt-4 w-full px-6 py-3 bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] rounded-xl text-white font-semibold hover:bg-[var(--electric-cyan)]/80 transition-all duration-300 shadow-lg shadow-[var(--electric-cyan)]/30"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                {/* ─── ERROR STATE ─── */}
                {modalState === 'error' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-400 text-4xl">
                                error
                            </span>
                        </div>
                        <p className="text-red-400 text-sm text-center font-semibold">
                            {resultMessage}
                        </p>
                        <div className="flex gap-4 mt-2 w-full">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => setModalState('idle')}
                                className="flex-1 px-6 py-3 bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] rounded-xl text-white font-semibold hover:bg-[var(--electric-cyan)]/80 transition-all duration-300 shadow-lg shadow-[var(--electric-cyan)]/30"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── IDLE (FORM) STATE ─── */}
                {modalState === 'idle' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* URL Field */}
                        <div>
                            <label htmlFor="db_host" className="block text-sm font-semibold text-[var(--silver-mist)] mb-2">
                                URL
                            </label>
                            <input
                                type="text"
                                id="db_host"
                                name="db_host"
                                value={formData.db_host}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                placeholder="localhost o IP del servidor"
                            />
                        </div>

                        {/* Port Field */}
                        <div>
                            <label htmlFor="db_port" className="block text-sm font-semibold text-[var(--silver-mist)] mb-2">
                                Puerto
                            </label>
                            <input
                                type="text"
                                id="db_port"
                                name="db_port"
                                value={formData.db_port}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                placeholder="5432"
                            />
                        </div>

                        {/* Username Field */}
                        <div>
                            <label htmlFor="db_username" className="block text-sm font-semibold text-[var(--silver-mist)] mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                id="db_username"
                                name="db_username"
                                value={formData.db_username}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                placeholder="postgres"
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="db_password" className="block text-sm font-semibold text-[var(--silver-mist)] mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="db_password"
                                name="db_password"
                                value={formData.db_password}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Database Field */}
                        <div>
                            <label htmlFor="db_database" className="block text-sm font-semibold text-[var(--silver-mist)] mb-2">
                                Database
                            </label>
                            <input
                                type="text"
                                id="db_database"
                                name="db_database"
                                value={formData.db_database}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                placeholder="mi_base_de_datos"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-6">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] rounded-xl text-white font-semibold hover:bg-[var(--electric-cyan)]/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-[var(--electric-cyan)]/30"
                            >
                                Solicitar Conexión
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
