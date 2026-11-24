// app/guesswho/GameProvider.tsx
'use client';
import { createContext, useContext } from 'react';
import { useGameSocket } from './hooks/useGameSocket';

const GameContext = createContext<ReturnType<typeof useGameSocket> | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const game = useGameSocket();
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame va usato dentro <GameProvider>');
  return ctx;
};