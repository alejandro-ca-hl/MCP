'use client';

import { useState } from 'react';
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { PostgresConnectionModal } from "@/components/PostgresConnectionModal";
import { Chatbot } from "@/components/Chatbot";

import { ZwcadConnectionModal } from "@/components/ZwcadConnectionModal";

interface DbDetails {
  host: string;
  port: number;
  database: string;
}

export default function Home() {
  const [isPostgresModalOpen, setIsPostgresModalOpen] = useState(false);
  /* ZWCAD States */
  const [isZwcadModalOpen, setIsZwcadModalOpen] = useState(false);
  const [isZwcadConnected, setIsZwcadConnected] = useState(false);
  const [zwcadFile, setZwcadFile] = useState<string | null>(null);

  /* Postgres States */
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbDetails, setDbDetails] = useState<DbDetails | null>(null);

  /* Shared Handlers (Postgres) */
  const handleConnectionSuccess = (details: DbDetails) => {
    setIsDbConnected(true);
    setDbDetails(details);
  };

  const handleDisconnect = () => {
    setIsDbConnected(false);
    setDbDetails(null);
  };

  /* ZWCAD Handlers */
  const handleZwcadConnectionSuccess = (filename: string) => {
    setIsZwcadConnected(true);
    setZwcadFile(filename);
  };

  const handleZwcadDisconnect = () => {
    setIsZwcadConnected(false);
    setZwcadFile(null);
  };

  const handleCardClick = (title: string) => {
    if (title === "POSTGRES") {
      setIsPostgresModalOpen(true);
    } else if (title === "ZWCAD") {
      setIsZwcadModalOpen(true);
    }
  };

  const cards: { title: string; icon: string; isBrand?: boolean; isActive?: boolean; isConnected?: boolean; onDisconnect?: () => void }[] = [
    { title: "GOOGLE", icon: "google", isBrand: true },
    { title: "SLACK", icon: "slack", isBrand: true },
    { title: "NOTION", icon: "notion", isBrand: true },
    { title: "GITHUB", icon: "github", isBrand: true },
    {
      title: "POSTGRES",
      icon: "postgresql",
      isBrand: true,
      isActive: isDbConnected,
      isConnected: isDbConnected,
      onDisconnect: handleDisconnect
    },
    {
      title: "ZWCAD",
      icon: "zwcad",
      isBrand: true,
      isActive: isZwcadConnected,
      isConnected: isZwcadConnected,
      onDisconnect: handleZwcadDisconnect
    },
    { title: "VERTEX", icon: "polyline" },
    { title: "CORE 01", icon: "database" },
    { title: "SENTINEL", icon: "shield_lock" },
    { title: "FLUX", icon: "waves" },
    { title: "QUANTUM", icon: "cyclone" },
    { title: "ATLAS", icon: "public" },
    { title: "TITAN", icon: "memory" },
    { title: "ORACLE", icon: "visibility" },
    { title: "CYPHER", icon: "terminal" },
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-12">
        <div className="matrix-grid">
          {cards.map((card, index) => (
            <Card
              key={index}
              title={card.title}
              icon={card.icon}
              isBrand={card.isBrand}
              isActive={card.isActive}
              isConnected={card.isConnected}
              onClick={() => handleCardClick(card.title)}
              onDisconnect={card.onDisconnect}
            />
          ))}
        </div>
      </main>
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-[var(--deep-violet)]/10 to-transparent"></div>
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(#E0E0E0 1px, transparent 1px), linear-gradient(90deg, #E0E0E0 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        ></div>
      </div>

      {/* PostgreSQL Connection Modal */}
      <PostgresConnectionModal
        isOpen={isPostgresModalOpen}
        onClose={() => setIsPostgresModalOpen(false)}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {/* ZWCAD Connection Modal */}
      <ZwcadConnectionModal
        isOpen={isZwcadModalOpen}
        onClose={() => setIsZwcadModalOpen(false)}
        onConnectionSuccess={handleZwcadConnectionSuccess}
      />

      {/* Chatbot */}
      <Chatbot
        isDbConnected={isDbConnected}
        isZwcadConnected={isZwcadConnected}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
