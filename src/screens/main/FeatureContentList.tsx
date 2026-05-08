import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useGetFeatureContents, TFeatureContentItem } from '@/hooks/api/featurecontent';
import { useAuth } from '@/contexts/AuthContext';
import { isPaidSubscriptionActive } from '@/lib/subscription';
import { Badge } from '@/components/ui/badge';

type Props = { navigation: any; route: { params?: { featureType?: string; featureTitle?: string } } };

export const FeatureContentList = ({ navigation, route }: Props) => {
  const featureType = route?.params?.featureType || 'explanation';
  const featureTitle = route?.params?.featureTitle || 'Feature Content';
  const { user } = useAuth();
  const hasPremium = isPaidSubscriptionActive(user?.subscription);
  const { data, isLoading } = useGetFeatureContents(featureType);
  const items: TFeatureContentItem[] = (data as any)?.data || [];

  const openContent = (item: TFeatureContentItem) => {
    if (item.serviceType === 'PREMIUM' && !hasPremium) {
      navigation.navigate('Plans');
      return;
    }
    if (item.contentURL) {
      navigation.navigate('TopicContent', { topic: { id: item.id, name: item.title, description: item.description, contentURL: item.contentURL, serviceType: item.serviceType, Chapter: item.Chapter, Subject: item.Subject } });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E8' }} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><ChevronLeft size={22} color='#111' /></TouchableOpacity>
        <Text style={s.headerTitle}>{featureTitle}</Text>
      </View>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size='large' color='#F5A623' /></View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{'\ud83d\udcda'}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#92400E' }}>Coming Soon!</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>This content is being prepared. Check back later!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => openContent(item)} style={s.card} activeOpacity={0.7}>
              <View style={s.cardLeft}>
                <View style={s.numBadge}><Text style={s.numText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.description ? <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
                  <View style={s.meta}>
                    <Text style={s.metaText}>{item.Subject?.name}</Text>
                    <Text style={s.metaDot}>{'\u2022'}</Text>
                    <Text style={s.metaText}>{item.Chapter?.name}</Text>
                  </View>
                </View>
              </View>
              <View style={s.cardRight}>
                {item.serviceType === 'PREMIUM' && !hasPremium ? <Lock size={16} color='#92400E' /> : null}
                <View style={[s.typeBadge, item.serviceType === 'FREE' ? s.freeBadge : s.premBadge]}><Text style={[s.typeText, item.serviceType === 'FREE' ? s.freeText : s.premText]}>{item.serviceType}</Text></View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5A623', paddingHorizontal: 18, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(146,64,14,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  numBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: '#9CA3AF' },
  metaDot: { fontSize: 11, color: '#D1D5DB' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freeBadge: { backgroundColor: '#ECFDF5' },
  premBadge: { backgroundColor: '#FEF3C7' },
  typeText: { fontSize: 10, fontWeight: '700' },
  freeText: { color: '#059669' },
  premText: { color: '#92400E' },
});

export default FeatureContentList;