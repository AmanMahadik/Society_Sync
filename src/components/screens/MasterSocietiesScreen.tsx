import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export const MasterSocietiesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [societies, setSocieties] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSocieties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSocieties(data || []);
    } catch (e) {
      console.warn('Failed to fetch societies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.society_code.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Societies Directory</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Manage and audit all registered housing societies</Text>
      </View>

      <View style={styles.searchContainer}>
        <RNTextInput
          placeholder="Search by name, code, city..."
          placeholderTextColor={theme.colors.outline}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { 
            backgroundColor: theme.colors.elevation.level1, 
            color: theme.colors.onSurface,
            borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }]}
        />
        {loading && (
          <ActivityIndicator size="small" color="#EF4444" style={styles.loader} />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchSocieties}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', marginVertical: 32, color: theme.colors.outline, fontSize: 13 }}>
              No registered societies found.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Card.Content style={styles.cardContent}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.colors.onSurface }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 4 }}>
                  Code: <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{item.society_code}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 2 }}>
                  Location: {item.city}, {item.state}
                </Text>
              </View>
              <Chip 
                style={{ 
                  height: 22, 
                  justifyContent: 'center', 
                  backgroundColor: item.status === 'active' ? 'rgba(56, 142, 60, 0.15)' : 'rgba(211, 47, 47, 0.15)' 
                }} 
                textStyle={{ 
                  color: item.status === 'active' ? '#388E3C' : '#D32F2F', 
                  fontSize: 9, 
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
              >
                {item.status}
              </Chip>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
    right: 26,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
});
