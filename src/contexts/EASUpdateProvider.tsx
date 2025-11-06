import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { UpdateLoadingScreen } from '../components/UpdateLoadingScreen';

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  error: string | null;
}

interface EASUpdateContextValue extends UpdateState {
  checkForUpdates: () => Promise<void>;
  downloadAndApplyUpdate: () => Promise<void>;
}

const EASUpdateContext = createContext<EASUpdateContextValue | undefined>(undefined);

export function EASUpdateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    isUpdatePending: false,
    error: null,
  });

  const checkForUpdates = async () => {
    // Development 모드이거나 웹에서는 업데이트 체크 안 함
    if (__DEV__ || Platform.OS === 'web') {
      return;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: true
        }));
        // 업데이트가 있으면 자동으로 다운로드
        await downloadAndApplyUpdate();
      } else {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: false
        }));
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const downloadAndApplyUpdate = async () => {
    if (__DEV__ || Platform.OS === 'web') {
      return;
    }

    try {
      setState(prev => ({ ...prev, isDownloading: true, error: null }));

      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          isUpdatePending: true
        }));

        // 업데이트 적용 (앱 재시작)
        await Updates.reloadAsync();
      } else {
        setState(prev => ({
          ...prev,
          isDownloading: false
        }));
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setState(prev => ({
        ...prev,
        isDownloading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // 앱 시작 시 자동으로 업데이트 체크
  useEffect(() => {
    checkForUpdates();
  }, []);

  const value: EASUpdateContextValue = {
    ...state,
    checkForUpdates,
    downloadAndApplyUpdate,
  };

  return (
    <EASUpdateContext.Provider value={value}>
      {state.isDownloading || state.isUpdatePending ? (
        <UpdateLoadingScreen />
      ) : (
        children
      )}
    </EASUpdateContext.Provider>
  );
}

export function useEASUpdate() {
  const context = useContext(EASUpdateContext);
  if (context === undefined) {
    throw new Error('useEASUpdate must be used within EASUpdateProvider');
  }
  return context;
}
