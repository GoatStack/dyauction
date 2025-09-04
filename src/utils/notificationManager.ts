import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationService from '../services/pushNotificationService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  userId?: number;
  auctionId?: number;
  category: 'personal' | 'general' | 'auction' | 'bid' | 'approval' | 'win';
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private readonly STORAGE_KEY = 'notifications';

  constructor() {
    this.loadNotifications();
  }

  private async loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
    } catch (error) {
      console.error('알림 로드 실패:', error);
    }
  }

  private async saveNotifications() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('알림 저장 실패:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  addListener(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false
    };

    // 중복 체크 (같은 제목과 메시지가 있는지 확인)
    const isDuplicate = this.notifications.some(n => 
      n.title === newNotification.title && 
      n.message === newNotification.message &&
      Math.abs(n.timestamp.getTime() - newNotification.timestamp.getTime()) < 5000 // 5초 내
    );

    if (!isDuplicate) {
      this.notifications.unshift(newNotification);
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  addPersonalNotification(
    title: string, 
    message: string, 
    userId: number, 
    auctionId?: number, 
    category: 'personal' | 'general' | 'auction' | 'bid' | 'approval' | 'win' = 'personal'
  ) {
    this.addNotification({
      title,
      message,
      userId,
      auctionId,
      category
    });
  }

  addUserNotification(userId: number, title: string, message: string) {
    this.addPersonalNotification(title, message, userId, undefined, 'personal');
  }

  addAuctionNotification(userId: number, auctionId: number, title: string, message: string) {
    this.addPersonalNotification(title, message, userId, auctionId, 'auction');
  }

  addBidNotification(userId: number, auctionId: number, title: string, message: string) {
    this.addPersonalNotification(title, message, userId, auctionId, 'bid');
  }

  addBidPlacedNotification(userId: number, auctionId: number, bidAmount: number) {
    this.addBidNotification(
      userId, 
      auctionId, 
      '입찰 완료', 
      `${bidAmount.toLocaleString()}원으로 입찰하셨습니다.`
    );
    
    // 푸시 알림도 함께 발송 (경매 제목은 나중에 추가)
    PushNotificationService.sendBidNotification('경매', bidAmount).catch(error => {
      console.error('푸시 알림 발송 실패:', error);
    });
  }

  addAuctionCreatedNotification(userId: number, auctionTitle: string) {
    this.addAuctionNotification(
      userId,
      0, // auctionId는 아직 없으므로 0으로 설정
      '경매 등록 완료',
      `"${auctionTitle}" 경매가 등록되었습니다. 관리자 승인 후 게시됩니다.`
    );
    
    // 푸시 알림도 함께 발송
    PushNotificationService.sendAuctionCreatedNotification(auctionTitle).catch(error => {
      console.error('푸시 알림 발송 실패:', error);
    });
  }

  addApprovalNotification(userId: number, auctionId: number, title: string, message: string) {
    this.addPersonalNotification(title, message, userId, auctionId, 'approval');
    
    // 푸시 알림도 함께 발송
    PushNotificationService.sendAuctionApprovedNotification(title).catch(error => {
      console.error('푸시 알림 발송 실패:', error);
    });
  }

  addWinNotification(userId: number, auctionId: number, title: string, message: string) {
    this.addPersonalNotification(title, message, userId, auctionId, 'win');
    
    // 푸시 알림도 함께 발송 (금액 추출)
    const amountMatch = message.match(/(\d+(?:,\d{3})*)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : 0;
    PushNotificationService.sendWinNotification(title, amount).catch(error => {
      console.error('푸시 알림 발송 실패:', error);
    });
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();
    this.notifyListeners();
  }

  removeNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getUserUnreadCount(userId: number): number {
    return this.notifications.filter(n => !n.isRead && n.userId === userId).length;
  }

  getUserNotifications(userId: number): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  getAllNotifications(): Notification[] {
    return [...this.notifications];
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }
}

export const notificationManager = new NotificationManager();
