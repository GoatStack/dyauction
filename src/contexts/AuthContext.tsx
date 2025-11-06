import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLogoutCallback } from '../utils/database';

interface User {
  id: number;
  username: string;
  email: string;
  approval_status: string;
  user_type: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();

    // database.ts의 apiCall에서 401 에러 시 사용할 로그아웃 콜백 등록
    setLogoutCallback(() => {
      // 상태 업데이트
      setToken(null);
      setUser(null);
    });
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('authUser');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // 글로벌 토큰도 설정 (기존 코드와의 호환성을 위해)
        (global as any).token = storedToken;
      }
    } catch (error) {
      // 저장된 인증 정보 로드 실패
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, authToken: string) => {
    try {
      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('authUser', JSON.stringify(userData));
      
      setToken(authToken);
      setUser(userData);
      // 글로벌 토큰도 설정 (기존 코드와의 호환성을 위해)
      (global as any).token = authToken;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('authUser');
      
      setToken(null);
      setUser(null);
      // 글로벌 토큰도 제거
      (global as any).token = null;
    } catch (error) {
      // 로그아웃 정보 삭제 실패
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
