import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import MainNavigator from './MainNavigator';
import { useAuth } from '../contexts/AuthContext';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔍 AuthNavigator - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  // 로딩 중일 때 스피너 표시
  if (isLoading) {
    console.log('⏳ 로딩 중...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  console.log('🚀 isAuthenticated 상태:', isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        // 인증된 경우 - Main 화면만 보여줌
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        // 인증되지 않은 경우 - 로그인 관련 화면들
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
