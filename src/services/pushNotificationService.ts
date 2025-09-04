import { Platform, Alert } from 'react-native';
// import * as Notifications from 'expo-notifications';

class PushNotificationService {
  private static instance: PushNotificationService;

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  constructor() {
    this.configure();
  }

  private configure() {
    // Expo Go에서는 푸시 알림을 Alert로 대체
    console.log('푸시 알림 서비스 초기화 (Expo Go 모드)');
  }

  // 로컬 알림 보내기 (Expo Go에서는 Alert로 대체)
  public async sendLocalNotification(title: string, message: string, data?: any) {
    try {
      // Expo Go에서는 Alert로 알림 표시
      Alert.alert(title, message, [
        { text: '확인', style: 'default' }
      ]);
      console.log(`📱 알림: ${title} - ${message}`);
    } catch (error) {
      console.error('알림 발송 실패:', error);
    }
  }

  // 경매 등록 알림
  public async sendAuctionCreatedNotification(auctionTitle: string) {
    await this.sendLocalNotification(
      '경매 등록 완료',
      `"${auctionTitle}" 경매가 등록되었습니다. 관리자 승인 후 게시됩니다.`,
      { type: 'auction_created', auctionTitle }
    );
  }

  // 경매 승인 알림
  public async sendAuctionApprovedNotification(auctionTitle: string) {
    await this.sendLocalNotification(
      '경매 승인',
      `"${auctionTitle}" 경매가 승인되어 게시되었습니다.`,
      { type: 'auction_approved', auctionTitle }
    );
  }

  // 입찰 알림
  public async sendBidNotification(auctionTitle: string, amount: number) {
    await this.sendLocalNotification(
      '입찰 완료',
      `"${auctionTitle}"에 ${amount.toLocaleString()}원으로 입찰하셨습니다.`,
      { type: 'bid_placed', auctionTitle, amount }
    );
  }

  // 낙찰 알림
  public async sendWinNotification(auctionTitle: string, amount: number) {
    await this.sendLocalNotification(
      '낙찰 축하',
      `"${auctionTitle}" 경매에서 ${amount.toLocaleString()}원으로 낙찰되었습니다!`,
      { type: 'auction_won', auctionTitle, amount }
    );
  }

  // 핫한 경매 알림
  public async sendHotAuctionNotification(auctionTitle: string) {
    await this.sendLocalNotification(
      '🔥 핫한 경매 등장',
      `"${auctionTitle}"이 핫한 경매로 선정되었습니다!`,
      { type: 'hot_auction', auctionTitle }
    );
  }

  // 알림 권한 요청 (Expo Go에서는 항상 true 반환)
  public async requestPermissions() {
    console.log('푸시 알림 권한 요청 (Expo Go 모드 - 항상 허용)');
    return true;
  }

  // 알림 취소 (Expo Go에서는 로그만 출력)
  public async cancelAllNotifications() {
    console.log('모든 알림 취소 (Expo Go 모드)');
  }

  // 특정 알림 취소 (Expo Go에서는 로그만 출력)
  public async cancelNotification(id: string) {
    console.log(`알림 취소: ${id} (Expo Go 모드)`);
  }
}

export default PushNotificationService.getInstance();
