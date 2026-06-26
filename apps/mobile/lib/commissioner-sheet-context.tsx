import { createContext, useContext, useState, type ReactNode } from 'react';

type SheetState = { open: boolean };
const Ctx = createContext<{
  state: SheetState;
  open: () => void;
  close: () => void;
} | null>(null);

export function CommissionerSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false });
  return (
    <Ctx.Provider
      value={{
        state,
        open: () => setState({ open: true }),
        close: () => setState({ open: false }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCommissionerSheet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCommissionerSheet must be used within provider');
  return ctx;
}
