import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card,
  IconButton,
  TextInput,
  Button
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('오류', '새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      // 실제 API 호출
      const response = await fetch('https://192.168.0.36:3000/api/users/change-password', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('성공', result.message || '비밀번호가 성공적으로 변경되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('오류', errorData.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <IconButton icon="arrow-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>비밀번호 변경</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 안내 카드 */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>비밀번호 변경 안내</Text>
            <Text style={styles.infoText}>
              • 현재 비밀번호를 정확히 입력해주세요{'\n'}
              • 새 비밀번호는 최소 6자 이상이어야 합니다{'\n'}
              • 새 비밀번호 확인을 위해 한 번 더 입력해주세요
            </Text>
          </Card.Content>
        </Card>

        {/* 비밀번호 변경 폼 */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>비밀번호 변경</Text>
            
            <TextInput
              label="현재 비밀번호"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              placeholder="현재 사용 중인 비밀번호를 입력하세요"
            />
            
            <TextInput
              label="새 비밀번호"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              placeholder="새로운 비밀번호를 입력하세요 (6자 이상)"
            />
            
            <TextInput
              label="새 비밀번호 확인"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              placeholder="새로운 비밀번호를 한 번 더 입력하세요"
            />

            <Button
              mode="contained"
              onPress={handleChangePassword}
              style={styles.changeButton}
              loading={isLoading}
              disabled={isLoading}
            >
              비밀번호 변경
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
    minHeight: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 16,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
  },
  changeButton: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: '#1976d2',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
