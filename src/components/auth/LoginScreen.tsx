import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Card, Divider, useTheme, SegmentedButtons, HelperText, IconButton } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, signInWithGoogle } = useAuth();
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

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    setLoading(false);
    if (googleError) {
      setError(googleError);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={styles.brandLogo} 
            resizeMode="contain"
          />
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

          <View style={styles.orContainer}>
            <Divider style={styles.divider} />
            <Text style={[styles.orText, { color: theme.colors.outline }]}>OR</Text>
            <Divider style={styles.divider} />
          </View>

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            loading={loading}
            disabled={loading}
            icon="google"
            textColor={theme.dark ? '#FFFFFF' : theme.colors.onSurface}
            style={[styles.googleButton, { borderColor: theme.colors.outline }]}
            contentStyle={styles.googleButtonContent}
          >
            Sign in with Google
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
  brandLogo: {
    width: 86,
    height: 86,
    borderRadius: 18,
    borderColor: '#00D4AA',
    borderWidth: 1.5,
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
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  googleButton: {
    borderRadius: 8,
    borderWidth: 1,
  },
  googleButtonContent: {
    paddingVertical: 4,
  },
  textButton: {
    marginTop: 12,
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
