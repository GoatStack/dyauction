import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  IconButton,
  Button,
  TextInput,
  Divider,
  ActivityIndicator,
  Modal,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { notificationManager } from '../utils/notificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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
    id?: number;
  };
  bidCount: number;
  imageUrl?: string;
  images?: string[];
}

interface RouteParams {
  auctionId: number;
}

export default function AuctionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { auctionId } = route.params as RouteParams;
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isBidding, setIsBidding] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [showBidHistoryModal, setShowBidHistoryModal] = useState(false);
  const [realTimeData, setRealTimeData] = useState({
    currentPrice: 0,
    bidCount: 0,
    lastBidTime: null as Date | null,
    participants: 0,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnAuction, setIsOwnAuction] = useState(false);

  useEffect(() => {
    loadAuctionDetail();
    loadCurrentUser();
  }, [auctionId]);

  useEffect(() => {
    if (auction) {
      // 슬라이더 값이 0이거나 설정되지 않은 경우에만 초기화
      if (sliderValue === 0) {
        const minBid = realTimeData.currentPrice > 0 ? realTimeData.currentPrice + 1000 : auction.currentPrice + 1000;
        setSliderValue(minBid);
        setBidAmount(minBid.toString());
      }
      
      // 실시간 데이터가 없으면 초기화
      if (realTimeData.currentPrice === 0) {
        setRealTimeData({
          currentPrice: auction.currentPrice,
          bidCount: auction.bidCount,
          lastBidTime: null, // 입찰이 없으면 null로 설정
          participants: auction.bidCount,
        });
      }
    }
  }, [auction]); // realTimeData.currentPrice 의존성 제거

  // 실시간 업데이트 타이머 설정
  useEffect(() => {
    if (!auction || auction.status !== 'active') return;
    
    const interval = setInterval(async () => {
      // 실제 API 호출로 최신 데이터 가져오기
      try {
        const response = await fetch(`http://192.168.0.36:3000/api/auctions/${auctionId}`);
        if (response.ok) {
          const auctionData = await response.json();
          const bids = auctionData.bids || [];
          
                  // 실시간 데이터 업데이트
        setRealTimeData(prev => {
          const newData = {
            currentPrice: auctionData.current_price,
            bidCount: bids.length,
            lastBidTime: bids.length > 0 ? new Date(bids[0].created_at) : prev.lastBidTime,
            participants: auctionData.participantCount || 0,
          };
          
          // 가격이 변경되었을 때만 로그 출력
          if (prev.currentPrice !== newData.currentPrice) {
            console.log(`[실시간 업데이트] 경매 ID: ${auctionId}, 새로운 현재가: ${newData.currentPrice}, 입찰 수: ${newData.bidCount}, 참여자 수: ${newData.participants}, 마지막 입찰 시간: ${newData.lastBidTime}`);
          }
          
          return newData;
        });
          
          // 입찰 내역 업데이트
          setBidHistory(bids);
          
          // 경매 정보 업데이트
          setAuction(prev => prev ? {
            ...prev,
            currentPrice: auctionData.current_price,
            bidCount: bids.length,
          } : null);
        }
      } catch (error) {
        console.log('실시간 업데이트 실패:', error);
      }
    }, 1000); // 1초마다 업데이트
    
    return () => clearInterval(interval);
  }, [auction, auctionId]);

  // 하단 탭 바 숨김/표시
  useFocusEffect(
    React.useCallback(() => {
      // 경매 상세 페이지에 포커스될 때 하단 탭 바 숨기기
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }

      // 페이지에서 벗어날 때 하단 탭 바 다시 표시
      return () => {
        if (parent) {
          parent.setOptions({
            tabBarStyle: { display: 'flex' }
          });
        }
      };
    }, [navigation])
  );

  const loadAuctionDetail = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출
      const response = await fetch(`http://192.168.0.36:3000/api/auctions/${auctionId}`);
      
      if (response.ok) {
        const auctionData = await response.json();
        
        // 이미지 배열 처리
        let images: string[] = [];
        if (auctionData.images) {
          try {
            images = JSON.parse(auctionData.images);
          } catch (e) {
            console.log('이미지 파싱 실패, 단일 이미지로 처리');
            images = [auctionData.images];
          }
        }
        
        // 입찰 내역 처리
        const bids = auctionData.bids || [];
        const bidCount = bids.length;
        
        const formattedAuction: Auction = {
          id: auctionData.id,
          title: auctionData.title,
          description: auctionData.description,
          startingPrice: auctionData.starting_price,
          currentPrice: auctionData.current_price,
          endTime: auctionData.end_time,
          status: auctionData.status,
          seller: { 
            username: auctionData.seller_name || '판매자',
            id: auctionData.seller_id
          },
          bidCount: bidCount,
          imageUrl: auctionData.imageUrl || 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음',
          images: images,
        };
        
        // 실시간 데이터 업데이트
        setRealTimeData({
          currentPrice: auctionData.current_price,
          bidCount: bidCount,
          lastBidTime: bids.length > 0 ? new Date(bids[0].created_at) : null,
          participants: auctionData.participantCount || 0,
        });
        
        // 입찰 내역 저장
        setBidHistory(bids);
        
        setAuction(formattedAuction);
        
        // 현재 사용자와 판매자 비교
        await checkOwnership();
      } else {
        // API 실패 시 목업 데이터 사용
        const mockAuction: Auction = {
          id: auctionId,
          title: '테스트 경매 상품',
          description: '이것은 테스트 경매 상품입니다. 상품에 대한 자세한 설명이 여기에 들어갑니다.',
          startingPrice: 10000,
          currentPrice: 15000,
          endTime: '2024-12-31 23:59:00',
          status: 'active',
          seller: { username: '판매자' },
          bidCount: 5,
          imageUrl: 'https://via.placeholder.com/400x300/cccccc/666666?text=경매+이미지',
          images: [
            'https://via.placeholder.com/400x300/cccccc/666666?text=이미지1',
            'https://via.placeholder.com/400x300/dddddd/666666?text=이미지2',
            'https://via.placeholder.com/400x300/eeeeee/666666?text=이미지3',
          ],
        };
        
        setAuction(mockAuction);
      }
    } catch (error) {
      console.error('경매 상세 정보 로드 실패:', error);
      Alert.alert('오류', '경매 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

  const checkOwnership = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData && auction) {
        const user = JSON.parse(userData);
        setIsOwnAuction(user.id === auction.seller?.id);
      }
    } catch (error) {
      console.error('Check ownership error:', error);
    }
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setBidAmount(value.toString());
  };

  // 실시간 경매 데이터 업데이트
  const updateRealTimeData = async () => {
    if (!auction || auction.status !== 'active') return;
    
    try {
      // 실제 API 호출로 대체 예정
      // const response = await fetch(`/api/auctions/${auction.id}/realtime`);
      // const data = await response.json();
      
      // 임시로 랜덤 데이터 생성 (실제로는 API에서 받아옴)
      const mockUpdate = {
        currentPrice: auction.currentPrice + Math.floor(Math.random() * 1000) * 1000,
        bidCount: auction.bidCount + Math.floor(Math.random() * 3),
        lastBidTime: realTimeData.lastBidTime, // 기존 마지막 입찰 시간 유지
        participants: auction.bidCount + Math.floor(Math.random() * 2),
      };
      
      setRealTimeData(mockUpdate);
      
      // 경매 정보도 업데이트
      if (mockUpdate.currentPrice > auction.currentPrice) {
        setAuction(prev => prev ? {
          ...prev,
          currentPrice: mockUpdate.currentPrice,
          bidCount: mockUpdate.bidCount,
        } : null);
        
        // 슬라이더 값은 사용자가 설정한 값을 유지 (자동 초기화하지 않음)
      }
    } catch (error) {
      console.error('실시간 데이터 업데이트 실패:', error);
    }
  };

  const handleBid = async () => {
    if (!bidAmount.trim()) {
      Alert.alert('오류', '입찰 금액을 입력해주세요.');
      return;
    }

    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount <= realTimeData.currentPrice) {
      Alert.alert('오류', `현재가 ₩${realTimeData.currentPrice.toLocaleString()}보다 높은 금액을 입력해주세요.`);
      return;
    }

    try {
      setIsBidding(true);
      
      // 실제 입찰 API 호출
      const token = (global as any).token;
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`http://192.168.0.36:3000/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // 입찰 성공 로그
        console.log(`[입찰 성공] 경매: ${auction.title}, 금액: ${amount}, 새로운 현재가: ${result.newCurrentPrice}`);
        
        // 입찰 성공 알림 추가
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          notificationManager.addBidPlacedNotification(user.id, auction.id, amount);
        }
        
        // 실시간 데이터 즉시 업데이트
        setRealTimeData(prev => ({
          ...prev,
          currentPrice: result.newCurrentPrice,
          bidCount: result.bidCount,
          participants: result.participantCount,
          lastBidTime: result.lastBidTime ? new Date(result.lastBidTime) : prev.lastBidTime,
        }));
        
        // 경매 정보 즉시 업데이트
        setAuction(prev => prev ? {
          ...prev,
          currentPrice: result.newCurrentPrice,
          bidCount: result.bidCount,
        } : null);
        
        // 입찰 성공 후 슬라이더 값을 새로운 최소 입찰가로 설정
        const newMinBid = result.newCurrentPrice + 1000;
        setSliderValue(newMinBid);
        setBidAmount(newMinBid.toString());
        
        Alert.alert('성공', '입찰이 완료되었습니다!');
        
        // 입찰 내역 새로고침
        loadAuctionDetail();
      } else {
        const errorData = await response.json();
        Alert.alert('오류', errorData.message || '입찰에 실패했습니다.');
      }
    } catch (error) {
      console.error('입찰 실패:', error);
      Alert.alert('오류', '입찰에 실패했습니다.');
    } finally {
      setIsBidding(false);
    }
  };

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

  // 이미지 슬라이더 렌더링
  const renderImageSlider = () => {
    const isEnded = auction?.status === 'ended';
    
    if (!auction || !auction.images || auction.images.length === 0) {
      return (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: convertImageUrl(auction?.imageUrl) }}
            style={[styles.auctionImage, isEnded && styles.blurredImage]}
            resizeMode="cover"
          />
          {isEnded && (
            <View style={styles.blurOverlay}>
              <Text style={styles.endedOverlayText}>종료됨</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.imageSliderContainer}>
        <FlatList
          ref={flatListRef}
          data={auction.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: convertImageUrl(item) }}
                style={[styles.auctionImage, isEnded && styles.blurredImage]}
                resizeMode="cover"
              />
              {isEnded && (
                <View style={styles.blurOverlay}>
                  <Text style={styles.endedOverlayText}>종료됨</Text>
                </View>
              )}
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
        
        {/* 이미지 인디케이터 */}
        {auction.images.length > 1 && (
          <View style={styles.imageIndicator}>
            <Text style={styles.imageIndicatorText}>
              {currentImageIndex + 1} / {auction.images.length}
            </Text>
          </View>
        )}
        
        {/* 이전/다음 버튼 */}
        {auction.images.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={() => {
                  const newIndex = currentImageIndex - 1;
                  setCurrentImageIndex(newIndex);
                  flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                }}
              >
                <IconButton icon="chevron-left" size={24} iconColor="#fff" />
              </TouchableOpacity>
            )}
            
            {currentImageIndex < auction.images.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => {
                  const newIndex = currentImageIndex + 1;
                  setCurrentImageIndex(newIndex);
                  flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
                }}
              >
                <IconButton icon="chevron-right" size={24} iconColor="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>경매 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>경매 정보를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <IconButton icon="arrow-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>경매 상세</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 상품 이미지 */}
        <Card style={styles.imageCard}>
          {renderImageSlider()}
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {auction.status === 'active' ? '진행중' : '종료됨'}
            </Text>
          </View>
        </Card>

        {/* 상품 정보 */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.productTitle}>{auction.title}</Text>
            <Text style={styles.productDescription}>{auction.description}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>시작가</Text>
              <Text style={styles.startingPrice}>₩{auction.startingPrice.toLocaleString()}</Text>
            </View>
            
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>현재가</Text>
              <Text style={styles.currentPrice}>₩{realTimeData.currentPrice.toLocaleString()}</Text>
              {auction.status === 'active' && (
                <View style={styles.realTimeIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>실시간</Text>
                </View>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <IconButton icon="clock-outline" size={16} iconColor="#666" />
                <Text style={styles.infoText}>{getTimeLeft(auction.endTime)}</Text>
              </View>
              <View style={styles.infoItem}>
                <IconButton icon="account-group-outline" size={16} iconColor="#666" />
                <Text style={styles.infoText}>{auction.bidCount}명 참여</Text>
              </View>
            </View>
            
            {/* 실시간 입찰 알림 */}
            {auction.status === 'active' && realTimeData.lastBidTime && (
              <View style={styles.realTimeBidInfo}>
                <View style={styles.lastBidIndicator}>
                  <IconButton icon="gavel" size={16} iconColor="#4CAF50" />
                  <Text style={styles.lastBidText}>
                    마지막 입찰: {realTimeData.lastBidTime.toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.participantsInfo}>
                  <IconButton icon="account-multiple" size={16} iconColor="#FF9800" />
                  <Text style={styles.participantsText}>
                    {realTimeData.participants}명이 참여중
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>판매자</Text>
              <Text style={styles.sellerName}>{auction.seller.username}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* 입찰 섹션 */}
        {auction.status === 'active' && (
          <Card style={styles.bidCard}>
            <Card.Content>
              <Text style={styles.bidTitle}>입찰하기</Text>
              
              {/* 현재가 표시 */}
              <View style={styles.currentPriceDisplay}>
                <Text style={styles.currentPriceLabel}>현재가</Text>
                <Text style={styles.currentPriceValue}>₩{realTimeData.currentPrice.toLocaleString()}</Text>
              </View>
              
              {/* 슬라이더 */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  입찰 금액: ₩{sliderValue.toLocaleString()}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={realTimeData.currentPrice + 1000}
                  maximumValue={realTimeData.currentPrice + 50000}
                  step={1000}
                  value={Math.max(sliderValue, realTimeData.currentPrice + 1000)}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor="#4A90E2"
                  maximumTrackTintColor="#e0e0e0"
                  thumbStyle={styles.sliderThumb}
                />
                <View style={styles.sliderRange}>
                  <Text style={styles.sliderMin}>₩{(realTimeData.currentPrice + 1000).toLocaleString()}</Text>
                  <Text style={styles.sliderMax}>₩{(realTimeData.currentPrice + 50000).toLocaleString()}</Text>
                </View>
              </View>
              
              {/* 입찰 버튼 */}
              {isOwnAuction ? (
                <View style={styles.ownAuctionMessage}>
                  <Text style={styles.ownAuctionText}>
                    자신이 등록한 경매에는 입찰할 수 없습니다
                  </Text>
                </View>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleBid}
                  loading={isBidding}
                  disabled={isBidding}
                  style={styles.bidButton}
                >
                  ₩{sliderValue.toLocaleString()}로 입찰하기
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* 종료된 경매 정보 */}
        {auction && auction.status === 'ended' && (
          <Card style={styles.endedCard}>
            <Card.Content>
              <View style={styles.endedHeader}>
                <IconButton icon="clock-outline" size={24} iconColor="#F44336" />
                <Text style={styles.endedTitle}>경매가 종료되었습니다</Text>
              </View>
              <View style={styles.endedInfo}>
                <Text style={styles.endedLabel}>최종 낙찰가</Text>
                <Text style={styles.endedPrice}>₩{auction.currentPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.endedInfo}>
                <Text style={styles.endedLabel}>총 입찰 수</Text>
                <Text style={styles.endedValue}>{auction.bidCount}건</Text>
              </View>
              <View style={styles.endedInfo}>
                <Text style={styles.endedLabel}>참여자 수</Text>
                <Text style={styles.endedValue}>{auction.participantCount || 0}명</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* 입찰 내역 버튼 */}
        {auction && bidHistory.length > 0 && (
          <Card style={styles.bidHistoryButtonCard}>
            <Card.Content>
              <TouchableOpacity 
                style={styles.bidHistoryButton}
                onPress={() => setShowBidHistoryModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.bidHistoryButtonContent}>
                  <View style={styles.bidHistoryButtonInfo}>
                    <Text style={styles.bidHistoryButtonTitle}>입찰 내역</Text>
                    <Text style={styles.bidHistoryButtonSubtitle}>
                      총 {bidHistory.length}건의 입찰
                    </Text>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={24}
                    iconColor="#666"
                  />
                </View>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* 입찰 내역 팝업 모달 */}
      <Modal
        visible={showBidHistoryModal}
        onDismiss={() => setShowBidHistoryModal(false)}
        contentContainerStyle={styles.bidHistoryModal}
      >
        <View style={styles.bidHistoryModalHeader}>
          <Text style={styles.bidHistoryModalTitle}>입찰 내역</Text>
          <IconButton
            icon="close"
            size={24}
            iconColor="#666"
            onPress={() => setShowBidHistoryModal(false)}
          />
        </View>
        
        <ScrollView style={styles.bidHistoryModalContent} showsVerticalScrollIndicator={false}>
          {bidHistory.map((bid, index) => (
            <View key={bid.id || index} style={styles.bidHistoryModalItem}>
              <View style={styles.bidHistoryModalInfo}>
                <Text style={styles.bidHistoryModalBidder}>
                  {bid.bidder_name || '익명'}
                </Text>
                <Text style={styles.bidHistoryModalTime}>
                  {new Date(bid.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.bidHistoryModalAmount}>
                ₩{bid.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
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
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 48,
  },
  content: {
    flex: 1,
  },
  imageCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  productImage: {
    height: 300,
    borderRadius: 12,
  },
  // 이미지 슬라이더 스타일
  imageSliderContainer: {
    position: 'relative',
    height: 300,
  },
  imageContainer: {
    width: width - 32, // 카드 패딩 제외
    height: 300,
  },
  auctionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  // 입찰 내역 스타일
  bidHistoryCard: {
    margin: 16,
    marginTop: 8,
  },
  bidHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  bidHistoryList: {
    gap: 12,
  },
  bidHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bidHistoryInfo: {
    flex: 1,
  },
  bidHistoryBidder: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  bidHistoryTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bidHistoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  bidHistoryMore: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // 입찰 내역 버튼 스타일
  bidHistoryButtonCard: {
    margin: 16,
    marginTop: 8,
  },
  bidHistoryButton: {
    borderRadius: 8,
  },
  bidHistoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidHistoryButtonInfo: {
    flex: 1,
  },
  bidHistoryButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bidHistoryButtonSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  // 입찰 내역 팝업 모달 스타일
  bidHistoryModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: height * 0.7,
    minHeight: height * 0.4,
  },
  bidHistoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bidHistoryModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bidHistoryModalContent: {
    flex: 1,
    padding: 16,
  },
  bidHistoryModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bidHistoryModalInfo: {
    flex: 1,
  },
  bidHistoryModalBidder: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  bidHistoryModalTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bidHistoryModalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  // 종료된 경매 스타일
  endedCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  endedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  endedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  endedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  endedLabel: {
    fontSize: 14,
    color: '#666',
  },
  endedPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
  },
  endedValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  // 블러 효과 스타일
  blurredImage: {
    opacity: 0.3,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedOverlayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  startingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  sellerInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sellerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bidCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  bidTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  bidInputContainer: {
    gap: 16,
  },
  bidInput: {
    backgroundColor: 'white',
  },
  bidButton: {
    marginTop: 16,
  },
  // 슬라이더 관련 스타일
  currentPriceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  currentPriceLabel: {
    fontSize: 16,
    color: '#666',
  },
  currentPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4A90E2',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderMin: {
    fontSize: 12,
    color: '#666',
  },
  sliderMax: {
    fontSize: 12,
    color: '#666',
  },
  // 실시간 관련 스타일
  realTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '600',
  },
  realTimeBidInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  lastBidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastBidText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  ownAuctionMessage: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFB74D',
    alignItems: 'center',
  },
  ownAuctionText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
