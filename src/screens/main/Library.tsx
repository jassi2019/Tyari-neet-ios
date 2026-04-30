import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const Library = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📖 My Library</Text>
        <Text style={styles.subtitle}>Your saved topics, notes & bookmarks</Text>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔖</Text>
          <Text style={styles.cardTitle}>Bookmarks</Text>
          <Text style={styles.cardDesc}>Topics you have bookmarked appear here</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>My Notes</Text>
          <Text style={styles.cardDesc}>Personal notes you have created</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📚</Text>
          <Text style={styles.cardTitle}>NCERT Material</Text>
          <Text style={styles.cardDesc}>NCERT books and quick references</Text>
        </View>

        <View style={styles.empty}>
          <Text style={styles.emptyText}>Coming soon — content will appear once you start studying</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF8E8' },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#777' },
  empty: {
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },
});

export default Library;
