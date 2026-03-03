import React from 'react';
import { BrandIcon } from './BrandIcon';
import { API_BASE } from '@/lib/api';

interface CardProps {
    title: string;
    icon: string;
    isBrand?: boolean;
    isActive?: boolean;
    isConnected?: boolean;
    onClick?: () => void;
    onDisconnect?: () => void;
}

export const Card: React.FC<CardProps> = ({
    title,
    icon,
    isBrand = false,
    isActive = false,
    isConnected = false,
    onClick,
    onDisconnect,
}) => {
    const [isDisconnecting, setIsDisconnecting] = React.useState(false);

    const handleDisconnect = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDisconnecting(true);
        try {
            await fetch(`${API_BASE}/disconnect`, { method: 'DELETE' });
        } catch {
            // Disconnect on frontend regardless
        }
        setIsDisconnecting(false);
        onDisconnect?.();
    };

    return (
        <div
            onClick={isConnected ? undefined : onClick}
            className={`glass-card glass-card-interactive square-aspect rounded-2xl flex flex-col items-center justify-center p-8 gap-3 group
                ${!isConnected && onClick ? 'cursor-pointer' : ''}
                ${isActive || isConnected ? 'border-[var(--electric-cyan)]/30' : ''}
            `}
        >
            <div
                className={`halo transition-opacity ${isActive || isConnected ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}
            ></div>

            {/* Icon — smaller when connected */}
            {isBrand ? (
                <BrandIcon
                    name={icon}
                    className={`transition-all duration-500 card-icon ${isConnected ? 'w-7 h-7' : 'text-4xl'} ${isConnected ? 'text-[var(--electric-cyan)]' : ''}`}
                />
            ) : (
                <span
                    className={`material-symbols-outlined card-icon transition-all duration-500 text-4xl ${isActive ? 'text-[var(--electric-cyan)]' : 'text-[var(--silver-mist)]'}`}
                >
                    {icon}
                </span>
            )}

            {/* Title — hidden when connected */}
            {!isConnected && (
                <span
                    className={`text-[10px] font-bold tracking-[0.4em] transition-colors ${isActive
                        ? 'text-white'
                        : 'text-[var(--silver-mist)] group-hover:text-white'
                        }`}
                >
                    {title}
                </span>
            )}

            {/* Connected state extras */}
            {isConnected && (
                <>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-emerald-400 text-[10px] font-semibold tracking-wider">CONECTADO</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="mt-1 px-3 py-1.5 text-[9px] font-bold tracking-wider text-red-400 border border-red-400/30 rounded-lg
                            hover:bg-red-400/10 hover:border-red-400/60 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                    >
                        {isDisconnecting ? 'DESCONECTANDO...' : 'FINALIZAR CONEXIÓN'}
                    </button>
                </>
            )}
        </div>
    );
};
