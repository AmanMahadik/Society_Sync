import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, Card, TextInput, IconButton, Button, Avatar, useTheme, Chip, SegmentedButtons, Portal, Modal, ProgressBar, Snackbar, Divider, Dialog } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, ChatMessage, ChatThread, Poll, PollOption } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ChatScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [threadTab, setThreadTab] = useState<'chat' | 'polls'>('chat');

  // Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Polls State
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);

  // Thread Creation Modal
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState<'water-infrastructure' | 'budget' | 'events' | 'maintenance' | 'security' | 'general'>('general');

  // Snackbar Toast
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Clear Chat Dialog State (Admin only)
  const [clearChatDialogVisible, setClearChatDialogVisible] = useState(false);
  const [clearing, setClearing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const fetchThreads = async () => {
    try {
      const list = await dataManager.getChatThreads();
      setThreads(list);
    } catch (e) {
      console.error('Error fetching threads', e);
    }
  };

  const fetchMessages = async () => {
    if (!activeThread) return;
    try {
      const msgs = await dataManager.getChatMessages(activeThread.id);
      setMessages(msgs);
      
      // Auto scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.error('Error fetching messages', e);
    }
  };

  const fetchPolls = async () => {
    if (!activeThread || !user) return;
    try {
      const pollList = await dataManager.getPolls(activeThread.id, user.id);
      setPolls(pollList);
    } catch (e) {
      console.error('Error fetching polls', e);
    }
  };

  const loadThreadData = async () => {
    if (threadTab === 'chat') {
      await fetchMessages();
    } else {
      await fetchPolls();
    }
  };

  // Poll thread data every 3 seconds
  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadThreadData();
      const interval = setInterval(loadThreadData, 3000);
      return () => clearInterval(interval);
    }
  }, [activeThread, threadTab]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !user) {
      showToast('Please enter a thread title.');
      return;
    }
    try {
      const title = newThreadTitle.startsWith('#') ? newThreadTitle : `#${newThreadTitle}`;
      const newT = await dataManager.createChatThread(title, newThreadCategory, user.id);
      setThreadModalVisible(false);
      setNewThreadTitle('');
      showToast(`Thread '${title}' created successfully!`);
      fetchThreads();
      setActiveThread(newT);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeThread || !user) return;
    setSending(true);
    try {
      await dataManager.sendChatMessage(activeThread.id, user.id, inputText.trim());
      setInputText('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeThread) return;
    setClearing(true);
    try {
      await dataManager.clearThreadMessages(activeThread.id);
      setClearChatDialogVisible(false);
      showToast('Chat history cleared successfully!');
      fetchMessages();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to clear chat.');
    } finally {
      setClearing(false);
    }
  };

  const handlePinToggle = async (messageId: string, currentPin: boolean) => {
    if (profile?.role !== 'admin' && profile?.role !== 'owner') return;
    await dataManager.pinMessage(messageId, !currentPin);
    showToast(currentPin ? 'Message unpinned' : 'Message pinned to thread!');
    fetchMessages();
  };

  const handleCreatePoll = async () => {
    if (!newPollTitle.trim() || !activeThread || !user) {
      showToast('Please enter a poll title.');
      return;
    }
    const filteredOptions = pollOptions.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      showToast('Please provide at least 2 voting options.');
      return;
    }

    setCreatingPoll(true);
    try {
      await dataManager.createPoll(
        activeThread.id,
        newPollTitle,
        newPollDesc,
        user.id,
        filteredOptions
      );
      setPollModalVisible(false);
      setNewPollTitle('');
      setNewPollDesc('');
      setPollOptions(['', '']);
      showToast('Voting Poll created successfully!');
      fetchPolls();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;
    try {
      await dataManager.voteInPoll(pollId, optionId, user.id);
      showToast('Your vote has been cast!');
      fetchPolls();
    } catch (e: any) {
      showToast(e.message || 'Error casting vote.');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const isDark = theme.dark;
    switch (role) {
      case 'admin': return isDark ? '#FFD700' : '#B45309'; // Gold / Dark Gold
      case 'owner': return isDark ? '#00D4AA' : '#047857'; // Emerald / Dark Emerald
      case 'renter': return isDark ? '#3B82F6' : '#1D4ED8'; // Blue / Dark Blue
      case 'guard': return isDark ? '#06B6D4' : '#0E7490';  // Cyan / Dark Cyan
      default: return isDark ? '#888888' : '#555555';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'water-infrastructure': return 'water';
      case 'budget': return 'cash-multiple';
      case 'events': return 'calendar-star';
      case 'maintenance': return 'wrench';
      case 'security': return 'shield-account';
      default: return 'forum';
    }
  };

  const isRenter = profile?.role === 'renter';

  // Render Category Headers
  const getCategoryLabel = (cat: string) => {
    return cat.replace('-', ' ').toUpperCase();
  };

  // ==================== VIEW A: THREAD SELECTOR ====================
  if (!activeThread) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.screenHeader}>
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={[styles.screenHeaderLogo, { borderColor: '#8B5CF6' }]} 
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={[styles.screenHeaderTitle, { color: theme.colors.onSurface }]}>
              SocietySync Council
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10.5 }}>
              Structured, thread-based channels replacing WhatsApp chaos
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Active Discussion Threads</Text>
            {profile?.role !== 'renter' && (
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={() => setThreadModalVisible(true)}
                style={styles.actionButton}
              >
                Create Thread
              </Button>
            )}
          </View>
          
          {threads.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text variant="bodyMedium">No active discussion channels.</Text>
              </Card.Content>
            </Card>
          ) : (
            threads.map((thread) => (
              <Card 
                key={thread.id} 
                style={[styles.threadCard, { borderColor: '#8B5CF6', borderWidth: 0.5 }]}
                onPress={() => {
                  setActiveThread(thread);
                  setThreadTab('chat');
                }}
              >
                <Card.Title
                  title={thread.title}
                  subtitle={`Category: ${getCategoryLabel(thread.category)}`}
                  titleStyle={{ fontWeight: 'bold', color: '#8B5CF6' }}
                  left={(props) => (
                    <Avatar.Icon 
                      {...props} 
                      icon={getCategoryIcon(thread.category)} 
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }} 
                      color="#8B5CF6"
                    />
                  )}
                  right={(props) => <IconButton {...props} icon="chevron-right" iconColor="#8B5CF6" />}
                />
              </Card>
            ))
          )}

          <Card style={[styles.ruleCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>📜 Council Gating Rules:</Text>
              <View style={styles.ruleItem}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>• Owners & Admins:</Text>
                <Text variant="bodySmall">Full write access to debate, create threads, and vote in polls.</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>• Renters & Security Guards:</Text>
                <Text variant="bodySmall">Read-Only access to official resolutions to maintain focus.</Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        {/* CREATE THREAD MODAL */}
        <Portal>
          <Modal
            visible={threadModalVisible}
            onDismiss={() => setThreadModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>🏛️ Create Council Thread</Text>
            <TextInput
              label="Thread Title"
              placeholder="e.g. Sinking Fund Allocation"
              value={newThreadTitle}
              onChangeText={setNewThreadTitle}
              mode="outlined"
              style={styles.modalInput}
            />
            <Text variant="labelMedium" style={{ marginBottom: 6 }}>Channel Category</Text>
            <View style={styles.categoryGrid}>
              {[
                { cat: 'water-infrastructure', label: 'Water' },
                { cat: 'budget', label: 'Budget' },
                { cat: 'events', label: 'Events' },
                { cat: 'maintenance', label: 'Maintenance' },
                { cat: 'security', label: 'Security' },
                { cat: 'general', label: 'General' },
              ].map(item => (
                <Button
                  key={item.cat}
                  mode={newThreadCategory === item.cat ? 'contained' : 'outlined'}
                  onPress={() => setNewThreadCategory(item.cat as any)}
                  style={styles.categoryGridBtn}
                  labelStyle={{ fontSize: 10 }}
                  compact
                >
                  {item.label}
                </Button>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button mode="outlined" onPress={() => setThreadModalVisible(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleCreateThread} style={{ flex: 1 }}>
                Create Thread
              </Button>
            </View>
          </Modal>
        </Portal>
        
        <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} style={{ marginBottom: 60 }}>
          {snackbarMessage}
        </Snackbar>
      </View>
    );
  }

  // ==================== VIEW B: THREAD INSIDE WORKSPACE ====================
  const pinnedMessage = messages.find(m => m.is_pinned);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
    >
      {/* Thread Header */}
      <View style={[styles.threadHeader, { backgroundColor: theme.colors.surface }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => setActiveThread(null)} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            {activeThread.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Category: {getCategoryLabel(activeThread.category)}
          </Text>
        </View>
        
        {/* Admin Clear Chat option */}
        {profile?.role === 'admin' && threadTab === 'chat' && (
          <IconButton 
            icon="delete-sweep" 
            iconColor={theme.colors.error} 
            size={22} 
            onPress={() => setClearChatDialogVisible(true)} 
            style={{ margin: 0 }}
          />
        )}
        
        <IconButton icon="refresh" size={20} onPress={loadThreadData} />
      </View>

      {/* Segmented Controller for Chat vs. Polls */}
      <View style={styles.toggleBar}>
        <SegmentedButtons
          value={threadTab}
          onValueChange={(val) => setThreadTab(val as any)}
          buttons={[
            { value: 'chat', label: 'Debate Messages', icon: 'forum-outline' },
            { value: 'polls', label: 'Voting Polls', icon: 'chat-processing' },
          ]}
          style={{ width: '100%' }}
        />
      </View>

      {/* Pinned Message Banner */}
      {threadTab === 'chat' && pinnedMessage && (
        <Card style={[styles.pinnedBanner, { backgroundColor: '#1E1E1E', borderColor: '#8B5CF6', borderWidth: 1 }]}>
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
            <IconButton icon="pin" iconColor="#8B5CF6" size={20} style={{ margin: 0 }} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#8B5CF6' }}>
                PINNED RESOLUTION:
              </Text>
              <Text variant="bodySmall" numberOfLines={2} style={{ color: '#FFFFFF' }}>
                {pinnedMessage.content}
              </Text>
            </View>
            {(profile?.role === 'admin' || profile?.role === 'owner') && (
              <IconButton 
                icon="close-circle" 
                iconColor="#8B5CF6"
                size={18} 
                style={{ margin: 0 }} 
                onPress={() => handlePinToggle(pinnedMessage.id, true)} 
              />
            )}
          </Card.Content>
        </Card>
      )}

      {/* ==================== SCREEN B1: DEBATE MESSAGES STREAM ==================== */}
      {threadTab === 'chat' && (
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.messageStreamContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                No messages in this thread yet.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              
              return (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageRow, 
                    isMe ? styles.messageRowMe : styles.messageRowOther
                  ]}
                >
                  {!isMe && (
                    msg.sender_avatar ? (
                      <Avatar.Image 
                        size={30} 
                        source={{ uri: msg.sender_avatar }} 
                      />
                    ) : (
                      <Avatar.Text 
                        size={30} 
                        label={msg.sender_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'RS'} 
                        style={{ backgroundColor: getRoleBadgeColor(msg.sender_role || 'renter') }}
                        labelStyle={{ fontSize: 11 }}
                      />
                    )
                  )}

                  <View style={{ maxWidth: '80%' }}>
                    {!isMe && (
                      <View style={styles.senderInfoRow}>
                        <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>{msg.sender_name}</Text>
                        <Text variant="bodySmall" style={{ fontSize: 9, color: theme.colors.outline }}>
                          ({msg.sender_flat})
                        </Text>
                        <Text 
                          variant="bodySmall" 
                          style={[
                            styles.roleTag, 
                            { 
                              color: getRoleBadgeColor(msg.sender_role || 'renter'),
                              borderColor: getRoleBadgeColor(msg.sender_role || 'renter'),
                              backgroundColor: getRoleBadgeColor(msg.sender_role || 'renter') + '15'
                            }
                          ]}
                        >
                          {msg.sender_role?.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <Card 
                      style={[
                        styles.messageBubble, 
                        isMe 
                          ? [styles.bubbleMe, { backgroundColor: '#8B5CF6' }] 
                          : [styles.bubbleOther, { backgroundColor: theme.colors.surfaceVariant }]
                      ]}
                      onLongPress={() => handlePinToggle(msg.id, msg.is_pinned)}
                    >
                      <Card.Content style={styles.bubbleContent}>
                        <Text 
                          style={{ 
                            color: '#FFFFFF',
                            fontSize: 13.5,
                          }}
                        >
                          {msg.content}
                        </Text>
                      </Card.Content>
                    </Card>

                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                      {msg.is_pinned && <IconButton icon="pin" size={10} style={{ margin: 0 }} />}
                      <Text variant="bodySmall" style={styles.messageTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ==================== SCREEN B2: VOTING POLLS PANEL ==================== */}
      {threadTab === 'polls' && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Active Voting Polls</Text>
            {profile?.role !== 'renter' && (
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={() => setPollModalVisible(true)}
                style={styles.actionButton}
                labelStyle={{ fontSize: 11 }}
              >
                Create Poll
              </Button>
            )}
          </View>

          {polls.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                  No active polls in this thread.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            polls.map((poll) => {
              const totalVotes = (poll.options || []).reduce((sum, o) => sum + o.vote_count, 0);

              return (
                <Card key={poll.id} style={styles.pollCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{poll.title}</Text>
                    {poll.description && (
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginVertical: 4 }}>
                        {poll.description}
                      </Text>
                    )}

                    <View style={{ gap: 8, marginTop: 12 }}>
                      {(poll.options || []).map((opt) => {
                        const percent = totalVotes > 0 ? Number((opt.vote_count / totalVotes).toFixed(2)) : 0;
                        const percentLabel = totalVotes > 0 ? `${Math.round(percent * 100)}%` : '0%';

                        return (
                          <View key={opt.id}>
                            {poll.hasVoted || poll.status === 'closed' || isRenter ? (
                              // Read-only visual progress bars after voting or for renters
                              <View style={styles.votedProgressRow}>
                                <View style={styles.progressTextRow}>
                                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{opt.option_text}</Text>
                                  <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>
                                    {percentLabel} ({opt.vote_count} votes)
                                  </Text>
                                </View>
                                <ProgressBar progress={percent} color={theme.colors.primary} style={{ height: 8, borderRadius: 4 }} />
                              </View>
                            ) : (
                              // Interactive buttons to cast vote
                              <Button
                                mode="outlined"
                                icon="vote"
                                onPress={() => handleVote(poll.id, opt.id)}
                                style={styles.pollOptionBtn}
                                contentStyle={{ justifyContent: 'flex-start' }}
                                labelStyle={{ fontSize: 12 }}
                              >
                                {opt.option_text}
                              </Button>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <Divider style={{ marginVertical: 10 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Total Votes: {totalVotes} • Status: <Text style={{ fontWeight: 'bold' }}>{poll.status.toUpperCase()}</Text>
                    </Text>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Role-Gated Footer Input for Messages */}
      {threadTab === 'chat' && (
        <View style={[styles.inputFooter, { backgroundColor: theme.colors.surface }]}>
          {isRenter ? (
            <Card style={[styles.disabledCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content style={{ padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <IconButton icon="information-outline" iconColor={theme.colors.error} size={18} style={{ margin: 0 }} />
                <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, flex: 1, fontSize: 10.5, fontWeight: '500' }}>
                  Renters have Read-Only access in council threads. Please use the SOS button on Home tab for utility issues.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Post to debate thread..."
                value={inputText}
                onChangeText={setInputText}
                mode="flat"
                dense
                multiline
                style={styles.chatInput}
                disabled={sending}
              />
              <IconButton
                icon="send"
                mode="contained"
                iconColor={theme.colors.onPrimary}
                containerColor={theme.colors.primary}
                size={22}
                onPress={handleSendMessage}
                disabled={sending || !inputText.trim()}
              />
            </View>
          )}
        </View>
      )}

      {/* CREATE POLL MODAL */}
      <Portal>
        <Dialog 
          visible={clearChatDialogVisible} 
          onDismiss={() => setClearChatDialogVisible(false)}
          style={{ backgroundColor: theme.colors.elevation.level3 }}
        >
          <Dialog.Title style={{ fontWeight: 'bold', color: theme.colors.error }}>🚨 Clear Chat History</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              Are you sure you want to permanently delete all messages in this thread? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearChatDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
            <Button 
              onPress={handleClearChat} 
              loading={clearing}
              disabled={clearing}
              textColor={theme.colors.error}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Clear Chat
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* CREATE POLL MODAL */}
      <Portal>
        <Modal
          visible={pollModalVisible}
          onDismiss={() => setPollModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>📊 Create Voting Poll</Text>
          
          <TextInput
            label="Question / Proposal Title"
            placeholder="e.g. Increase Maintenance fee?"
            value={newPollTitle}
            onChangeText={setNewPollTitle}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Additional Context"
            placeholder="Provide background context..."
            value={newPollDesc}
            onChangeText={setNewPollDesc}
            mode="outlined"
            style={styles.modalInput}
          />

          <Text variant="labelMedium" style={{ marginBottom: 6, fontWeight: 'bold' }}>Poll Options</Text>
          {pollOptions.map((opt, idx) => (
            <TextInput
              key={idx}
              label={`Option ${idx + 1}`}
              value={opt}
              onChangeText={(text) => {
                const newOpts = [...pollOptions];
                newOpts[idx] = text;
                setPollOptions(newOpts);
              }}
              mode="outlined"
              dense
              style={[styles.modalInput, { marginBottom: 8 }]}
            />
          ))}

          {pollOptions.length < 4 && (
            <Button 
              compact 
              mode="text" 
              icon="plus" 
              onPress={() => setPollOptions([...pollOptions, ''])}
              style={{ alignSelf: 'flex-start', marginBottom: 12 }}
            >
              Add Option
            </Button>
          )}

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setPollModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleCreatePoll} 
              loading={creatingPoll}
              disabled={creatingPoll}
              style={{ flex: 1 }}
            >
              Post Poll
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} style={{ marginBottom: 60 }}>
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  screenHeaderLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
  },
  screenHeaderTitle: {
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDD',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  actionButton: {
    borderRadius: 8,
  },
  threadCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1.5,
  },
  ruleCard: {
    marginTop: 20,
    borderRadius: 12,
    elevation: 0.5,
  },
  ruleItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
  },
  toggleBar: {
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  pinnedBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    elevation: 1,
  },
  messageStreamContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  senderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  roleTag: {
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
    borderWidth: 0.5,
    paddingHorizontal: 3,
    borderRadius: 3,
    borderColor: 'currentColor',
  },
  messageBubble: {
    borderRadius: 16,
    elevation: 0.5,
  },
  bubbleContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    borderTopRightRadius: 2,
  },
  bubbleOther: {
    borderTopLeftRadius: 2,
  },
  messageTime: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
  },
  inputFooter: {
    padding: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  disabledCard: {
    borderRadius: 8,
    elevation: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryGridBtn: {
    flexBasis: '30%',
    borderRadius: 6,
  },
  pollCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  votedProgressRow: {
    marginVertical: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pollOptionBtn: {
    borderRadius: 8,
    marginVertical: 2,
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 1,
  },
});
