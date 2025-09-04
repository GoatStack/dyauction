import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import MainScreen from '../screens/MainScreen';
import CreateAuctionScreen from '../screens/CreateAuctionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AuctionDetailScreen from '../screens/AuctionDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';

export type MainTabParamList = {
  Home: undefined;
  CreateAuction: undefined;
  Profile: undefined;
  AuctionDetail: { auctionId: number };
  Notifications: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ChangePassword: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// 프로필 스택 네비게이터
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </ProfileStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingVertical: 8,
          paddingHorizontal: 20,
          height: 80,
        },
        tabBarActiveTintColor: '#333',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={MainScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="home" size={size} iconColor={color} />
          ),
          tabBarLabel: '홈',
          tabBarStyle: { display: 'none' }, // 메인 페이지에서 하단 탭 바 숨기기
        }}
      />
      <Tab.Screen 
        name="CreateAuction" 
        component={CreateAuctionScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={{
              backgroundColor: '#000',
              borderRadius: 30,
              width: 60,
              height: 60,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <IconButton icon="plus" size={28} iconColor="#fff" />
            </View>
          ),
          tabBarLabel: '',
          tabBarStyle: { display: 'none' }, // 경매 등록 페이지에서 하단 탭 바 숨기기
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account" size={size} iconColor={color} />
          ),
          tabBarLabel: '프로필',
          tabBarStyle: { display: 'none' }, // 프로필 페이지에서 하단 탭 바 숨기기
        }}
      />
      <Tab.Screen 
        name="AuctionDetail" 
        component={AuctionDetailScreen}
        options={{
          tabBarButton: () => null, // 탭 바에서 숨기기
          tabBarStyle: { display: 'none' }, // 하단 탭 바 숨기기
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationScreen}
        options={{
          tabBarButton: () => null, // 탭 바에서 숨기기
          tabBarStyle: { display: 'none' }, // 하단 탭 바 숨기기
        }}
      />
    </Tab.Navigator>
  );
}
