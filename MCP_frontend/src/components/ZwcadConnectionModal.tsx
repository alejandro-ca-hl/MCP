import React, { useState } from 'react';
import { API_BASE } from '@/lib/api';

interface ZwcadConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnectionSuccess?: (filename: string) => void;
}

type ModalState = 'prompt' | 'loading' | 'success' | 'error' | 'connecting';

export const ZwcadConnectionModal: React.FC<ZwcadConnectionModalProps> = ({
    isOpen,
    onClose,
    onConnectionSuccess,
}) => {
    const [modalState, setModalState] = useState<ModalState>('prompt');
    const [drawings, setDrawings] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const resetModal = () => {
        setModalState('prompt');
        setDrawings([]);
        setSelectedFile(null);
        setErrorMessage('');
    };

    const handleCheckZwcad = async () => {
        setModalState('loading');
        try {
            const res = await fetch(`${API_BASE}/connect-zwcad`, {
                method: 'POST',
            });
            const data = await res.json();

            if (data.success) {
                setDrawings(data.drawings || []);
                setModalState('success');
            } else {
                setErrorMessage(data.message || 'Error desconocido al conectar con ZWCAD.');
                setModalState('error');
            }
        } catch (err) {
            setErrorMessage('No se pudo conectar al servidor backend. Asegúrese de que el backend esté ejecutándose.');
            setModalState('error');
        }
    };

    const handleConnectToFile = async () => {
        if (!selectedFile) return;

        setModalState('connecting');
        try {
            const res = await fetch(`${API_BASE}/connect-zwcad-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: selectedFile }),
            });
            const data = await res.json();

            if (data.success) {
                if (onConnectionSuccess) onConnectionSuccess(selectedFile);
                resetModal();
                onClose();
            } else {
                setErrorMessage(data.message || 'Error al conectar con el archivo.');
                setModalState('error');
            }
        } catch (err) {
            setErrorMessage('Error de red al conectar con el archivo.');
            setModalState('error');
        }
    };

    const handleCancel = () => {
        resetModal();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={(modalState === 'loading' || modalState === 'connecting') ? undefined : handleCancel}
            ></div>

            <div className="relative glass-card rounded-3xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Conexión ZWCAD
                </h2>

                {modalState === 'prompt' && (
                    <div className="text-center space-y-6">
                        <p className="text-white/80">
                            ¿Desea conectarse a ZWCAD para acceder a los archivos abiertos?
                        </p>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCheckZwcad}
                                className="flex-1 px-6 py-3 bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] rounded-xl text-white font-semibold hover:bg-[var(--electric-cyan)]/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-[var(--electric-cyan)]/30"
                            >
                                Sí, buscar
                            </button>
                        </div>
                    </div>
                )}

                {(modalState === 'loading' || modalState === 'connecting') && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-10 h-10 border-4 border-white/20 border-t-[var(--electric-cyan)] rounded-full animate-spin"></div>
                        <p className="text-white/60 text-sm">
                            {modalState === 'connecting' ? 'Conectando al archivo...' : 'Verificando ZWCAD...'}
                        </p>
                    </div>
                )}

                {modalState === 'success' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                                <span className="material-symbols-outlined text-emerald-400 text-3xl">
                                    check_circle
                                </span>
                            </div>
                            <p className="text-emerald-400 font-semibold text-lg">ZWCAD Detectado</p>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 max-h-48 overflow-y-auto">
                            <h4 className="text-xs font-bold text-[var(--silver-mist)] uppercase tracking-wider mb-3 sticky top-0 bg-[#0A1128]/80 backdrop-blur-sm py-1">
                                Seleccione un archivo ({drawings.length})
                            </h4>
                            {drawings.length === 0 ? (
                                <p className="text-white/40 text-sm italic">No hay dibujos abiertos.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {drawings.map((dwg, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() => setSelectedFile(dwg)}
                                            className={`
                                                flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border
                                                ${selectedFile === dwg
                                                    ? 'bg-[var(--electric-cyan)]/20 border-[var(--electric-cyan)] text-white'
                                                    : 'bg-transparent border-transparent hover:bg-white/5 text-white/70'}
                                            `}
                                        >
                                            <span className={`material-symbols-outlined text-base ${selectedFile === dwg ? 'text-[var(--electric-cyan)]' : 'text-white/40'}`}>
                                                {selectedFile === dwg ? 'radio_button_checked' : 'radio_button_unchecked'}
                                            </span>
                                            <span className="truncate text-sm">{dwg}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConnectToFile}
                                disabled={!selectedFile}
                                className={`
                                    flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg
                                    ${!selectedFile
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                                        : 'bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] hover:bg-[var(--electric-cyan)]/80 shadow-[var(--electric-cyan)]/30'}
                                `}
                            >
                                Conectar
                            </button>
                        </div>
                    </div>
                )}

                {modalState === 'error' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-400 text-4xl">
                                error
                            </span>
                        </div>
                        <h3 className="text-white font-bold text-lg">No se pudo conectar</h3>
                        <p className="text-red-400 text-sm font-medium px-4">
                            {errorMessage}
                        </p>
                        {errorMessage.includes('backend') ? (
                            <p className="text-white/40 text-xs mt-2">
                                Verifique que el servidor (back-end) esté ejecutándose en el puerto 8000.
                            </p>
                        ) : (
                            <p className="text-white/60 text-xs mt-2">
                                Asegúrese de que ZWCAD esté abierto en su equipo.
                            </p>
                        )}


                        <div className="flex gap-4 mt-6 w-full">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold hover:bg-white/10 transition-all duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCheckZwcad}
                                className="flex-1 px-6 py-3 bg-[var(--electric-cyan)] border border-[var(--electric-cyan)] rounded-xl text-white font-semibold hover:bg-[var(--electric-cyan)]/80 transition-all duration-300 shadow-lg shadow-[var(--electric-cyan)]/30"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
