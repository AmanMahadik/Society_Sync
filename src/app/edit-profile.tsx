import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Appbar, TextInput, Button, Text, Avatar, Card, Snackbar, useTheme, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth-context';
import { dataManager } from '../lib/data-manager';
import { supabase, uriToArrayBuffer } from '../lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profile, refreshProfile } = useAuth();

  // Input states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [bio, setBio] = useState('');
  
  // Profile Picture States
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [imagePicked, setImagePicked] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  // Load current profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setWing(profile.wing || '');
      setFlatNumber(profile.flat_number || '');
      setVehicleNumber(profile.vehicle_number || '');
      setBio(profile.bio || '');
      setAvatarUri(profile.google_picture_url || null);
    }
  }, [profile]);

  // Validation
  const isNameValid = fullName.trim().length >= 3;
  const isPhoneValid = /^\d{10}$/.test(phone.trim());
  const isWingValid = wing.trim().length > 0;
  const isFlatValid = flatNumber.trim().length > 0;
  
  const isFormValid = isNameValid && isPhoneValid && isWingValid && isFlatValid;

  // Pick Image Helper
  const handleImagePick = async (useCamera: boolean) => {
    setDialogVisible(false);
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        showMsg('Permission denied. Cannot access camera or gallery.', true);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: (ImagePicker as any).MediaType?.IMAGE || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setImagePicked(true);
      }
    } catch (e) {
      console.error('Image picking error', e);
      showMsg('Failed to select image.', true);
    }
  };

  // Upload Image to Supabase Storage
  const uploadAvatar = async (localUri: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const arrayBuffer = await uriToArrayBuffer(localUri);
      
      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist or permissions fail, throw error
        throw uploadError;
      }

      // Get Public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (e: any) {
      console.error('Storage upload error', e);
      throw new Error('Storage upload failed. Please ensure the "avatars" bucket is created and public in Supabase.');
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) {
      showMsg('Session expired. Please log in again.', true);
      return;
    }

    if (!isFormValid) {
      showMsg('Please correct all validation errors before saving.', true);
      return;
    }

    setLoading(true);
    try {
      let finalAvatarUrl = avatarUri;

      // 1. If a new image was picked, upload it first
      if (imagePicked && avatarUri) {
        try {
          const uploadedUrl = await uploadAvatar(avatarUri);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          showMsg(uploadErr.message || 'Image upload failed. Saving other details...', true);
          // Wait briefly so they can read the warning
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }

      // 2. Update profiles table via DataManager
      await dataManager.updateProfileDetails(
        user.id,
        fullName.trim(),
        phone.trim(),
        flatNumber.trim(),
        wing.trim().toUpperCase(),
        profile.society_name || 'SocietySync Co-Op',
        vehicleNumber.trim() || null,
        bio.trim() || null,
        finalAvatarUrl
      );

      // 3. Refresh Auth Context globally so UI updates everywhere
      await refreshProfile();

      showMsg('Profile updated successfully.', false);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err: any) {
      showMsg(err.message || 'Failed to update profile details.', true);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg: string, isError: boolean) => {
    setSnackbar({ visible: true, message: msg, error: isError });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Edit Profile" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Profile Picture Header Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.avatarCardContent}>
            <TouchableOpacity onPress={() => setDialogVisible(true)} style={styles.avatarTouchable}>
              {avatarUri ? (
                <Avatar.Image size={100} source={{ uri: avatarUri }} />
              ) : (
                <Avatar.Text 
                  size={100} 
                  label={fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SS'} 
                  color={theme.colors.primary}
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
              )}
              <View style={[styles.avatarEditOverlay, { backgroundColor: theme.colors.primary }]}>
                <Avatar.Icon size={24} icon="camera" color="#FFFFFF" style={{ backgroundColor: 'transparent' }} />
              </View>
            </TouchableOpacity>
            <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: 'bold' }}>
              {fullName || 'Your Name'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {profile?.role ? profile.role.toUpperCase() : 'RESIDENT'}
            </Text>
          </Card.Content>
        </Card>

        {/* Input fields card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.primary }]}>
              Personal Details
            </Text>

            {/* Full Name */}
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              error={fullName.length > 0 && !isNameValid}
            />
            {fullName.length > 0 && !isNameValid && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Name must be at least 3 characters
              </Text>
            )}

            {/* Email (Read Only) */}
            <TextInput
              label="Registered Email (Unchangeable)"
              value={user?.email || ''}
              mode="outlined"
              disabled
              style={styles.input}
              left={<TextInput.Icon icon="lock" color={theme.colors.outline} />}
            />

            {/* Mobile Number */}
            <TextInput
              label="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              maxLength={10}
              error={phone.length > 0 && !isPhoneValid}
            />
            {phone.length > 0 && !isPhoneValid && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Phone number must be exactly 10 digits
              </Text>
            )}

            <View style={styles.row}>
              {/* Wing */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput
                  label="Wing"
                  value={wing}
                  onChangeText={setWing}
                  mode="outlined"
                  style={styles.input}
                  maxLength={5}
                  error={wing.length > 0 && !isWingValid}
                />
              </View>
              {/* Flat Number */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <TextInput
                  label="Flat Number"
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  mode="outlined"
                  style={styles.input}
                  maxLength={10}
                  error={flatNumber.length > 0 && !isFlatValid}
                />
              </View>
            </View>

            {/* Vehicle Number */}
            <TextInput
              label="Vehicle Number (e.g. MH-12-AB-1234)"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              mode="outlined"
              style={styles.input}
              maxLength={15}
            />

            {/* Bio */}
            <TextInput
              label="Bio / Status"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={[styles.input, { height: 80 }]}
              maxLength={150}
            />

            {/* Save Button */}
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              loading={loading}
              disabled={loading || !isFormValid}
              style={[styles.button, { marginTop: 16 }]}
              buttonColor={theme.colors.primary}
            >
              Save Changes
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Image Picker Options Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ backgroundColor: theme.colors.elevation.level3 }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Update Profile Picture</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Choose a source for your avatar:</Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => handleImagePick(true)} icon="camera" textColor={theme.colors.primary}>Camera</Button>
            <Button onPress={() => handleImagePick(false)} icon="image-multiple" textColor={theme.colors.primary}>Gallery</Button>
            <Button onPress={() => setDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={4000}
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
  avatarCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 18,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
});
