import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Paragraph,
  Text,
} from 'react-native-paper';


const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🏛️</Text>
            </View>
            <Text style={styles.title}>덕영 옥션</Text>
            <Paragraph style={styles.subtitle}>
              학교 교내 경매 플랫폼
            </Paragraph>
            <Paragraph style={styles.description}>
              안전하고 투명한 교내 경매를 경험해보세요
            </Paragraph>
          </View>



          {/* Action Buttons */}
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
            >
              로그인
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('SignUp')}
              style={styles.signUpButton}
              contentStyle={styles.buttonContent}
            >
              회원가입
            </Button>

            <Text style={styles.footerText}>
              © 2024 덕영 옥션. All rights reserved.
            </Text>
          </View>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',

  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  footer: {
    paddingTop: 20,
  },
  loginButton: {
    marginBottom: 12,
    borderRadius: 25,
  },
  signUpButton: {
    marginBottom: 20,
    borderRadius: 25,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});
