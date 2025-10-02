import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  BackHandler,
  Image,
} from 'react-native';

import {
  Text,
  Card,
  IconButton,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auctionAPI } from '../utils/database';
import { notificationManager, Notification } from '../utils/notificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeImageUrl, formatAuctionImages } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// 이미지 URL 변환 함수 - 유틸리티 함수 사용
const convertImageUrl = (imageUrl: any): string => {
  return normalizeImageUrl(imageUrl);
};

interface Auction {
  id: number;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  endTime: string;
  status: string;
  seller: {
    username: string;
  };
  bidCount: number;
  participantCount?: number;
  imageUrl?: string;
  images?: string[];
}



interface MainScreenProps {
  navigation: any;
}

export default function MainScreen({ navigation }: MainScreenProps) {
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [endedAuctions, setEndedAuctions] = useState<Auction[]>([]);
  const [hotAuction, setHotAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  // 알림 관련 함수들 (개인화된 알림 관리)
  const loadUserNotifications = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userNotifications = notificationManager.getUserNotifications(user.id);
        setNotifications(userNotifications);
        setUnreadCount(notificationManager.getUserUnreadCount(user.id));
      }
    } catch (error) {
      // console.error('사용자 알림 로드 실패:', error);
    }
  };
  
  // 입찰 폼
  const [bidAmount, setBidAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 스크롤 참조
  const activeScrollRef = useRef<ScrollView>(null);
  const endedScrollRef = useRef<ScrollView>(null);

  // 경매 목록 로드
  const loadAuctions = async () => {
    try {
      setLoading(true);
      const [activeResponse, endedResponse, hotResponse] = await Promise.all([
        auctionAPI.getActiveAuctions(),
        auctionAPI.getEndedAuctions(),
        auctionAPI.getHotAuction()
      ]);
      
      // 활성 경매 처리
      const processedActiveAuctions = (activeResponse || []).map((auction: any) => {
        let images: string[] = [];
        if (auction.images) {
          try {
            images = JSON.parse(auction.images);
          } catch (e) {
            // console.log('이미지 파싱 실패, 단일 이미지로 처리');
            images = [auction.images];
          }
        }
        
        const result = {
          ...auction,
          images: images,
          imageUrl: images.length > 0 ? images[0] : auction.imageUrl,
          participantCount: auction.participantCount || 0
        };
        
        // 디버깅 로그 제거
        
        return result;
      });
      
      // 종료된 경매 처리
      const processedEndedAuctions = (endedResponse || []).map((auction: any) => {
        let images: string[] = [];
        if (auction.images) {
          try {
            images = JSON.parse(auction.images);
          } catch (e) {
            // console.log('이미지 파싱 실패, 단일 이미지로 처리');
            images = [auction.images];
          }
        }
        
        return {
          ...auction,
          images: images,
          imageUrl: images.length > 0 ? images[0] : auction.imageUrl,
          participantCount: auction.participantCount || 0
        };
      });
      
      // 핫한 경매 처리
      let processedHotAuction = null;
      if (hotResponse) {
        // console.log('🔥 핫한 경매 원본 데이터:', hotResponse);
        
        let images: string[] = [];
        if (hotResponse.images) {
          try {
            images = JSON.parse(hotResponse.images);
            // console.log('🔥 핫한 경매 파싱된 이미지 배열:', images);
          } catch (e) {
            // console.log('🔥 핫한 경매 이미지 파싱 실패, 단일 이미지로 처리:', hotResponse.images);
            images = [hotResponse.images];
          }
        }
        
        const finalImageUrl = images.length > 0 ? images[0] : hotResponse.imageUrl;
        // console.log('🔥 핫한 경매 최종 이미지 URL:', finalImageUrl);
        // console.log('🔥 핫한 경매 convertImageUrl 결과:', convertImageUrl(finalImageUrl));
        
        processedHotAuction = {
          ...hotResponse,
          images: images,
          imageUrl: finalImageUrl,
          participantCount: hotResponse.participantCount || 0
        };
        
        // console.log('🔥 핫한 경매 최종 처리된 데이터:', processedHotAuction);
      }
      
      setAuctions(processedActiveAuctions);
      setEndedAuctions(processedEndedAuctions);
      setHotAuction(processedHotAuction);
    } catch (error: any) {
      // console.error('경매 목록 로드 실패:', error);
      // console.error('에러 상세 정보:', {
      //   message: error?.message || '알 수 없는 오류',
      //   stack: error?.stack || '스택 정보 없음',
      //   name: error?.name || 'Error'
      // });
      
      // 더 구체적인 에러 메시지 표시
      let errorMessage = '경매 목록을 불러올 수 없습니다.';
      if (error?.message?.includes('경매를 찾을 수 없습니다')) {
        errorMessage = '현재 등록된 경매가 없습니다.';
      } else if (error?.message?.includes('서버')) {
        errorMessage = '서버 연결에 실패했습니다.';
      } else if (error?.message?.includes('네트워크')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };



  // 검색 기능
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // 실제 검색 로직은 나중에 구현
    // console.log('검색어:', query);
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuctions();
    setRefreshing(false);
  };

  // 컴포넌트 마운트 시 경매 목록 로드
  useEffect(() => {
    loadAuctions();
    
    // 알림 매니저 리스너 등록
    const unsubscribe = notificationManager.addListener((notifications) => {
      setNotifications(notifications);
      setUnreadCount(notificationManager.getUnreadCount());
    });
    
    // 테스트용 알림 추가 (앱 시작 시, 한 번만)
    // AsyncStorage에서 이미 추가했는지 확인
    const checkAndAddTestNotifications = async () => {
      try {
        const hasAddedTestNotifications = await AsyncStorage.getItem('hasAddedTestNotifications');
        
        if (!hasAddedTestNotifications && notifications.length === 0) {
          notificationManager.addNotification(
            'DY Auction에 오신 것을 환영합니다!',  // p0
            '경매 등록, 입찰, 알림 등 다양한 기능을 이용해보세요.',  // p1
            'info',  // p2
            {        // notification 객체
              title: 'DY Auction에 오신 것을 환영합니다!',
              message: '경매 등록, 입찰, 알림 등 다양한 기능을 이용해보세요.',
            }
          );
          
          // 추가 테스트 알림
          setTimeout(() => {
            notificationManager.addNotification(
              '새로운 경매가 등록되었습니다!',  // p0
              '관심 있는 상품이 있다면 지금 확인해보세요.',  // p1
              'success',  // p2
              {           // notification 객체
                title: '새로운 경매가 등록되었습니다!',
                message: '관심 있는 상품이 있다면 지금 확인해보세요.',
              }
            );
          }, 1000);
          
          // 플래그 저장
          await AsyncStorage.setItem('hasAddedTestNotifications', 'true');
        }
      } catch (error) {
        // console.error('테스트 알림 추가 실패:', error);
      }
    };
    
    checkAndAddTestNotifications();
    
    // 개발 중에만 사용: 알림 데이터 초기화 (필요시 주석 해제)
    // AsyncStorage.removeItem('notifications');
    // AsyncStorage.removeItem('hasAddedTestNotifications');
    
    return unsubscribe;
  }, []);

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



  // 입찰
  const handleBid = async () => {
    if (!selectedAuction || !bidAmount.trim()) return;

    const amount = parseFloat(bidAmount);
    if (amount <= selectedAuction.currentPrice) {
      Alert.alert('오류', '현재 가격보다 높은 금액을 입력해주세요.');
      return;
    }

    try {
      await auctionAPI.createBid(selectedAuction.id.toString(), amount, 'YOUR_TOKEN_HERE'); // TODO: 실제 토큰 사용
      
      // 알림 추가
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        notificationManager.addBidPlacedNotification(user.id, selectedAuction.id, amount);
      }
      
      Alert.alert('성공', '입찰이 완료되었습니다.');
      setBidModalVisible(false);
      setBidAmount('');
      setSelectedAuction(null);
      loadAuctions();
    } catch (error) {
      // console.error('입찰 실패:', error);
      Alert.alert('오류', '입찰에 실패했습니다.');
    }
  };

  // 경매 상태에 따른 칩 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'ended': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  // 경매 상태 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중';
      case 'ended': return '종료됨';
      case 'pending': return '대기중';
      default: return status;
    }
  };

  // 남은 시간 계산
  const getTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return '종료됨';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  // 스크롤 함수
  const scrollToDirection = (direction: 'left' | 'right', scrollRef: React.RefObject<ScrollView | null>) => {
    if (scrollRef.current) {
      const scrollAmount = 268; // 카드 너비(220) + 여백(24) + 추가 여백(24)
      scrollRef.current.scrollTo({
        x: direction === 'left' ? -scrollAmount : scrollAmount,
        animated: true,
      });
    }
  };

  // 섹션 헤더 렌더링
  const renderSectionHeader = (title: string, scrollRef: React.RefObject<ScrollView | null> | null) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {scrollRef && (
        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={() => scrollToDirection('left', scrollRef)}>
            <IconButton icon="chevron-left" size={24} iconColor="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToDirection('right', scrollRef)}>
            <IconButton icon="chevron-right" size={24} iconColor="#666" />
          </TouchableOpacity>
        </View>
      )}
        </View>
  );



  // 경매 상세 페이지로 이동
  const handleAuctionPress = (auction: Auction) => {
    // console.log('🔍 경매 클릭:', {
    //   id: auction.id,
    //   title: auction.title,
    //   status: auction.status
    // });
    
    // 모든 상태의 경매에 대해 상세 페이지로 이동 가능
    navigation.navigate('AuctionDetail', { auctionId: auction.id });
  };

  // 일반 경매 아이템 렌더링
  const renderAuctionItem = (item: Auction, isExpired = false) => (
    <TouchableOpacity 
      onPress={() => handleAuctionPress(item)}
      activeOpacity={0.7}
      key={item.id}
    >
      <Card style={styles.auctionItemCard}>
      <View style={styles.auctionItemImageContainer}>
        {isExpired ? (
          <View style={styles.expiredImageContainer}>
            <Card.Cover 
              source={{ uri: convertImageUrl(item.imageUrl) }} 
              style={styles.expiredImage} 
            />
            <View style={styles.expiredOverlay}>
              <Text style={styles.expiredImageText}>종료됨</Text>
            </View>
          </View>
        ) : (
          <Card.Cover 
            source={{ uri: convertImageUrl(item.imageUrl) }} 
            style={styles.auctionItemImage} 
          />
        )}
        
        {/* 이미지 개수 표시 */}
        {!isExpired && item.images && item.images.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountText}>
              {item.images.length}
            </Text>
          </View>
        )}
        
        <View style={[styles.statusBadge, isExpired && styles.expiredBadge]}>
          <Text style={styles.statusBadgeText}>
            {isExpired ? '종료' : getStatusText(item.status)}
          </Text>
        </View>
      </View>
      <Card.Content style={styles.auctionItemContent}>
        <Text style={styles.auctionItemTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <View style={styles.auctionItemPriceContainer}>
          <Text style={styles.priceLabel}>현재가</Text>
          <Text style={styles.auctionItemCurrentPrice}>
            ₩{item.currentPrice.toLocaleString()}
          </Text>
        </View>
        <View style={styles.auctionItemInfo}>
          <View style={styles.timeInfo}>
            <IconButton icon="clock-outline" size={14} iconColor="#666" />
            <Text style={[styles.auctionItemTimeLeft, isExpired && styles.expiredText]} numberOfLines={1} ellipsizeMode="tail">
              {isExpired ? '종료됨' : getTimeLeft(item.endTime)}
            </Text>
          </View>
          <View style={styles.participantInfo}>
            <IconButton icon="account-group-outline" size={14} iconColor="#666" />
            <Text style={styles.participantCount} numberOfLines={1} ellipsizeMode="tail">
              {item.participantCount || 0}명
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
      </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.statusBarSpacer} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <IconButton icon="gavel" size={48} iconColor="#4A90E2" />
          </View>
          <ActivityIndicator size="large" color="#4A90E2" style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>경매 목록을 불러오는 중...</Text>
          <Text style={styles.loadingSubtext}>잠시만 기다려주세요</Text>
      </View>
    </View>
  );
  }

  // 진행중인 경매와 종료된 경매 분리
  const activeAuctions = auctions.filter(auction => auction.status === 'active');

  return (
    <View style={styles.container}>
      {/* 상단 여백 (시스템 상태바 대응) */}
      <View style={styles.statusBarSpacer} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>DY Auction</Text>
    </View>
        
        <View style={styles.headerCenter}>
          <View style={styles.searchBar}>
            <IconButton icon="magnify" size={20} iconColor="#666" />
            <TextInput
              placeholder="경매 검색..."
              style={styles.searchInput}
              mode="flat"
              dense
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

                <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notificationContainer}
          >
            <IconButton icon="bell-outline" size={20} iconColor="#000" />
            {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {unreadCount > 99 ? '99+' : unreadCount.toString()}
                </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
      </View>

      {/* 메인 콘텐츠 */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {auctions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <IconButton icon="gavel" size={64} iconColor="#ccc" />
      </View>
            <Text style={styles.emptyTitle}>아직 등록된 경매가 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              관리자가 경매를 등록하면 여기에 표시됩니다
            </Text>
    </View>
        ) : (
          <>
        {/* 핫한 경매 */}
        {hotAuction && (
          <View style={styles.hotAuctionSection}>
            <View style={styles.hotAuctionHeader}>
              <Text style={styles.hotAuctionTitle}>🔥 지금 가장 인기있는 경매</Text>
            </View>
            <TouchableOpacity
              style={styles.hotAuctionCard}
              onPress={() => handleAuctionPress(hotAuction)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: convertImageUrl(hotAuction.imageUrl) }}
                style={styles.hotAuctionImage}
                resizeMode="cover"
              />
              
              {/* HOT 배지 */}
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>🔥 HOT</Text>
              </View>
              
              {/* 타이머 배지 */}
              <View style={styles.timerBadge}>
                <Text style={styles.timerBadgeText}>🕒 {getTimeLeft(hotAuction.endTime)}</Text>
          </View>
              
              <View style={styles.hotAuctionContent}>
                <Text style={styles.hotAuctionCardTitle} numberOfLines={2}>
                  {hotAuction.title}
                </Text>
                
                <View style={styles.hotAuctionParticipants}>
                  <Text style={styles.hotAuctionParticipantsText}>
                    👥 {hotAuction.participantCount || 0}명이 입찰 참여중
                  </Text>
        </View>
                
                <View style={styles.hotAuctionPriceSection}>
                  <Text style={styles.hotAuctionPriceLabel}>현재 최고가</Text>
                  <Text style={styles.hotAuctionPrice}>₩{hotAuction.currentPrice.toLocaleString()}</Text>
                </View>
                
                <TouchableOpacity style={styles.bidNowButton}>
                  <Text style={styles.bidNowButtonText}>지금 입찰하기</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 진행중인 경매 */}
        <View style={styles.section}>
              {renderSectionHeader('진행중인 경매', activeAuctions.length > 0 ? activeScrollRef : null)}
              {activeAuctions.length > 0 ? (
          <ScrollView
            ref={activeScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {activeAuctions.map((item) => renderAuctionItem(item))}
          </ScrollView>
              ) : (
                <View style={styles.emptyCardPlaceholder}>
                  <Text style={styles.emptyText}>진행중인 경매가 없습니다</Text>
                </View>
              )}
        </View>

        {/* 종료된 경매 */}
        <View style={styles.section}>
              {renderSectionHeader('종료된 경매', endedAuctions.length > 0 ? endedScrollRef : null)}
              {endedAuctions.length > 0 ? (
          <ScrollView
            ref={endedScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
                  {endedAuctions.map((item) => renderAuctionItem(item, true))}
        </ScrollView>
              ) : (
                <View style={styles.emptyCardPlaceholder}>
                  <Text style={styles.emptyText}>종료된 경매가 없습니다</Text>
        </View>
              )}
            </View>
          </>
        )}
      </ScrollView>



      {/* 커스텀 하단 네비게이션 */}
      <View style={styles.bottomNavContainer}>
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
        <IconButton icon="account" size={24} iconColor="#666" />
        <Text style={styles.navText}>프로필</Text>
      </TouchableOpacity>
    </View>
      </View>



      {/* 입찰 모달 */}
      <Portal>
        <Modal
          visible={bidModalVisible}
          onDismiss={() => setBidModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>입찰하기</Text>
          
          {selectedAuction && (
            <>
              <Text style={styles.bidAuctionTitle}>{selectedAuction.title}</Text>
              <Text style={styles.bidCurrentPrice}>
                현재 가격: ₩{selectedAuction.currentPrice.toLocaleString()}
              </Text>
              
              <Divider style={styles.divider} />
              
              <TextInput
                label="입찰 금액 (원)"
                value={bidAmount}
                onChangeText={setBidAmount}
                style={styles.modalInput}
                mode="outlined"
                keyboardType="numeric"
                placeholder={`${selectedAuction.currentPrice + 1000} 이상`}
              />
            </>
          )}
          
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setBidModalVisible(false)}>
              취소
            </Button>
            <Button mode="contained" onPress={handleBid}>
              입찰
            </Button>
          </View>
        </Modal>
      </Portal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBarSpacer: {
    height: 44, // iOS 상태바 높이
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 14,
    marginLeft: 8,
  },
  headerRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  // 개선된 빈 상태 스타일
  emptyIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  // 개선된 로딩 상태 스타일
  loadingIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyCardPlaceholder: {
    width: 220,
    height: 180,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bottomNavContainer: {
    backgroundColor: '#f5f5f5',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalScroll: {
    paddingLeft: 0,
  },

  auctionItemCard: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 24,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  auctionItemImageContainer: {
    position: 'relative',
  },
  auctionItemImage: {
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  expiredImageContainer: {
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'relative',
  },
  expiredImage: {
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    opacity: 0.3,
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  expiredImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  expiredBadge: {
    backgroundColor: '#6c757d',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  auctionItemContent: {
    padding: 12,
    paddingBottom: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  auctionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    lineHeight: 20,
  },
  auctionItemPriceContainer: {
    marginBottom: 12,
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  auctionItemCurrentPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  auctionItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 0,
    paddingHorizontal: 4,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  auctionItemTimeLeft: {
    marginLeft: 6,
    color: '#7f8c8d',
    fontSize: 12,
    fontWeight: '500',
  },
  participantCount: {
    marginLeft: 6,
    color: '#7f8c8d',
    fontSize: 12,
    fontWeight: '500',
  },
  // 핫한 경매 스타일
  hotAuctionSection: {
    margin: 16,
    marginBottom: 12,
  },
  hotAuctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hotAuctionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    marginLeft: 6,
  },
  hotAuctionCard: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: 'white',
    position: 'relative',
    marginHorizontal: 4,
  },
  hotAuctionImage: {
    width: '100%',
    height: 220,
  },
  hotBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  hotBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  timerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  timerBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  hotAuctionContent: {
    padding: 16,
    backgroundColor: 'white',
  },
  hotAuctionCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 10,
    lineHeight: 24,
  },
  hotAuctionParticipants: {
    marginBottom: 16,
  },
  hotAuctionParticipantsText: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  hotAuctionPriceSection: {
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  hotAuctionPriceLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '500',
  },
  hotAuctionPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
    textAlign: 'center',
  },
  bidNowButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  bidNowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  expiredText: {
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  bidAuctionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  bidCurrentPrice: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 16,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
});
