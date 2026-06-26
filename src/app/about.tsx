import React from 'react';
import { StyleSheet, ScrollView, View, Linking } from 'react-native';
import { Appbar, Card, Text, List, Divider, useTheme, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to open URL', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="About Us" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo and Header Section */}
        <View style={styles.logoContainer}>
          <Avatar.Icon
            size={80}
            icon="home-city"
            color={theme.colors.primary}
            style={[styles.logoIcon, { backgroundColor: theme.colors.primaryContainer }]}
          />
          <Text variant="headlineMedium" style={[styles.appName, { color: theme.colors.primary }]}>
            SocietySync
          </Text>
          <Text variant="bodyMedium" style={[styles.version, { color: theme.colors.outline }]}>
            Version 1.0.0 (v1.0.0)
          </Text>
        </View>

        {/* Description Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content>
            <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurface }]}>
              SocietySync is a modern digital society management platform designed to simplify communication, maintenance management, parking allocation, emergency reporting, finances, and community engagement within residential societies.
            </Text>
          </Card.Content>
        </Card>

        {/* Features Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Key Features
        </Text>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.featuresContent}>
            <List.Item
              title="Real-Time SOS Alerts"
              description="Instant emergency broadcast to security guards and residents"
              left={props => <List.Icon {...props} icon="alert-decagram" color={theme.colors.error} />}
            />
            <Divider />
            <List.Item
              title="Society Chat"
              description="Categorized discussion threads and official announcements"
              left={props => <List.Icon {...props} icon="forum" color="#8B5CF6" />}
            />
            <Divider />
            <List.Item
              title="Maintenance Dashboard"
              description="Track and pay monthly dues, view society transaction history"
              left={props => <List.Icon {...props} icon="wallet" color="#FFD700" />}
            />
            <Divider />
            <List.Item
              title="Parking Management"
              description="Book visitor parking slots and manage society allocations"
              left={props => <List.Icon {...props} icon="car" color="#3B82F6" />}
            />
            <Divider />
            <List.Item
              title="Role Based Authentication"
              description="Tailored dashboards for Admins, Owners, Renters, and Guards"
              left={props => <List.Icon {...props} icon="shield-account" color="#10B981" />}
            />
            <Divider />
            <List.Item
              title="Secure Cloud Storage"
              description="Encrypted databases and cloud-stored bills and assets"
              left={props => <List.Icon {...props} icon="cloud-lock" color="#06B6D4" />}
            />
            <Divider />
            <List.Item
              title="Live Notifications"
              description="Instant push alerts for critical updates and society events"
              left={props => <List.Icon {...props} icon="bell-ring" color="#EC4899" />}
            />
            <Divider />
            <List.Item
              title="Theme Customization"
              description="Seamless switching between dark, light, and system themes"
              left={props => <List.Icon {...props} icon="palette" color={theme.colors.primary} />}
            />
          </Card.Content>
        </Card>

        {/* Tech Stack Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Technologies Used
        </Text>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.listContent}>
            <List.Item
              title="Expo & React Native"
              description="Cross-platform performance and responsive design"
              left={props => <List.Icon {...props} icon="react" color="#61DAFB" />}
            />
            <Divider />
            <List.Item
              title="Supabase"
              description="Scalable PostgreSQL database & robust user authentication"
              left={props => <List.Icon {...props} icon="database" color="#3ECF8E" />}
            />
            <Divider />
            <List.Item
              title="React Native Paper"
              description="Material Design 3 themed beautiful native components"
              left={props => <List.Icon {...props} icon="leaf" color="#FF007F" />}
            />
            <Divider />
            <List.Item
              title="Supabase Realtime"
              description="Live subscription streams for chat and SOS warnings"
              left={props => <List.Icon {...props} icon="flash" color="#FBBF24" />}
            />
            <Divider />
            <List.Item
              title="Expo Notifications"
              description="Reliable background push notifications engine"
              left={props => <List.Icon {...props} icon="bell" color="#F43F5E" />}
            />
          </Card.Content>
        </Card>

        {/* Contact Support Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Contact & Support
        </Text>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.listContent}>
            <List.Item
              title="Support Email"
              description="societysync5@gmail.com"
              left={props => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
              onPress={() => handleOpenURL('mailto:societysync5@gmail.com')}
            />
            <Divider />
            <List.Item
              title="Developer Team"
              description="Aman Mahadik & SocietySync Contributors"
              left={props => <List.Icon {...props} icon="code-tags" color={theme.colors.primary} />}
            />
            <Divider />
            <List.Item
              title="Official Website"
              description="https://societysync.example.com"
              left={props => <List.Icon {...props} icon="web" color={theme.colors.primary} />}
              onPress={() => handleOpenURL('https://societysync.example.com')}
            />
            <Divider />
            <List.Item
              title="GitHub Repository"
              description="https://github.com/AmanMahadik/Society_Sync"
              left={props => <List.Icon {...props} icon="github" color={theme.colors.primary} />}
              onPress={() => handleOpenURL('https://github.com/AmanMahadik/Society_Sync')}
            />
          </Card.Content>
        </Card>

        {/* Privacy & Security Note */}
        <View style={styles.privacyNoteContainer}>
          <Text variant="bodySmall" style={[styles.privacyText, { color: theme.colors.outline }]}>
            SocietySync securely stores user information using Supabase Authentication and Database.
          </Text>
        </View>
      </ScrollView>
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
  logoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  logoIcon: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  appName: {
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  version: {
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
  },
  description: {
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  featuresContent: {
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  privacyNoteContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  privacyText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
