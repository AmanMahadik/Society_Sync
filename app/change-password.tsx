import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Appbar, TextInput, Button, Text, Card, Snackbar, useTheme, List } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const isRecovery = searchParams.recovery === 'true';
  const theme = useTheme();
  const { user } = useAuth();

  // Inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const passwordsMatch = newPassword === confirmPassword;

  const handleUpdatePassword = async () => {
    if (!user || !user.email) {
      showMsg('Session error. Please log in again.', true);
      return;
    }

    if (!isRecovery && !currentPassword) {
      showMsg('Please enter your current password.', true);
      return;
    }

    if (!isPasswordStrong) {
      showMsg('Please meet all password strength requirements.', true);
      return;
    }

    if (!passwordsMatch) {
      showMsg('New password and confirm password do not match.', true);
      return;
    }

    setLoading(true);

    try {
      // 1. Verify current password by signing in (only if not in recovery mode)
      if (!isRecovery) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          showMsg('Verification failed: Current password is incorrect.', true);
          setLoading(false);
          return;
        }
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      showMsg('Password updated successfully.', false);
      
      // Clear inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Navigate back after a short delay
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }, 2000);

    } catch (err: any) {
      showMsg(err.message || 'An error occurred while updating the password.', true);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg: string, isError: boolean) => {
    setSnackbar({ visible: true, message: msg, error: isError });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Change Password" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.primary }]}>
              Secure Password Update
            </Text>
            
            {/* Current Password */}
            {!isRecovery && (
              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                right={
                  <TextInput.Icon 
                    icon={showCurrent ? "eye-off" : "eye"} 
                    onPress={() => setShowCurrent(!showCurrent)} 
                  />
                }
                mode="outlined"
                style={styles.input}
              />
            )}

            {/* New Password */}
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              right={
                <TextInput.Icon 
                  icon={showNew ? "eye-off" : "eye"} 
                  onPress={() => setShowNew(!showNew)} 
                />
              }
              mode="outlined"
              style={styles.input}
            />

            {/* Confirm Password */}
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              right={
                <TextInput.Icon 
                  icon={showConfirm ? "eye-off" : "eye"} 
                  onPress={() => setShowConfirm(!showConfirm)} 
                />
              }
              mode="outlined"
              style={styles.input}
              error={confirmPassword.length > 0 && !passwordsMatch}
            />

            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Passwords do not match
              </Text>
            )}

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleUpdatePassword}
              loading={loading}
              disabled={loading || (!isRecovery && !currentPassword) || !newPassword || !confirmPassword || !passwordsMatch || !isPasswordStrong}
              style={[styles.button, { marginTop: 24 }]}
              buttonColor={theme.colors.primary}
            >
              Update Password
            </Button>
          </Card.Content>
        </Card>

        {/* Password Strength Indicator */}
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.primary }]}>
              Password Strength Requirements
            </Text>
            
            <List.Item
              title="At least 8 characters"
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={hasMinLength ? "check-circle" : "close-circle"} 
                  color={hasMinLength ? '#10B981' : theme.colors.error} 
                />
              )}
              titleStyle={styles.requirementText}
            />
            <List.Item
              title="At least one uppercase letter (A-Z)"
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={hasUppercase ? "check-circle" : "close-circle"} 
                  color={hasUppercase ? '#10B981' : theme.colors.error} 
                />
              )}
              titleStyle={styles.requirementText}
            />
            <List.Item
              title="At least one lowercase letter (a-z)"
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={hasLowercase ? "check-circle" : "close-circle"} 
                  color={hasLowercase ? '#10B981' : theme.colors.error} 
                />
              )}
              titleStyle={styles.requirementText}
            />
            <List.Item
              title="At least one number (0-9)"
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={hasNumber ? "check-circle" : "close-circle"} 
                  color={hasNumber ? '#10B981' : theme.colors.error} 
                />
              )}
              titleStyle={styles.requirementText}
            />
            <List.Item
              title="At least one special character (!@#...)"
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={hasSpecialChar ? "check-circle" : "close-circle"} 
                  color={hasSpecialChar ? '#10B981' : theme.colors.error} 
                />
              )}
              titleStyle={styles.requirementText}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: snackbar.error ? theme.colors.error : '#10B981' }}
        action={{
          label: 'OK',
          onPress: () => setSnackbar({ ...snackbar, visible: false }),
          textColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{snackbar.message}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
    marginBottom: 8,
    fontWeight: '600',
  },
  requirementText: {
    fontSize: 14,
  },
});
