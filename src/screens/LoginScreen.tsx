import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Text,
  Paragraph,
} from 'react-native-paper';

import { LoginData } from '../types/auth';
import { authAPI } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api'; // API_CONFIG 임포트 추가

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 뒤로가기 처리
  useEffect(() => {
    const backHandler = navigation.addListener('beforeRemove', (e: any) => {
      // 뒤로가기 시도 시 기본 동작 방지
      e.preventDefault();
      
      // 이전 화면으로 이동
      navigation.goBack();
    });

    return backHandler;
  }, [navigation]);

  const handleInputChange = (field: keyof LoginData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Alert.alert('오류', '이메일을 입력해주세요.');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('오류', '비밀번호를 입력해주세요.');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    // console.log('🚀 로그인 시도 시작');
    
    if (!validateForm()) {
      // console.log('❌ 폼 검증 실패');
      return;
    }

    // console.log('📤 로그인 데이터:', {
    //   email: formData.email,
    //   password: formData.password ? '***' : '비밀번호 없음'
    // });

    setIsLoading(true);
    try {
      // 백엔드 서버 연결 테스트
      // console.log('🔗 백엔드 서버 연결 테스트 중...');
      try {
        // API_CONFIG.BASE_URL을 사용하여 동적으로 URL 가져오기
        const healthCheckUrl = `${API_CONFIG.BASE_URL.replace('/api', '')}/api/health`;
        const testResponse = await fetch(healthCheckUrl);
        // console.log('✅ 백엔드 서버 연결 성공:', testResponse.status);
      } catch (testError) {
        // console.error('❌ 백엔드 서버 연결 실패:', testError);
        Alert.alert('연결 오류', '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        return;
      }
      
      // console.log('🌐 백엔드 API 호출 중...');
      
      // 직접 fetch로 테스트
      try {
        // console.log('🧪 직접 fetch 테스트 시작...');
        const testResponse = await fetch('http://localhost:65000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer your-token-here',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
          credentials: 'include'
        });
        // console.log('🧪 직접 fetch 응답:', testResponse.status, testResponse.statusText);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          // console.log('🧪 직접 fetch 데이터:', testData);
        }
      } catch (testError) {
        // console.error('🧪 직접 fetch 오류:', testError);
      }
      
      // 백엔드 API를 통한 로그인
      const response = await authAPI.login(formData.email, formData.password);
      // console.log('📥 API 응답 받음:', response);
      // console.log('👤 사용자 정보:', response.user);
      // console.log('📋 승인 상태:', response.user?.approval_status);
      // console.log('👑 사용자 타입:', response.user?.user_type);
      
      if (response && response.user) {
        const user = response.user;
        
        // console.log('🔍 승인 상태 확인 중:', user.approval_status);
        
        if (user.approval_status === 'pending') {
          Alert.alert(
            '승인 대기 중',
            '관리자 승인을 기다리고 있습니다. 승인 후 로그인이 가능합니다.',
            [{ text: '확인' }]
          );
        } else if (user.approval_status === 'approved') {
          // 로그인 성공 - AuthContext를 통해 토큰과 사용자 정보 저장
          if (response.token) {
            await login(user, response.token);
            // console.log('🔑 토큰이 저장되었습니다:', response.token.substring(0, 20) + '...');
            
            // AuthContext가 자동으로 Main 화면으로 리다이렉트되므로 Alert 제거
            // console.log('✅ 로그인 완료 - 메인 화면으로 이동합니다');
            navigation.navigate('Main');
          }
        } else if (user.approval_status === 'rejected') {
          Alert.alert(
            '승인 거부',
            '회원가입이 거부되었습니다. 관리자에게 문의하세요.',
            [{ text: '확인' }]
          );
        }
      } else {
        Alert.alert('오류', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      // console.error('❌ 로그인 오류:', error);
      
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMessage = error.message;
        // console.log('📝 에러 상세:', error.message);
      }
      
      Alert.alert('로그인 오류', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🏛️</Text>
              </View>
              <Text style={styles.title}>덕영 옥션</Text>
              <Paragraph style={styles.subtitle}>
                안전하고 투명한 교내 경매
              </Paragraph>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="이메일"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <TextInput
                  label="비밀번호"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  style={styles.input}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.buttonContent}
              >
                로그인
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('SignUp')}
                style={styles.signUpButton}
              >
                계정이 없으신가요? 회원가입하기
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText} children={undefined}>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',

  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  loginButton: {
    marginBottom: 20,
    borderRadius: 25,
    backgroundColor: '#333',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  signUpButton: {
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});
