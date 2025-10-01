import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './src/navigation/AuthNavigator';
import { initDatabase } from './src/utils/database';
import PushNotificationService from './src/services/pushNotificationService';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  useEffect(() => {
    // 앱 시작 시 데이터베이스 초기화
    initDatabase()
      .then(() => {
        console.log('Database initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
      });

    // 푸시 알림 권한 요청
    PushNotificationService.requestPermissions().catch(error => {
      console.error('푸시 알림 권한 요청 실패:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AuthNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
