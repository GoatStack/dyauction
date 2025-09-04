import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

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
    PushNotification.configure({
      // (required) Called when a remote or local notification is opened or received
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
        
        // process the notification
        if (notification.userInteraction) {
          // 앱이 백그라운드에서 알림을 탭했을 때
          console.log('알림 탭됨:', notification);
        }
      },

      // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function(notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      // default: true
      popInitialNotification: true,

      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotificationsHandler.requestPermissions() later
       * - if you are not using remote notification or do not have Firebase installed, use this:
       *     requestPermissions: Platform.OS === 'ios'
       */
      requestPermissions: Platform.OS === 'ios',
    });

    // 로컬 알림 채널 생성 (Android)
    PushNotification.createChannel(
      {
        channelId: "auction-notifications",
        channelName: "경매 알림",
        channelDescription: "경매 관련 알림을 받습니다",
        playSound: true,
        soundName: "default",
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  }

  // 로컬 알림 보내기
  public sendLocalNotification(title: string, message: string, data?: any) {
    PushNotification.localNotification({
      channelId: "auction-notifications",
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      data: data,
      actions: '["확인", "나중에"]',
    });
  }

  // 경매 등록 알림
  public sendAuctionCreatedNotification(auctionTitle: string) {
    this.sendLocalNotification(
      '경매 등록 완료',
      `"${auctionTitle}" 경매가 등록되었습니다. 관리자 승인 후 게시됩니다.`,
      { type: 'auction_created', auctionTitle }
    );
  }

  // 경매 승인 알림
  public sendAuctionApprovedNotification(auctionTitle: string) {
    this.sendLocalNotification(
      '경매 승인',
      `"${auctionTitle}" 경매가 승인되어 게시되었습니다.`,
      { type: 'auction_approved', auctionTitle }
    );
  }

  // 입찰 알림
  public sendBidNotification(auctionTitle: string, amount: number) {
    this.sendLocalNotification(
      '입찰 완료',
      `"${auctionTitle}"에 ${amount.toLocaleString()}원으로 입찰하셨습니다.`,
      { type: 'bid_placed', auctionTitle, amount }
    );
  }

  // 낙찰 알림
  public sendWinNotification(auctionTitle: string, amount: number) {
    this.sendLocalNotification(
      '낙찰 축하',
      `"${auctionTitle}" 경매에서 ${amount.toLocaleString()}원으로 낙찰되었습니다!`,
      { type: 'auction_won', auctionTitle, amount }
    );
  }

  // 핫한 경매 알림
  public sendHotAuctionNotification(auctionTitle: string) {
    this.sendLocalNotification(
      '🔥 핫한 경매 등장',
      `"${auctionTitle}"이 핫한 경매로 선정되었습니다!`,
      { type: 'hot_auction', auctionTitle }
    );
  }

  // 알림 권한 요청
  public requestPermissions() {
    PushNotification.requestPermissions();
  }

  // 알림 취소
  public cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  // 특정 알림 취소
  public cancelNotification(id: string) {
    PushNotification.cancelLocalNotifications({ id });
  }
}

export default PushNotificationService.getInstance();
