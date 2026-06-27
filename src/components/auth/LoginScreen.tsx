import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Card, Divider, useTheme, SegmentedButtons, HelperText, IconButton, Portal, Dialog, Snackbar } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    setSnackbarVisible(true);
  };

  const getErrorMessage = (err: any): string => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err.message && typeof err.message === 'string') return err.message;
    return JSON.stringify(err);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      showError(getErrorMessage(signInError));
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    setLoading(false);
    if (googleError) {
      showError(getErrorMessage(googleError));
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      showError('Please enter your email to reset password.');
      return;
    }
    setError(null);
    setResetLoading(true);
    const { error: resetError } = await resetPassword(resetEmail.trim());
    setResetLoading(false);
    if (resetError) {
      showError(getErrorMessage(resetError));
    } else {
      setResetDialogVisible(false);
      setResetEmail('');
      showError('Password reset link sent to your email!');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
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
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error}
              </Text>
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
              mode="text"
              onPress={() => setResetDialogVisible(true)}
              style={styles.forgotPasswordButton}
              labelStyle={{ fontSize: 12 }}
              compact
            >
              Forgot Password?
            </Button>

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

        {/* Forgot Password Dialog */}
        <Portal>
          <Dialog 
            visible={resetDialogVisible} 
            onDismiss={() => setResetDialogVisible(false)}
            style={{ backgroundColor: theme.colors.elevation.level3 }}
          >
            <Dialog.Title style={{ fontWeight: 'bold' }}>Reset Password</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                Enter your registered email address below. We will send you a link to reset your password.
              </Text>
              <TextInput
                label="Email Address"
                value={resetEmail}
                onChangeText={setResetEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                dense
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setResetDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
              <Button 
                onPress={handleResetPassword} 
                loading={resetLoading}
                disabled={resetLoading || !resetEmail.trim()}
                textColor={theme.colors.primary}
                labelStyle={{ fontWeight: 'bold' }}
              >
                Send Reset Link
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>

      {/* Toast Notification Pop-up */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ backgroundColor: theme.colors.errorContainer }}
        action={{
          label: 'OK',
          textColor: theme.colors.onErrorContainer,
          onPress: () => setSnackbarVisible(false),
        }}
      >
        <Text style={{ color: theme.colors.onErrorContainer, fontWeight: '500' }}>
          ⚠️ {error}
        </Text>
      </Snackbar>
    </View>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
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
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 13,
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
