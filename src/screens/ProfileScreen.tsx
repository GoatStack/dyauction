import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Button, 
  Card,
  IconButton,
  List,
  Avatar,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../types/auth';
import { AuctionItem } from '../types/auction';

// 이미지 URL 변환 함수
const convertImageUrl = (imageUrl: any): string => {
  // undefined, null 체크
  if (!imageUrl) {
    return 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음';
  }
  
  // 배열인 경우 첫 번째 요소 사용
  if (Array.isArray(imageUrl)) {
    if (imageUrl.length > 0 && typeof imageUrl[0] === 'string') {
      return convertImageUrl(imageUrl[0]);
    }
    return 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음';
  }
  
  // 문자열이 아닌 경우
  if (typeof imageUrl !== 'string') {
    return 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음';
  }
  
  // 이미 웹 URL인 경우 그대로 사용
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // 로컬 파일 경로인 경우 웹 URL로 변환
  if (imageUrl.startsWith('file://')) {
    const filename = imageUrl.split('/').pop();
    return `http://192.168.0.36:3000/uploads/${filename}`;
  }
  
  // 파일명만 있는 경우
  if (imageUrl.includes('.jpg') || imageUrl.includes('.png') || imageUrl.includes('.jpeg')) {
    return `http://192.168.0.36:3000/uploads/${imageUrl}`;
  }
  
  return imageUrl;
};

interface ProfileStats {
  sales: number;
  bids: number;
  wins: number;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  

  
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    sales: 0,
    bids: 0,
    wins: 0,
  });
  const [myAuctions, setMyAuctions] = useState<AuctionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'selling' | 'bidding' | 'won'>('selling');
  


  // Mock 데이터 제거 - 실제 API 데이터만 사용

  useEffect(() => {
    console.log('🚀 ProfileScreen 마운트됨');
    console.log('🔑 현재 global.token 상태:', (global as any).token ? '토큰 있음' : '토큰 없음');
    if ((global as any).token) {
      console.log('🔑 토큰 내용:', (global as any).token.substring(0, 30) + '...');
    }
    
    // 모든 데이터를 병렬로 로드하여 속도 향상
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadUserProfile(),
          loadUserStats(),
          loadAuctionData('selling')
        ]);
        console.log('✅ 모든 데이터 로드 완료');
      } catch (error) {
        console.error('❌ 데이터 로드 중 오류:', error);
      }
    };
    
    loadAllData();
  }, []);

  // EditProfile에서 돌아올 때 데이터 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
      loadUserStats();
    });

    return unsubscribe;
  }, [navigation]);

  // 실제 사용자 프로필 정보 로드
  const loadUserProfile = async () => {
    try {
      console.log('🔍 프로필 정보 로드 시작...');
      console.log('🔑 현재 토큰:', (global as any).token ? '토큰 있음' : '토큰 없음');
      
      // 로그인된 사용자 정보 가져오기 (5초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://192.168.0.36:3000/api/users/profile', {
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 프로필 API 응답:', response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ 프로필 데이터 성공:', userData);
        setUser({
          id: userData.id,
          studentId: userData.studentId,
          name: userData.name,
          email: userData.email,
          password: '',
          verificationStatus: userData.verificationStatus,
          createdAt: new Date(userData.createdAt),
          isAdmin: userData.isAdmin,
          profileImage: userData.profileImage,
        });
      } else {
        // API 호출 실패 시 빈 상태로 설정
        console.log('❌ 프로필 API 호출 실패:', response.status);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // 에러 시 빈 상태로 설정
      setUser(null);
    }
  };

  // 실제 사용자 통계 정보 로드
  const loadUserStats = async () => {
    try {
      console.log('📊 통계 정보 로드 시작...');
      
      // 통계 정보 가져오기 (5초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://192.168.0.36:3000/api/users/stats', {
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 통계 API 응답:', response.status, response.statusText);
      
      if (response.ok) {
        const statsData = await response.json();
        console.log('✅ 통계 데이터 성공:', statsData);
        setStats(statsData);
      } else {
        // API 호출 실패 시 빈 상태로 설정
        console.log('❌ 통계 API 호출 실패:', response.status);
        setStats({
          sales: 0,
          bids: 0,
          wins: 0,
        });
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
      // 에러 시 빈 상태로 설정
      setStats({
        sales: 0,
        bids: 0,
        wins: 0,
      });
    }
  }



  // 탭 변경 핸들러
  const handleTabChange = (tab: 'selling' | 'bidding' | 'won') => {
    setActiveTab(tab);
    loadAuctionData(tab); // 실제 데이터 로드
  };

  // 실제 경매 데이터 로딩 함수
  const loadAuctionData = async (tab: 'selling' | 'bidding' | 'won') => {
    try {
      console.log(`🏷️ ${tab} 경매 데이터 로드 시작...`);
      
      // 경매 데이터 가져오기 (5초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://192.168.0.36:3000/api/users/auctions/${tab}`, {
        headers: { 
          'Authorization': `Bearer ${(global as any).token || 'test-token'}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📥 ${tab} 경매 API 응답:`, response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${tab} 경매 데이터 성공:`, data);
        
        // 데이터 변환 (API 응답을 AuctionItem 형태로 변환)
        const transformedData = data.map((auction: any) => ({
          id: auction.id.toString(),
          title: auction.title,
          description: auction.description,
          startingPrice: auction.startingPrice,
          currentPrice: auction.currentPrice,
          imageUrl: auction.imageUrl,
          images: auction.images || [],
          sellerId: auction.sellerId?.toString() || '1',
          sellerName: auction.sellerName || '사용자',
          status: auction.status,
          endTime: new Date(auction.endTime),
          createdAt: new Date(auction.createdAt),
          bids: auction.bids || [],
          participants: auction.participants || 0,
        }));
        
        setMyAuctions(transformedData);
      } else {
        console.error(`❌ ${tab} 경매 API 호출 실패:`, response.status, response.statusText);
        setMyAuctions([]);
      }
    } catch (error) {
      console.error('Failed to load auction data:', error);
      // 에러 시 빈 배열로 설정
      setMyAuctions([]);
    }
  };

  // 프로필 편집 핸들러
  const handleEditProfile = () => {
    (navigation as any).navigate('EditProfile');
  };

  // 프로필 편집 완료 후 데이터 새로고침
  const refreshProfileData = () => {
    loadUserProfile();
    loadUserStats();
  };

  // 설정 핸들러
  const handleSettings = () => {
    (navigation as any).navigate('Settings');
  };

  // 시간 포맷팅 함수
  const formatTimeLeft = (endTime: Date | undefined): string => {
    if (!endTime || !(endTime instanceof Date)) {
      return '시간 정보 없음';
    }
    
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '종료됨';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };

  const renderAuctionItem = (item: AuctionItem) => {
    console.log('🖼️ 경매 카드 이미지 데이터:', {
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      convertedUrl: convertImageUrl(item.imageUrl)
    });
    
    return (
      <TouchableOpacity 
        key={item.id}
        onPress={() => navigation.navigate('AuctionDetail', { auctionId: item.id })}
        activeOpacity={0.7}
      >
        <Card style={styles.auctionCard}>
          <Card.Cover source={{ uri: convertImageUrl(item.imageUrl) }} style={styles.auctionImage} />
        <Card.Content style={styles.auctionContent}>
          <Text style={styles.auctionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.auctionInfo}>
            <Text style={styles.auctionPrice}>
              현재가: {item.currentPrice.toLocaleString()}원
            </Text>
            <Text style={styles.auctionStatus}>
              {item.status === 'active' ? '진행중' : '종료됨'}
            </Text>
          </View>
          <View style={styles.auctionTimeInfo}>
            <Text style={styles.auctionTime}>
              {item.endTime ? formatTimeLeft(item.endTime) : '시간 정보 없음'}
            </Text>
            <Text style={styles.auctionParticipants}>
              {item.participants || 0}명 참여
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
    );
  };

  const renderNewAuctionItem = (item: AuctionItem) => {
    console.log('🖼️ 새 경매 카드 이미지 데이터:', {
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      convertedUrl: convertImageUrl(item.imageUrl)
    });
    
    return (
      <TouchableOpacity 
        key={item.id}
        onPress={() => navigation.navigate('AuctionDetail', { auctionId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.newAuctionCard}>
          <View style={styles.newAuctionImageContainer}>
            <Image source={{ uri: convertImageUrl(item.imageUrl) }} style={styles.newAuctionImage} />
          <View style={styles.newAuctionStatusBadge}>
            <Text style={styles.newAuctionStatusText}>
              {item.status === 'active' ? '진행중' : '종료됨'}
            </Text>
          </View>
        </View>
        <View style={styles.newAuctionContent}>
          <Text style={styles.newAuctionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.newAuctionPrice}>
            {item.currentPrice.toLocaleString()}원
          </Text>
          <View style={styles.newAuctionTimeInfo}>
            <Text style={styles.newAuctionTime}>
              {item.endTime ? formatTimeLeft(item.endTime) : '시간 정보 없음'}
            </Text>
            <Text style={styles.newAuctionParticipants}>
              {item.participants || 0}명 참여
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>프로필 정보 로딩 중...</Text>
          <Text style={styles.loadingSubText}>잠시만 기다려주세요</Text>
          <View style={styles.loadingSpinner}>
            <IconButton icon="loading" size={32} iconColor="#1976d2" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 새로운 상단 헤더 */}
      <View style={[styles.newHeader, { paddingTop: insets.top }]}>
        <Text style={styles.newHeaderTitle}>프로필</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <IconButton 
            icon="cog-outline" 
            size={20} 
            iconColor="#333"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 새로운 사용자 정보 */}
        <View style={[styles.newUserCard, { marginTop: 8 }]}>
          <View style={styles.newUserContent}>
            <View style={styles.newUserInfo}>
              <View style={styles.newAvatar}>
                {user.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.newAvatarImage} />
                ) : (
                  <Text style={styles.newAvatarText}>{user.name.substring(0, 2)}</Text>
                )}
              </View>
              <View style={styles.newUserDetails}>
                <Text style={styles.newUserName}>{user.name}</Text>
                <Text style={styles.newUserEmail}>{user.email}</Text>
                <Text style={styles.newUserId}>학번: {user.studentId}</Text>

              </View>
            </View>
          </View>
        </View>

        {/* 새로운 통계 */}
        <View style={styles.newStatsCard}>
          <Text style={styles.newSectionTitle}>활동 통계</Text>
          <View style={styles.newStatsGrid}>
            <View style={styles.newStatItem}>
              <Text style={styles.newStatNumber}>{stats.sales}</Text>
              <Text style={styles.newStatLabel}>판매</Text>
            </View>
            <View style={styles.newStatItem}>
              <Text style={styles.newStatNumber}>{stats.bids}</Text>
              <Text style={styles.newStatLabel}>입찰</Text>
            </View>
            <View style={styles.newStatItem}>
              <Text style={styles.newStatNumber}>{stats.wins}</Text>
              <Text style={styles.newStatLabel}>낙찰</Text>
            </View>
          </View>
        </View>

        {/* 새로운 메뉴 */}
        <View style={styles.newMenuCard}>
          <Text style={styles.newSectionTitle}>설정</Text>
          <TouchableOpacity style={styles.newMenuItem} onPress={() => Alert.alert('찜한 상품', '찜한 상품 화면으로 이동')}>
            <IconButton icon="heart-outline" size={18} iconColor="#666" />
            <Text style={styles.newMenuItemText}>찜한 상품</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>0</Text>
            </View>
            <IconButton icon="chevron-right" size={18} iconColor="#ccc" />
          </TouchableOpacity>
          <View style={styles.newMenuDivider} />
          <TouchableOpacity style={styles.newMenuItem} onPress={() => Alert.alert('최근 본 상품', '최근 본 상품 화면으로 이동')}>
            <IconButton icon="clock-outline" size={18} iconColor="#666" />
            <Text style={styles.newMenuItemText}>최근 본 상품</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>0</Text>
            </View>
            <IconButton icon="chevron-right" size={18} iconColor="#ccc" />
          </TouchableOpacity>
          <View style={styles.newMenuDivider} />
          <TouchableOpacity style={styles.newMenuItem} onPress={() => navigation.navigate('Settings')}>
            <IconButton icon="cog-outline" size={18} iconColor="#666" />
            <Text style={styles.newMenuItemText}>설정</Text>
            <IconButton icon="chevron-right" size={18} iconColor="#ccc" />
          </TouchableOpacity>
        </View>

        {/* 새로운 내 경매 활동 */}
        <View style={styles.newAuctionsCard}>
          <Text style={styles.newSectionTitle}>내 경매 활동</Text>
          
          {/* 탭 네비게이션 */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'selling' && styles.activeTab]}
              onPress={() => handleTabChange('selling')}
            >
              <Text style={[styles.tabText, activeTab === 'selling' && styles.activeTabText]}>판매중</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'bidding' && styles.activeTab]}
              onPress={() => handleTabChange('bidding')}
            >
              <Text style={[styles.tabText, activeTab === 'bidding' && styles.activeTabText]}>입찰중</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'won' && styles.activeTab]}
              onPress={() => handleTabChange('won')}
            >
              <Text style={[styles.tabText, activeTab === 'won' && styles.activeTabText]}>낙찰</Text>
            </TouchableOpacity>
          </View>

          {/* 경매 아이템 카드들 - 가로 스크롤 */}
          {myAuctions.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.auctionScrollContainer}
              contentContainerStyle={styles.auctionScrollContent}
            >
              {myAuctions.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.auctionActivityCard}
                  onPress={() => navigation.navigate('AuctionDetail', { auctionId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.auctionActivityImageContainer}>
                    <Image 
                      source={{ 
                        uri: convertImageUrl(item.imageUrl)
                      }} 
                      style={styles.auctionActivityImage} 
                    />
                    <View style={styles.auctionActivityStatusBadge}>
                      <Text style={styles.auctionActivityStatusText}>
                        {item.status === 'active' ? '진행중' : '종료됨'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.auctionActivityContent}>
                    <Text style={styles.auctionActivityTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                    <View style={styles.auctionActivityPriceContainer}>
                      <Text style={styles.auctionActivityPriceLabel}>현재가</Text>
                      <Text style={styles.auctionActivityPriceValue}>
                        {item.currentPrice.toLocaleString()}원
                      </Text>
                    </View>
                    <View style={styles.auctionActivityInfo}>
                      <View style={styles.auctionActivityTimeInfo}>
                        <IconButton icon="clock-outline" size={16} iconColor="#666" />
                        <Text style={styles.auctionActivityTimeText} numberOfLines={1} ellipsizeMode="tail">
                          {formatTimeLeft(item.endTime)}
                        </Text>
                      </View>
                      <View style={styles.auctionActivityParticipantInfo}>
                        <IconButton icon="account-group-outline" size={16} iconColor="#666" />
                        <Text style={styles.auctionActivityParticipantText} numberOfLines={1} ellipsizeMode="tail">
                          {item.participants}명 참여
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyAuctionState}>
              <IconButton icon="package-variant" size={48} iconColor="#ccc" />
              <Text style={styles.emptyAuctionText}>
                {activeTab === 'selling' && '판매중인 경매가 없습니다'}
                {activeTab === 'bidding' && '입찰중인 경매가 없습니다'}
                {activeTab === 'won' && '낙찰한 경매가 없습니다'}
              </Text>
            </View>
          )}
        </View>




      </ScrollView>



      {/* 커스텀 하단 네비게이션 */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <IconButton icon="home" size={24} iconColor="#333" />
          <Text style={styles.navText}>홈</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateAuction')}
        >
          <IconButton icon="plus" size={28} iconColor="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <IconButton icon="account" size={24} iconColor="#333" />
          <Text style={styles.navText}>프로필</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  newHeader: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  newHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 16,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    backgroundColor: 'white',
  },
  userContent: {
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#333',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsCard: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  auctionsCard: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  auctionCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    backgroundColor: 'white',
  },
  auctionImage: {
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  auctionContent: {
    padding: 12,
  },
  auctionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  auctionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auctionPrice: {
    fontSize: 12,
    color: '#666',
  },
  auctionStatus: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#333',
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  menuCard: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    backgroundColor: 'white',
  },
  logoutButton: {
    borderColor: '#FF5252',
    marginBottom: 32,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  newUserCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  newUserContent: {
    padding: 16,
  },
  newUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  newAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  newUserDetails: {
    flex: 1,
  },
  newUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  newUserEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 1,
  },
  newUserId: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },

  newStatsCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 20,
    paddingVertical: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  newSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  newStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  newStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  newStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  newStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  newAuctionsCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  newSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  newEmptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  newEmptyText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  newCreateButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  newCreateButtonText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '500',
  },
  newAuctionCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  newAuctionImageContainer: {
    position: 'relative',
  },
  newAuctionImage: {
    width: '100%',
    height: 80,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  newAuctionStatusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newAuctionStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  newAuctionContent: {
    padding: 8,
  },
  newAuctionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  newAuctionPrice: {
    fontSize: 11,
    color: '#666',
  },
  newMenuCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  newMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  newMenuItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 2,
  },
  newMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 1,
  },

  profileActions: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  editProfileButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  settingsButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  settingsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalSettingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalSettingItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  modalSettingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalSettingItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  countBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  countBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  auctionActivityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: 280,
    marginRight: 16,
  },
  auctionActivityImageContainer: {
    position: 'relative',
  },
  auctionActivityImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  auctionActivityStatusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  auctionActivityStatusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
  },
  auctionActivityContent: {
    padding: 16,
  },
  auctionActivityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  auctionActivityPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  auctionActivityPriceLabel: {
    fontSize: 13,
    color: '#666',
  },
  auctionActivityPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  auctionActivityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  auctionActivityTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 40,
  },
  auctionActivityTimeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 2,
  },
  auctionActivityParticipantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 40,
  },
  auctionActivityParticipantText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 2,
  },
  emptyAuctionState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAuctionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  auctionTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  auctionTime: {
    fontSize: 12,
    color: '#666',
  },
  auctionParticipants: {
    fontSize: 12,
    color: '#666',
  },
  newAuctionTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  newAuctionTime: {
    fontSize: 12,
    color: '#666',
  },
  newAuctionParticipants: {
    fontSize: 12,
    color: '#666',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 0,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: '#666',
    marginTop: 0,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  auctionScrollContainer: {
    marginTop: 16,
  },
  auctionScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
  },
  loadingSpinner: {
    marginTop: 16,
  },
});
