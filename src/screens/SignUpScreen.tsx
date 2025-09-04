import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Text,
  Paragraph,
  IconButton,
} from 'react-native-paper';

import * as ImagePicker from 'expo-image-picker';
import { SignUpData } from '../types/auth';
import { authAPI } from '../utils/database';

const { width, height } = Dimensions.get('window');

interface SignUpScreenProps {
  navigation: any;
}

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [formData, setFormData] = useState<SignUpData>({
    studentId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof SignUpData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          photo: {
            uri: asset.uri,
            name: `photo_${Date.now()}.jpg`,
            type: 'image/jpeg',
          },
        }));
      }
    } catch (error) {
      Alert.alert('오류', '사진 선택 중 오류가 발생했습니다.');
    }
  };

  const validateForm = async (): Promise<boolean> => {
    if (!formData.studentId.trim()) {
      Alert.alert('오류', '학번을 입력해주세요.');
      return false;
    }

    if (!formData.name.trim()) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert('오류', '이메일을 입력해주세요.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('오류', '올바른 이메일 형식을 입력해주세요.');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('오류', '비밀번호는 6자 이상이어야 합니다.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return false;
    }

    if (!formData.photo) {
      Alert.alert('오류', '신분증 또는 학생증 사진을 첨부해주세요.');
      return false;
    }

    // 백엔드에서 중복 체크를 수행하므로 클라이언트에서는 제거

    return true;
  };

  const handleSignUp = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setIsLoading(true);
    try {
      // 전송할 데이터 로깅
      console.log('📤 전송할 회원가입 데이터:', {
        username: formData.name,
        email: formData.email,
        password: formData.password,
        studentId: formData.studentId,
        photo: formData.photo
      });
      
      // 백엔드 API를 통한 회원가입 (이미지 포함)
      const newUser = await authAPI.signup(formData.name, formData.email, formData.password, formData.studentId, formData.photo);
      console.log('회원가입 완료:', newUser);
      
      Alert.alert(
        '회원가입 완료',
        '회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      console.error('회원가입 오류:', error);
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        Alert.alert('오류', '이미 등록된 학번 또는 이메일입니다.');
      } else {
        Alert.alert('오류', '회원가입 중 오류가 발생했습니다.');
      }
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
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🏛️</Text>
              </View>
              <Text style={styles.title}>회원가입</Text>
              <Paragraph style={styles.subtitle}>
                덕영 옥션에 가입하고 경매를 시작하세요
              </Paragraph>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>학번</Text>
                <TextInput
                  value={formData.studentId}
                  onChangeText={(text) => handleInputChange('studentId', text)}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  style={styles.input}
                  mode="outlined"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이메일</Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호</Text>
                <TextInput
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  style={styles.input}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호 확인</Text>
                <TextInput
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  style={styles.input}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
              </View>

              {/* Photo Upload Section */}
              <View style={styles.photoSection}>
                <Text style={styles.inputLabel}>신원 확인</Text>
                <Paragraph style={styles.photoDescription}>
                  신분증 또는 학생증 사진을 첨부해주세요
                </Paragraph>
                
                                  <Button
                    mode="outlined"
                    onPress={pickPhoto}
                    style={styles.photoButton}
                    contentStyle={styles.photoButtonContent}
                    icon="camera"
                  >
                    사진 첨부
                  </Button>

                {formData.photo && (
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoName}>
                      📷 {formData.photo.name}
                    </Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => setFormData(prev => ({ ...prev, photo: undefined }))}
                    />
                  </View>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleSignUp}
                style={styles.signUpButton}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.buttonContent}
              >
                회원가입
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                style={styles.loginButton}
              >
                이미 계정이 있으신가요? 로그인하기
              </Button>
            </View>
          </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logo: {
    fontSize: 35,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',

  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  photoSection: {
    marginBottom: 30,
  },
  photoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  photoButton: {
    marginBottom: 15,
    borderRadius: 25,
    borderColor: '#333',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  photoButtonContent: {
    paddingVertical: 8,
  },
  photoButtonLabel: {
    color: '#333',
    fontSize: 14,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  photoName: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
  },
  signUpButton: {
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
  loginButton: {
    marginTop: 10,
  },
});
