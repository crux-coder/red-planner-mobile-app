import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type AppStateContextType = {
  appState: AppStateStatus;
  lastActiveAt: number | null;
};

const AppStateContext = createContext<AppStateContextType>({
  appState: AppState.currentState,
  lastActiveAt: null,
});

export const useAppState = () => useContext(AppStateContext);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [lastActiveAt, setLastActiveAt] = useState<number | null>(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setLastActiveAt(Date.now());
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, lastActiveAt }}>
      {children}
    </AppStateContext.Provider>
  );
};
