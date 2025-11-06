import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function UpdateLoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>업데이트 중...</Text>
      <Text style={styles.subText}>잠시만 기다려주세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
});
