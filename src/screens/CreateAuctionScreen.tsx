import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card,
  IconButton,
  Button,
  TextInput,
  Modal,
  Portal,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { API_CONFIG } from '../config/api';
import { notificationManager } from '../utils/notificationManager';
import { useAuth } from '../contexts/AuthContext';

interface AuctionForm {
  title: string;
  description: string;
  startingPrice: string;
  duration: string;
  category: string;
  imageUris: string[];
}

export default function CreateAuctionScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const categorySelectorRef = React.useRef<any>(null);
  const durationSelectorRef = React.useRef<any>(null);
  const [formData, setFormData] = useState<AuctionForm>({
    title: '',
    description: '',
    startingPrice: '',
    duration: '',
    category: '',
    imageUris: [],
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [categorySelectorPosition, setCategorySelectorPosition] = useState({ x: 0, y: 0, width: 0 });
  const [durationSelectorPosition, setDurationSelectorPosition] = useState({ x: 0, y: 0, width: 0 });

  // 터치 외부 클릭으로 드롭다운 닫기
  const closeDropdowns = () => {
    setShowCategoryModal(false);
    setShowDurationModal(false);
  };

  // 선택기 위치 측정
  const measureSelectorPosition = (ref: any, setPosition: any) => {
    if (ref.current) {
      ref.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setPosition({ x: pageX, y: pageY + height, width });
      });
    }
  };

  // 카테고리 옵션
  const categoryOptions = [
    '전자기기', '의류', '도서', '게임', '가전', '스포츠', '뷰티', '기타'
  ];

  // 경매 기간 옵션
  const durationOptions = [
    { label: '1시간', value: '1h' },
    { label: '6시간', value: '6h' },
    { label: '1일', value: '1d' },
    { label: '3일', value: '3d' },
  ];

  // 숫자 포맷팅 함수 (천 단위 구분자 추가)
  const formatNumber = (value: string): string => {
    // 숫자가 아닌 문자 제거
    const numbers = value.replace(/[^0-9]/g, '');
    // 천 단위 구분자 추가
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 포맷된 숫자를 원래 숫자로 변환
  const parseNumber = (formattedValue: string): string => {
    return formattedValue.replace(/,/g, '');
  };

  // 이미지 선택
  const pickImage = async () => {
    try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
        aspect: [1, 1], // 정사각형 비율
      quality: 0.8,
        allowsMultipleSelection: true, // 다중 선택 허용
    });

              if (!result.canceled && result.assets.length > 0) {
          const newUris = result.assets.map(asset => asset.uri);
      setFormData(prev => ({
        ...prev,
            imageUris: [...prev.imageUris, ...newUris].slice(0, 10), // 최대 10장까지만
          }));
        }
    } catch (error) {
      console.error('이미지 선택 실패:', error);
      Alert.alert('오류', '이미지를 선택할 수 없습니다.');
    }
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    if (formData.imageUris.length === 0) {
      Alert.alert('오류', '상품 이미지를 선택해주세요.');
      return false;
    }
    if (!formData.title.trim()) {
      Alert.alert('오류', '상품명을 입력해주세요.');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('오류', '상품 설명을 입력해주세요.');
      return false;
    }
    if (!formData.startingPrice.trim()) {
      Alert.alert('오류', '시작가를 입력해주세요.');
      return false;
    }
    if (!formData.duration) {
      Alert.alert('오류', '경매 진행시간을 선택해주세요.');
      return false;
    }

    const price = parseInt(formData.startingPrice);
    if (isNaN(price) || price < 1000) {
      Alert.alert('오류', '시작가는 1,000원 이상이어야 합니다.');
      return false;
    }

    return true;
  };

  // 네트워크 상태 확인 (간단한 버전)
  const checkNetworkStatus = async () => {
    try {
      console.log('🔍 네트워크 상태 확인 시작');
      console.log('📍 Health Check URL:', `${API_CONFIG.BASE_URL}/health`);
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
        method: 'GET'
      });
      console.log('✅ Health Check 응답:', response.ok, response.status);
      return response.ok;
    } catch (error) {
      console.log('❌ 네트워크 상태 확인 실패:', error);
      if (error instanceof Error) {
        console.log('❌ 에러 메시지:', error.message);
      }
      return false;
    }
  };

  // 파일 URI를 FormData로 변환하는 함수
  const createFormData = async (uri: string): Promise<FormData> => {
    const formData = new FormData();
    
    if (uri.startsWith('data:image/')) {
      // Base64 데이터를 Blob으로 변환
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('auctionImage', blob, 'image.jpg');
    } else if (uri.startsWith('blob:')) {
      // Blob URI인 경우
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('auctionImage', blob, 'image.jpg');
    } else {
      // 파일 URI인 경우
      formData.append('auctionImage', {
        uri: uri,
        type: 'image/jpeg',
        name: 'image.jpg'
      } as any);
    }
    
    return formData;
  };

  // 이미지 업로드 함수
  const uploadImages = async (imageUris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    console.log('📸 이미지 업로드 시작, 총', imageUris.length, '개');

    for (let i = 0; i < imageUris.length; i++) {
      const imageUri = imageUris[i];
      try {
        console.log(`📤 이미지 ${i + 1}/${imageUris.length} 업로드 중...`);
        console.log('🖼️ 이미지 URI:', imageUri.substring(0, 50) + '...');

        // FormData 생성
        const formData = await createFormData(imageUri);

        const uploadUrl = `${API_CONFIG.BASE_URL}/auctions/upload-image`;
        console.log('📍 업로드 URL:', uploadUrl);
        console.log('🔑 토큰:', token ? `${token.substring(0, 20)}...` : 'test-token');

        console.log('🚀 이미지 업로드 Fetch 시작...');
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || 'test-token'}`,
            // Content-Type은 FormData일 때 자동으로 설정됨
          },
          body: formData,
        });

        console.log('✅ Fetch 완료');
        console.log('📊 Response Status:', response.status);
        console.log('📊 Response OK:', response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ 이미지 업로드 성공:', result);

          // 백엔드에서 반환하는 imageUrl이 /images/{imageId} 형태이므로 BASE_URL과 결합
          const imageUrl = `${API_CONFIG.BASE_URL}${result.imageUrl}`;
          console.log('🔗 최종 이미지 URL:', imageUrl);
          uploadedUrls.push(imageUrl);
        } else {
          const errorText = await response.text();
          console.error('❌ 이미지 업로드 실패:', errorText);
          throw new Error(`이미지 업로드 실패: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ 이미지 ${i + 1} 업로드 오류:`, error);
        if (error instanceof Error) {
          console.error('❌ 오류 메시지:', error.message);
          console.error('❌ 오류 스택:', error.stack);
        }
        throw error;
      }
    }

    console.log('✅ 모든 이미지 업로드 완료:', uploadedUrls);
    return uploadedUrls;
  };

  // 경매 등록
  const handleCreateAuction = async () => {
    if (!validateForm()) return;

    // 네트워크 상태 확인
    const isNetworkAvailable = await checkNetworkStatus();
    if (!isNetworkAvailable) {
      Alert.alert('오류', '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      // 이미지 업로드
      console.log('📤 경매 이미지 업로드 시작...');
      const imageUrls = await uploadImages(formData.imageUris);
      console.log('✅ 업로드된 이미지 URLs:', imageUrls);

      // 경매 등록 API 호출
      const auctionUrl = `${API_CONFIG.BASE_URL}/auctions`;
      console.log('🌐 경매 등록 API 호출 주소:', API_CONFIG.BASE_URL);
      console.log('📡 경매 등록 요청 URL:', auctionUrl);

      const response = await fetch(auctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
        title: formData.title,
        description: formData.description,
          startingPrice: parseInt(formData.startingPrice),
          duration: formData.duration,
          category: formData.category,
          imageUris: imageUrls,
        }),
      });

      if (!response.ok) {
        let errorMessage = '경매 등록에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // JSON 파싱 실패 시 응답 텍스트 확인
          try {
            const responseText = await response.text();
            console.error('Response text:', responseText);
            if (responseText.includes('HTML')) {
              errorMessage = '서버 연결 오류입니다. 백엔드 서버를 확인해주세요.';
            }
          } catch (textError) {
            errorMessage = '서버 응답을 읽을 수 없습니다.';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // 알림 추가
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        notificationManager.addAuctionCreatedNotification(user.id, formData.title);
      }
      
      Alert.alert(
        '성공', 
        result.message || '경매가 성공적으로 등록되었습니다! 관리자 승인 후 게시됩니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    } catch (error: any) {
      console.error('경매 등록 실패:', error);
      Alert.alert('오류', error.message || '경매 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>경매 상품 등록</Text>
        <TouchableOpacity onPress={handleCreateAuction}>
          <View style={styles.registerButton}>
            <Text style={styles.registerButtonText}>등록</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.content} 
        activeOpacity={1} 
        onPress={closeDropdowns}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
        {/* 이미지 업로드 섹션 */}
        <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>상품 이미지</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollContainer}
            contentContainerStyle={styles.imageScrollContent}
          >
            {/* 이미지들 표시 */}
            {formData.imageUris.map((uri, index) => (
              <View key={index} style={styles.imageUploadItem}>
                <Image source={{ uri }} style={styles.uploadedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      imageUris: prev.imageUris.filter((_, i) => i !== index)
                    }));
                  }}
                >
                  <IconButton icon="close" size={16} iconColor="white" />
                </TouchableOpacity>
              </View>
            ))}

            {/* 추가 이미지 버튼 (최대 10장까지) */}
            {formData.imageUris.length < 10 && (
              <TouchableOpacity 
                style={styles.imageUploadItem} 
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.imagePlaceholder}>
                  <IconButton 
                    icon={formData.imageUris.length === 0 ? "camera" : "plus"} 
                    size={formData.imageUris.length === 0 ? 32 : 24} 
                    iconColor="#ccc" 
                  />
                  <Text style={styles.imagePlaceholderText}>
                    {formData.imageUris.length === 0 ? '사진 추가' : '추가'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.imageNote}>첫 번째 이미지는 필수, 최대 10장까지 업로드 가능</Text>
        </View>

        {/* 상품 정보 섹션 */}
        <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>상품 정보</Text>
            
          {/* 상품명 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>상품명</Text>
            <TextInput
              mode="flat"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="상품명을 입력하세요"
              style={styles.textInput}
              maxLength={50}
            />
          </View>

          {/* 카테고리 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>카테고리</Text>
                        <View style={[styles.selectorWrapper, { zIndex: 99999999 }]}>
              <TouchableOpacity
                ref={categorySelectorRef}
                style={styles.categorySelector}
                onLayout={() => measureSelectorPosition(categorySelectorRef, setCategorySelectorPosition)}
                onPress={() => {
                  console.log('카테고리 선택기 터치됨');
                  measureSelectorPosition(categorySelectorRef, setCategorySelectorPosition);
                  setShowCategoryModal(true);
                  setShowDurationModal(false); // 다른 드롭다운 닫기
                }}
                activeOpacity={0.7}
              >
                <Text style={formData.category ? styles.categorySelected : styles.categoryPlaceholder}>
                  {formData.category || '카테고리를 선택하세요'}
                </Text>
                <IconButton icon="chevron-down" size={20} iconColor="#666" />
              </TouchableOpacity>
              
                        {/* 카테고리 드롭다운 */}
          {showCategoryModal && (
            <Portal>
              <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={closeDropdowns}
              >
                <View style={[styles.dropdownContainer, { 
                  top: categorySelectorPosition.y, 
                  left: categorySelectorPosition.x, 
                  right: 20,
                  width: categorySelectorPosition.width || 300
                }]}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {categoryOptions.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={styles.dropdownOption}
                        onPress={() => {
                          console.log('카테고리 선택됨:', category);
                          setFormData(prev => ({ ...prev, category }));
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{category}</Text>
                                                 {formData.category === category && (
                           <IconButton
                             icon="check"
                             size={18}
                             iconColor="#007AFF"
                             style={{ marginLeft: 6 }}
                           />
                         )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Portal>
          )}
            </View>
          </View>

          {/* 상품 설명 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>상품 설명</Text>
            <TextInput
              mode="flat"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="상품에 대한 자세한 설명을 입력하세요"
              style={styles.descriptionInput}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>

        {/* 경매 설정 섹션 */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>경매 설정</Text>
          
          {/* 시작가 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>시작가</Text>
            <TextInput
              mode="flat"
              value={formatNumber(formData.startingPrice)}
              onChangeText={(text) => {
                const formattedText = formatNumber(text);
                const numericValue = parseNumber(formattedText);
                setFormData(prev => ({ ...prev, startingPrice: numericValue }));
              }}
              placeholder="시작 가격을 입력하세요 (예: 10,000)"
              style={styles.textInput}
              keyboardType="numeric"
            />
          </View>

                      {/* 경매 기간 */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>경매 기간</Text>
                            <View style={[styles.selectorWrapper, { zIndex: 99999999 }]}>
                <TouchableOpacity
                  ref={durationSelectorRef}
                  style={styles.durationSelector}
                  onLayout={() => measureSelectorPosition(durationSelectorRef, setDurationSelectorPosition)}
                  onPress={() => {
                    console.log('경매 기간 선택기 터치됨');
                    measureSelectorPosition(durationSelectorRef, setDurationSelectorPosition);
                    setShowDurationModal(true);
                    setShowCategoryModal(false); // 다른 드롭다운 닫기
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={formData.duration ? styles.durationSelected : styles.durationPlaceholder}>
                    {formData.duration ? durationOptions.find(opt => opt.value === formData.duration)?.label : '경매 기간을 선택하세요'}
                  </Text>
                  <IconButton icon="chevron-down" size={20} iconColor="#666" />
                </TouchableOpacity>
                
                                          {/* 경매 기간 드롭다운 */}
          {showDurationModal && (
            <Portal>
              <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={closeDropdowns}
              >
                <View style={[styles.dropdownContainer, { 
                  top: durationSelectorPosition.y, 
                  left: durationSelectorPosition.x, 
                  right: 20,
                  width: durationSelectorPosition.width || 300
                }]}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {durationOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.dropdownOption}
                        onPress={() => {
                          console.log('경매 기간 선택됨:', option.value);
                          setFormData(prev => ({ ...prev, duration: option.value }));
                          setShowDurationModal(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{option.label}</Text>
                                               {formData.duration === option.value && (
                         <IconButton
                           icon="check"
                           size={18}
                           iconColor="#007AFF"
                           style={{ marginLeft: 6 }}
                         />
                       )}
                      </TouchableOpacity>
                    ))}
      </ScrollView>
    </View>
              </TouchableOpacity>
            </Portal>
          )}
              </View>
            </View>
        </View>

        {/* 경매 등록 전 확인사항 */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>경매 등록 전 확인사항</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• 상품의 실제 상태와 설명이 일치하는지 확인하세요</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• 경매 시작 후에는 취소가 어려우니 신중히 결정하세요</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>• 허위 정보 기재 시 계정 제재를 받을 수 있습니다</Text>
          </View>
        </View>
        </ScrollView>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 8,
  },
  imageSection: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: -999, // 드롭다운보다 훨씬 낮은 zIndex
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imageScrollContainer: {
    marginBottom: 8,
  },
  imageScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 2,
  },
  imageUploadItem: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
    position: 'relative',
    flexShrink: 0,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: -999, // 드롭다운보다 훨씬 낮은 zIndex
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderWidth: 0,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 32,
  },
  descriptionInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 0,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 80,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  categoryPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  categorySelected: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: -999, // 드롭다운보다 훨씬 낮은 zIndex
  },
  durationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  durationPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  durationSelected: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checklistSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: -999, // 드롭다운보다 훨씬 낮은 zIndex
  },
  checklistItem: {
    marginBottom: 8,
  },
  checklistText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  // 모달 스타일
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  // 디버그 스타일
  debugSection: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  // 드롭다운 스타일
  dropdownContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 0, // 테두리 제거
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 999,
    zIndex: 999999999,
    maxHeight: 160, // 최대 높이 축소
    overflow: 'hidden', // 넘치는 내용 숨김
    minWidth: 180, // 최소 너비 축소
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    minHeight: 40, // 높이 축소
    height: 40, // 정확한 높이 고정
  },
  dropdownOptionActive: {
    backgroundColor: '#f8f9fa',
    minHeight: 48,
    height: 48,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1, // 텍스트가 전체 너비를 차지
    textAlignVertical: 'center', // 세로 중앙 정렬
  },
  selectorWrapper: {
    position: 'relative',
    zIndex: 99999999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
