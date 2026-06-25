import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Card, Divider, useTheme, SegmentedButtons, HelperText, IconButton } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, signInAsMock, isMock, toggleMockMode } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'owner' | 'renter' | 'pending' | 'guard') => {
    setError(null);
    setLoading(true);
    await signInAsMock(role);
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          {/* Central Glowing Hexagon */}
          <View style={styles.logoCenterHex}>
            <IconButton 
              icon="hexagon-multiple" 
              iconColor="#00D4AA" 
              size={40} 
              style={{ margin: 0 }} 
            />
          </View>
          {/* Orbiting Connected Nodes */}
          <View style={[styles.logoNode, styles.nodeTL]} />
          <View style={[styles.logoNode, styles.nodeTR]} />
          <View style={[styles.logoNode, styles.nodeBL]} />
          <View style={[styles.logoNode, styles.nodeBR]} />
        </View>
        <Text variant="headlineMedium" style={styles.appName}>SocietySync</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
          Trust, Transparency, and Role-Based Communication
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.cardTitle}>Sign In to Your Society</Text>
          
          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={onNavigateToRegister}
            style={styles.textButton}
          >
            Don't have an account? Register Flat
          </Button>
        </Card.Content>
      </Card>

      {/* Demo / Mock Login Section - Very Premium and helpful for Testing */}
      <Card style={[styles.card, styles.demoCard, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.demoTitle, { color: theme.colors.primary }]}>
            ⚡ Fast-Track Demo Portal
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, textAlign: 'center' }}>
            No Supabase configured? Tap any role to log in instantly with pre-seeded mock data.
          </Text>

          <View style={styles.demoButtonsContainer}>
            <Button
              mode="contained"
              onPress={() => handleQuickLogin('admin')}
              icon="shield-crown"
              buttonColor="#FFD700"
              textColor="#0F0F0F"
              style={styles.demoButton}
              labelStyle={[styles.demoButtonLabel, { fontWeight: 'bold' }]}
            >
              Secretary (Admin)
            </Button>

            <Button
              mode="contained"
              onPress={() => handleQuickLogin('owner')}
              icon="home-key"
              buttonColor="#00D4AA"
              textColor="#0F0F0F"
              style={styles.demoButton}
              labelStyle={[styles.demoButtonLabel, { fontWeight: 'bold' }]}
            >
              Flat Owner (Amit)
            </Button>

            <Button
              mode="contained"
              onPress={() => handleQuickLogin('guard')}
              icon="shield-account"
              buttonColor="#06B6D4"
              textColor="#0F0F0F"
              style={styles.demoButton}
              labelStyle={[styles.demoButtonLabel, { fontWeight: 'bold' }]}
            >
              Security Guard
            </Button>

            <Button
              mode="contained"
              onPress={() => handleQuickLogin('renter')}
              icon="home-account"
              buttonColor="#3B82F6"
              textColor="#FFFFFF"
              style={styles.demoButton}
              labelStyle={[styles.demoButtonLabel, { fontWeight: 'bold' }]}
            >
              Tenant (Suresh)
            </Button>

            <Button
              mode="outlined"
              onPress={() => handleQuickLogin('pending')}
              icon="clock-outline"
              textColor="#FFFFFF"
              style={[styles.demoButton, { flexBasis: '100%', borderColor: '#888888' }]}
              labelStyle={[styles.demoButtonLabel, { fontWeight: 'bold' }]}
            >
              Pending Approval User
            </Button>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.modeToggleContainer}>
            <Text variant="bodySmall" style={{ alignSelf: 'center' }}>
              Backend Mode: <Text style={{ fontWeight: 'bold', color: isMock ? theme.colors.secondary : theme.colors.primary }}>
                {isMock ? 'Demo Mode (Offline)' : 'Supabase Production'}
              </Text>
            </Text>
            <Button 
              compact 
              mode="text" 
              onPress={() => toggleMockMode(!isMock)}
              labelStyle={{ fontSize: 11 }}
            >
              Switch to {isMock ? 'Supabase' : 'Demo'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoCenterHex: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#1E1E1E',
    borderColor: '#00D4AA',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  logoNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D4AA',
    position: 'absolute',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeTL: {
    top: 6,
    left: 6,
  },
  nodeTR: {
    top: 6,
    right: 6,
  },
  nodeBL: {
    bottom: 6,
    left: 6,
  },
  nodeBR: {
    bottom: 6,
    right: 6,
  },
  appName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  textButton: {
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  demoCard: {
    borderRadius: 16,
    elevation: 1,
  },
  demoTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoButton: {
    flexBasis: '48%',
    borderRadius: 8,
  },
  demoButtonLabel: {
    fontSize: 11,
    marginVertical: 4,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
