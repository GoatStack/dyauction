import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  IconButton,
  Button,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { notificationManager, Notification } from '../utils/notificationManager';

const { width, height } = Dimensions.get('window');

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 알림 매니저 리스너 등록
    const unsubscribe = notificationManager.addListener((notifications) => {
      console.log('알림 페이지 - 알림 업데이트:', notifications.length);
      setNotifications(notifications);
      setUnreadCount(notificationManager.getUnreadCount());
    });

    // 페이지 진입 시 현재 알림 상태 로드
    const currentNotifications = notificationManager.getNotifications();
    console.log('알림 페이지 - 현재 알림:', currentNotifications.length);
    setNotifications(currentNotifications);
    setUnreadCount(notificationManager.getUnreadCount());

    // 페이지 진입 시 모든 알림을 읽음 처리 (배지 제거)
    notificationManager.markAllAsRead();

    return unsubscribe;
  }, []);

  // 알림 삭제 함수
  const handleDeleteNotification = (notificationId: string) => {
    notificationManager.removeNotification(notificationId);
  };



  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'info': return 'information';
      case 'warning': return 'alert';
      case 'error': return 'alert-circle';
      default: return 'bell';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'info': return '#2196F3';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getTypeText = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '성공';
      case 'info': return '정보';
      case 'warning': return '경고';
      case 'error': return '오류';
      default: return '알림';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#4A90E2"
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>알림</Text>
        </View>
      </View>

      {/* 알림 목록 */}
      <ScrollView style={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconButton icon="bell-off" size={64} iconColor="#ccc" />
            <Text style={styles.emptyTitle}>알림이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              새로운 알림이 오면 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          notifications.map((notification, index) => (
            <View key={notification.id}>
              <View
                style={styles.notificationItem}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationIconContainer}>
                      <IconButton
                        icon={getNotificationIcon(notification.type)}
                        size={20}
                        iconColor={getNotificationColor(notification.type)}
                      />
                    </View>
                    <View style={styles.notificationTextContainer}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={[
                          styles.notificationTitle,
                          !notification.read && styles.unreadText
                        ]} numberOfLines={1}>
                          {notification.title}
                        </Text>
                        <View style={styles.notificationActions}>
                          <View style={[
                            styles.typeBadge,
                            { backgroundColor: getNotificationColor(notification.type) + '20' }
                          ]}>
                            <Text style={[
                              styles.typeBadgeText,
                              { color: getNotificationColor(notification.type) }
                            ]}>
                              {getTypeText(notification.type)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteNotification(notification.id)}
                            style={styles.deleteButton}
                          >
                            <IconButton
                              icon="delete-outline"
                              size={18}
                              iconColor="#ff4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {notification.timestamp.toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                </View>
              </View>
              {index < notifications.length - 1 && (
                <Divider style={styles.divider} />
              )}
            </View>
          ))
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
    marginTop: 8,
  },
  divider: {
    marginLeft: 16,
    backgroundColor: '#f0f0f0',
  },
});
