import React from 'react';

export const Header = () => {
    return (
        <header className="w-full h-24 flex items-center justify-center relative z-50">
            <nav className="flex items-center gap-16">
                <a className="nav-link text-xs font-bold uppercase tracking-[0.3em] text-[var(--silver-mist)]/60 hover:text-[var(--silver-mist)]"
                    href="#">Biblioteca</a>
                <a className="nav-link active text-xs font-bold uppercase tracking-[0.3em] text-[var(--silver-mist)]"
                    href="#">Sandbox</a>
                <a className="nav-link text-xs font-bold uppercase tracking-[0.3em] text-[var(--silver-mist)]/60 hover:text-[var(--silver-mist)]"
                    href="#">Configuración</a>
            </nav>
            <div className="absolute right-12 flex items-center gap-6 opacity-40">
                <div className="text-[10px] tracking-[0.2em] font-medium text-[var(--silver-mist)]">SYSTEM ACTIVE</div>
                <div className="size-1 rounded-full bg-[var(--electric-cyan)] shadow-[0_0_8px_var(--electric-cyan)]"></div>
            </div>
        </header>
    );
};
