import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  IconButton,
  Switch,
  List,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // AuthNavigator가 자동으로 Welcome 화면으로 전환하므로 수동 navigate 불필요
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('계정 삭제', '계정 삭제 기능이 곧 추가됩니다.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <IconButton icon="arrow-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 알림 설정 */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <List.Item
              title="푸시 알림"
              description="경매 관련 알림을 받습니다"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color="#1976d2"
                />
              )}
            />
            <Divider />
            <List.Item
              title="이메일 알림"
              description="이메일로 알림을 받습니다"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color="#1976d2"
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* 앱 설정 */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>앱 설정</Text>
            <List.Item
              title="다크 모드"
              description="어두운 테마를 사용합니다"
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  color="#1976d2"
                />
              )}
            />
            <Divider />
            <List.Item
              title="자동 로그인"
              description="앱 실행 시 자동으로 로그인합니다"
              left={(props) => <List.Icon {...props} icon="login" />}
              right={() => (
                <Switch
                  value={autoLogin}
                  onValueChange={setAutoLogin}
                  color="#1976d2"
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* 계정 관리 */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <List.Item
              title="프로필 편집"
              description="개인정보를 수정합니다"
              left={(props) => <List.Icon {...props} icon="account-edit" />}
              onPress={() => navigation.navigate('EditProfile')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="비밀번호 변경"
              description="계정 비밀번호를 변경합니다"
              left={(props) => <List.Icon {...props} icon="lock-reset" />}
              onPress={() => navigation.navigate('ChangePassword')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="계정 삭제"
              description="계정을 영구적으로 삭제합니다"
              left={(props) => <List.Icon {...props} icon="account-remove" />}
              onPress={handleDeleteAccount}
              titleStyle={styles.dangerText}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* 정보 */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>정보</Text>
            <List.Item
              title="앱 버전"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="개발자 정보"
              description="덕영고등학교 앱개발팀"
              left={(props) => <List.Icon {...props} icon="account-group" />}
            />
            <Divider />
            <List.Item
              title="이용약관"
              description="서비스 이용약관을 확인합니다"
              left={(props) => <List.Icon {...props} icon="file-document" />}
              onPress={() => {
                Alert.alert(
                  '이용약관',
                  '이용약관을 확인하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    { 
                      text: '확인', 
                      onPress: () => {
                        // Notion 이용약관 페이지로 이동
                        const notionUrl = 'https://www.notion.so/264191aa7ee080b3ab8df1aecb8cd69c?source=copy_link';
                        Linking.openURL(notionUrl).catch(err => 
                          Alert.alert('오류', '링크를 열 수 없습니다.')
                        );
                      }
                    }
                  ]
                );
              }}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="개인정보처리방침"
              description="개인정보 처리방침을 확인합니다"
              left={(props) => <List.Icon {...props} icon="shield-account" />}
              onPress={() => {
                Alert.alert(
                  '개인정보처리방침',
                  '개인정보처리방침을 확인하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    { 
                      text: '확인', 
                      onPress: () => {
                        // Notion 개인정보처리방침 페이지로 이동
                        const notionUrl = 'https://www.notion.so/264191aa7ee080bbbff7cb506ec69cb7?source=copy_link';
                        Linking.openURL(notionUrl).catch(err => 
                          Alert.alert('오류', '링크를 열 수 없습니다.')
                        );
                      }
                    }
                  ]
                );
              }}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>
      </ScrollView> 
      {/* 로그아웃 버튼 */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>로그아웃</Text>
      </TouchableOpacity>
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
  sectionCard: {
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
    marginBottom: 16,
    color: '#333',
  },
  dangerText: {
    color: '#f44336',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#FF5252',
    fontWeight: '500',
  },
});
