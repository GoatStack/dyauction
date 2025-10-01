import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Button, 
  Card,
  IconButton,
  TextInput,
  Avatar,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getApiUrl } from '../config/api';

interface User {
  id: string;
  studentId: string;
  name: string;
  email: string;
  password: string;
  verificationStatus: string;
  createdAt: Date;
  isAdmin: boolean;
  profileImage?: string;
}

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = (global as any).token;
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(getApiUrl('/users/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userData = await response.json();
      console.log('Loaded user profile:', userData);

      const actualUser: User = {
        id: userData.id,
        studentId: userData.studentId,
        name: userData.name,
        email: userData.email,
        password: '',
        verificationStatus: userData.verificationStatus,
        createdAt: new Date(userData.createdAt),
        isAdmin: userData.isAdmin,
        profileImage: userData.profileImage,
      };

      setUser(actualUser);
      setFormData({
        name: actualUser.name,
        email: actualUser.email,
        studentId: actualUser.studentId,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      if (actualUser.profileImage) {
        setProfileImage(actualUser.profileImage);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('오류', '프로필 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('오류', '이름과 이메일은 필수입니다.');
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      // 프로필 이미지 업로드 (있는 경우)
      let imageUrl = null;
      if (profileImage && profileImage !== user?.profileImage) {
        imageUrl = await uploadProfileImage();
        if (imageUrl === null) {
          return; // 업로드 실패 시 중단
        }
      }

      // 프로필 정보 업데이트
      const response = await fetch(getApiUrl('/users/profile'), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          profileImage: imageUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('성공', result.message || '프로필이 성공적으로 업데이트되었습니다.', [
          { 
            text: '확인', 
            onPress: () => {
              setIsEditing(false);
              // ProfileScreen으로 돌아가서 데이터 새로고침
              navigation.goBack();
            }
          }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('오류', errorData.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadUserProfile(); // 원래 데이터로 복원
  };

  // 이미지 선택 함수
  const pickImage = async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('오류', '이미지 선택에 실패했습니다.');
    }
  };

  // 이미지 업로드 함수
  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImage) return null;

    try {
      setIsUploading(true);
      
      console.log('Starting image upload...');
      console.log('Profile image URI:', profileImage);
      
      const formData = new FormData();
      formData.append('profileImage', {
        uri: profileImage,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      console.log('FormData created:', formData);

      const response = await fetch(getApiUrl('/users/upload-profile-image'), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        return result.imageUrl;
      } else {
        const errorText = await response.text();
        console.log('Upload failed with error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      Alert.alert('오류', `이미지 업로드에 실패했습니다: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <IconButton icon="arrow-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 편집</Text>
        <View style={styles.headerRight}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancelButton}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveButton}>저장</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>편집</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* 프로필 정보 카드 */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : user?.profileImage ? (
                  <Image source={{ uri: `http://192.168.0.36:3000${user.profileImage}` }} style={styles.profileImage} />
                ) : (
                  <Avatar.Text size={80} label={user?.name?.charAt(0) || 'U'} />
                )}
                <View style={styles.imageEditOverlay}>
                  <IconButton icon="camera" size={20} iconColor="white" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <Text style={styles.profileStudentId}>학번: {user?.studentId}</Text>
              </View>
            </View>
            {profileImage && (
              <View style={styles.imagePreviewInfo}>
                <Text style={styles.imagePreviewText}>새 프로필 이미지가 선택되었습니다</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 편집 폼 */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            
            {/* 변경 불가능한 필드 안내 */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>⚠️ 변경 불가능한 정보</Text>
              <Text style={styles.infoBoxText}>
                • 이름과 학번은 보안상의 이유로 변경할 수 없습니다{'\n'}
                • 이 정보는 가입 시 한 번만 설정되며, 이후 수정이 불가능합니다
              </Text>
            </View>
            
            <TextInput
              label="이름 (변경 불가)"
              value={formData.name}
              style={[styles.input, styles.disabledInput]}
              mode="outlined"
              disabled={true}
              left={<TextInput.Icon icon="account-lock" color="#999" />}
            />
            
            <TextInput
              label="이메일"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              style={styles.input}
              mode="outlined"
              disabled={!isEditing}
              keyboardType="email-address"
            />
            
            <TextInput
              label="학번 (변경 불가)"
              value={formData.studentId}
              style={[styles.input, styles.disabledInput]}
              mode="outlined"
              disabled={true}
              left={<TextInput.Icon icon="card-account-details" color="#999" />}
            />

            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>비밀번호 변경</Text>
            
            <TextInput
              label="현재 비밀번호"
              value={formData.currentPassword}
              onChangeText={(text) => setFormData(prev => ({ ...prev, currentPassword: text }))}
              style={styles.input}
              mode="outlined"
              disabled={!isEditing}
              secureTextEntry
            />
            
            <TextInput
              label="새 비밀번호"
              value={formData.newPassword}
              onChangeText={(text) => setFormData(prev => ({ ...prev, newPassword: text }))}
              style={styles.input}
              mode="outlined"
              disabled={!isEditing}
              secureTextEntry
            />
            
            <TextInput
              label="새 비밀번호 확인"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
              style={styles.input}
              mode="outlined"
              disabled={!isEditing}
              secureTextEntry
            />
          </Card.Content>
        </Card>

        {/* 계정 정보 */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>계정 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>가입일:</Text>
              <Text style={styles.infoValue}>
                {user?.createdAt?.toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>상태:</Text>
              <Text style={styles.infoValue}>
                {user?.verificationStatus === 'verified' ? '인증됨' : '미인증'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>권한:</Text>
              <Text style={styles.infoValue}>
                {user?.isAdmin ? '관리자' : '일반 사용자'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  saveButton: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '500',
    marginLeft: 16,
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1976d2',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profileStudentId: {
    fontSize: 14,
    color: '#999',
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
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  imagePreviewInfo: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  imagePreviewText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
});
