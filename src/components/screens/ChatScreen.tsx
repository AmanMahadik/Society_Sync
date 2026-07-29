import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Card, TextInput, IconButton, Button, Avatar, useTheme, Chip, SegmentedButtons, Portal, Modal, ProgressBar, Snackbar, Divider, Dialog } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, ChatMessage, ChatThread, Poll, PollOption } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ChatScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [threadTab, setThreadTab] = useState<'chat' | 'polls'>('chat');

  // Hide tab bar when inside a specific thread details view
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: activeThread ? 'none' : 'flex'
      }
    });
  }, [activeThread, navigation]);

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

  // Offline caching state
  const [isOffline, setIsOffline] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const botScrollViewRef = useRef<ScrollView>(null);

  // Events & Chatbot States
  const [communicationMode, setCommunicationMode] = useState<'events_chatbot' | 'council_threads'>('events_chatbot');
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [activeEvent, setActiveEvent] = useState<any | null>(null);
  const [eventDates, setEventDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appLanguage, setAppLanguage] = useState<'english' | 'marathi'>('english');
  const [chatbotMessages, setChatbotMessages] = useState<any[]>([
    {
      id: 'welcome',
      sender: 'bot',
      content: 'Hello! I am your SocietySync Event Assistant. You can ask me questions about scheduled events or click on any calendar date above to view its timetable.',
      created_at: new Date()
    }
  ]);
  const [botInputText, setBotInputText] = useState('');
  const [botTyping, setBotTyping] = useState(false);

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const fetchActiveEvents = async () => {
    try {
      const list = await dataManager.getActiveEvents();
      setActiveEvents(list);
      if (list.length > 0) {
        const ev = list[0];
        setActiveEvent(ev);
        
        if (ev.start_date && ev.end_date) {
          const dates: Date[] = [];
          let current = new Date(ev.start_date);
          const end = new Date(ev.end_date);
          let safety = 0;
          while (current <= end && safety < 100) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
            safety++;
          }
          setDatesAndSelectToday(dates);
        }
      }
    } catch (e) {
      console.warn('Failed to load active events:', e);
    }
  };

  const setDatesAndSelectToday = (dates: Date[]) => {
    setEventDates(dates);
    const today = new Date();
    const match = dates.find(d => d.toDateString() === today.toDateString());
    if (match) {
      setSelectedDate(match);
    } else if (dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  };

  const handleDateSelect = async (date: Date) => {
    if (!activeEvent) return;
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add user message to chatbot logs
    const userMsg = {
      id: Math.random().toString(),
      sender: 'user',
      content: appLanguage === 'english'
        ? `What is the schedule for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}?`
        : `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} चे वेळापत्रक काय आहे?`,
      created_at: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setBotTyping(true);

    try {
      const items = await dataManager.getTimetableItems(activeEvent.id);
      const dayItems = items.filter(item => item.date === dateStr);
      
      let reply = '';
      if (dayItems.length === 0) {
        reply = appLanguage === 'english'
          ? `There are no activities scheduled for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.`
          : `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} रोजी कोणतेही कार्यक्रम नियोजित नाहीत.`;
      } else {
        const title = appLanguage === 'english'
          ? `Here is the schedule for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}:`
          : `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} चे वेळापत्रक खालीलप्रमाणे आहे:`;
        
        const scheduleList = dayItems.map(item => {
          const titleText = appLanguage === 'english' ? item.title_en : item.title_mr;
          const notesText = appLanguage === 'english' ? item.notes_en : item.notes_mr;
          const timeIcon = `⏰ ${item.time}`;
          const categoryLabel = `[${item.category.toUpperCase()}]`;
          const note = notesText ? ` (${notesText})` : '';
          return `${timeIcon} - ${categoryLabel} ${titleText}${note}`;
        }).join('\n');
        
        reply = `${title}\n\n${scheduleList}`;
      }

      const botMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        content: reply,
        created_at: new Date()
      };
      setChatbotMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setBotTyping(false);
    }
  };

  const handleSendBotMessage = async () => {
    if (!botInputText.trim()) return;
    const query = botInputText.trim();
    setBotInputText('');

    const userMsg = {
      id: Math.random().toString(),
      sender: 'user',
      content: query,
      created_at: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setBotTyping(true);

    try {
      const reply = await dataManager.askChatbot(query, appLanguage);
      const botMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        content: reply,
        created_at: new Date()
      };
      setChatbotMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        content: appLanguage === 'english'
          ? "Sorry, I ran into an error processing your query. Please make sure the backend server is online."
          : "क्षमस्व, तुमच्या प्रश्नावर प्रक्रिया करताना त्रुटी आली. कृपया बॅकएंड सर्व्हर सुरू असल्याची खात्री करा.",
        created_at: new Date()
      };
      setChatbotMessages(prev => [...prev, errorMsg]);
    } finally {
      setBotTyping(false);
    }
  };

  const toggleLanguage = async () => {
    const nextLang = appLanguage === 'english' ? 'marathi' : 'english';
    setAppLanguage(nextLang);
    await AsyncStorage.setItem('sync_app_language', nextLang);
  };

  const fetchThreads = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_chat_threads');
      if (cached) {
        setThreads(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Failed to load cached threads:', e);
    }

    try {
      const list = await dataManager.getChatThreads();
      setThreads(list);
      setIsOffline(false);
      await AsyncStorage.setItem('cached_chat_threads', JSON.stringify(list));
    } catch (e) {
      console.error('Error fetching threads', e);
      setIsOffline(true);
    }
  };

  const fetchMessages = async () => {
    if (!activeThread) return;
    try {
      const cached = await AsyncStorage.getItem(`cached_messages_${activeThread.id}`);
      if (cached) {
        setMessages(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Failed to load cached messages:', e);
    }

    try {
      const msgs = await dataManager.getChatMessages(activeThread.id);
      setMessages(msgs);
      setIsOffline(false);
      await AsyncStorage.setItem(`cached_messages_${activeThread.id}`, JSON.stringify(msgs));
      
      // Auto scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.error('Error fetching messages', e);
      setIsOffline(true);
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
    fetchActiveEvents();
  }, []);

  // Update welcome message dynamically when language changes
  useEffect(() => {
    const welcome = appLanguage === 'english'
      ? 'Hello! I am your SocietySync Event Assistant. You can ask me questions about scheduled events or click on any calendar date above to view its timetable.'
      : 'नमस्कार! मी आपला सोसायटीसिंक कार्यक्रम सहाय्यक आहे. आपण मला नियोजित कार्यक्रमांबद्दल प्रश्न विचारू शकता किंवा त्याचे वेळापत्रक पाहण्यासाठी वरील कॅलेंडरच्या तारखेवर क्लिक करू शकता.';
    setChatbotMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'welcome');
      return [
        {
          id: 'welcome',
          sender: 'bot',
          content: welcome,
          created_at: new Date()
        },
        ...filtered
      ];
    });
  }, [appLanguage]);

  // Load language settings on screen mount
  useEffect(() => {
    const loadLang = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('sync_app_language');
        if (storedLang === 'english' || storedLang === 'marathi') {
          setAppLanguage(storedLang);
        }
      } catch (e) {
        console.warn('Failed to load language preference', e);
      }
    };
    loadLang();
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      >
        {/* Soft brand glow backdrop */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: [{ translateX: -150 }],
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: '#00D4AA',
            opacity: theme.dark ? 0.04 : 0.02,
            pointerEvents: 'none',
          }}
        />

        <View style={styles.screenHeader}>
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={[styles.screenHeaderLogo, { borderColor: '#00D4AA' }]} 
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={[styles.screenHeaderTitle, { color: theme.colors.onSurface }]}>
              SocietySync
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10.5 }}>
              Events calendar, AI assistant, and council debate forums
            </Text>
          </View>
        </View>

        <SegmentedButtons
          value={communicationMode}
          onValueChange={(val) => setCommunicationMode(val as any)}
          buttons={[
            {
              value: 'events_chatbot',
              label: appLanguage === 'english' ? 'Events & Chatbot' : 'कार्यक्रम आणि चॅटबॉट',
              icon: 'calendar-sync',
              checkedColor: theme.dark ? '#00D4AA' : '#0F6E56',
            },
            {
              value: 'council_threads',
              label: appLanguage === 'english' ? 'Society Council' : 'सोसायटी परिषद',
              icon: 'forum',
              checkedColor: theme.dark ? '#00D4AA' : '#0F6E56',
            },
          ]}
          style={{ marginHorizontal: 16, marginVertical: 8 }}
        />

        {communicationMode === 'events_chatbot' ? (
          // ==================== EVENTS & AI CHATBOT SUBVIEW ====================
          <View style={{ flex: 1 }}>
            {/* Calendar dates strip */}
            {activeEvent ? (
              <View style={[styles.calendarStrip, { backgroundColor: theme.colors.elevation.level1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
                  <Text variant="labelMedium" style={{ fontWeight: 'bold', color: '#00D4AA' }}>
                    📅 {appLanguage === 'english' ? activeEvent.name_en || activeEvent.name : activeEvent.name_mr || activeEvent.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10 }}>
                    {activeEvent.start_date} to {activeEvent.end_date}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStripScroll}>
                  {eventDates.map((date) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dateNum = date.getDate();
                    const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
                    
                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        style={[
                          styles.dateCard,
                          { backgroundColor: theme.colors.surface },
                          isSelected && { borderColor: '#00D4AA', borderWidth: 2 }
                        ]}
                        onPress={() => handleDateSelect(date)}
                      >
                        <Text style={[styles.dateCardDay, isSelected && { color: '#00D4AA', fontWeight: 'bold' }]}>
                          {dayName}
                        </Text>
                        <Text style={[styles.dateCardNum, isSelected && { color: '#00D4AA', fontWeight: 'bold' }]}>
                          {dateNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <Card style={{ margin: 16, backgroundColor: theme.colors.elevation.level1 }}>
                <Card.Content style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="calendar-blank" size={20} color={theme.colors.outline} />
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    {appLanguage === 'english' 
                      ? 'No active events currently scheduled in your society.' 
                      : 'सध्या तुमच्या सोसायटीत कोणतेही कार्यक्रम नियोजित नाहीत.'}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Chatbot conversation feed */}
            <ScrollView 
              ref={botScrollViewRef}
              contentContainerStyle={styles.botMessagesScroll}
              onContentSizeChange={() => botScrollViewRef.current?.scrollToEnd({ animated: true })}
              style={{ flex: 1 }}
            >
              {chatbotMessages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <View 
                    key={msg.id} 
                    style={[
                      styles.botMessageRow,
                      isMe ? styles.botMessageRowMe : { justifyContent: 'flex-start' }
                    ]}
                  >
                    {!isMe && (
                      <Avatar.Icon 
                        size={30} 
                        icon="robot" 
                        style={{ backgroundColor: 'rgba(0, 212, 170, 0.15)' }} 
                        color="#00D4AA" 
                      />
                    )}
                    <View style={{ maxWidth: '80%' }}>
                      <Card 
                        style={[
                          styles.botMessageBubble,
                          isMe 
                            ? [styles.botBubbleMe, { backgroundColor: '#00D4AA' }] 
                            : [styles.botBubbleOther, { backgroundColor: theme.colors.surfaceVariant }]
                        ]}
                      >
                        <Card.Content style={styles.botBubbleContent}>
                          <Text 
                            style={{ 
                              color: isMe ? '#09090b' : theme.colors.onSurface,
                              fontSize: 13,
                              fontWeight: isMe ? '600' : 'normal',
                            }}
                          >
                            {msg.content}
                          </Text>
                        </Card.Content>
                      </Card>
                      <Text style={[styles.botMessageTime, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {botTyping && (
                <View style={styles.typingIndicatorRow}>
                  <Avatar.Icon size={30} icon="robot" style={{ backgroundColor: 'rgba(0, 212, 170, 0.1)' }} color="#00D4AA" />
                  <View style={[styles.typingBubble, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, fontStyle: 'italic' }}>
                      {appLanguage === 'english' ? 'Assistant is thinking...' : 'सहाय्यक विचार करत आहे...'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Chatbot input bar with translation toggle */}
            <View style={[styles.botInputFooter, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 8 }]}>
              <View style={styles.botInputRow}>
                <TouchableOpacity onPress={toggleLanguage} style={styles.langToggleButton}>
                  <Text style={styles.langToggleText}>
                    {appLanguage === 'english' ? 'EN' : 'मराठी'}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  placeholder={appLanguage === 'english' ? 'Ask about schedule...' : 'वेळापत्रकाबद्दल विचारा...'}
                  value={botInputText}
                  onChangeText={setBotInputText}
                  mode="outlined"
                  dense
                  style={{ flex: 1, height: 38, backgroundColor: 'transparent' }}
                  disabled={botTyping}
                  onSubmitEditing={handleSendBotMessage}
                />
                <IconButton
                  icon="send"
                  mode="contained"
                  iconColor={theme.colors.onPrimary}
                  containerColor={theme.colors.primary}
                  size={20}
                  onPress={handleSendBotMessage}
                  disabled={botTyping || !botInputText.trim()}
                />
              </View>
            </View>
          </View>
        ) : (
          // ==================== ORIGINAL SOCIETY COUNCIL VIEW ====================
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Active Discussion Threads</Text>
              {profile?.role !== 'renter' && (
                <Button 
                  mode="contained" 
                  icon="plus" 
                  onPress={() => setThreadModalVisible(true)}
                  style={[styles.actionButton, { borderRadius: 28 }]}
                  buttonColor="#00D4AA"
                  textColor="#09090b"
                  labelStyle={{ fontWeight: 'bold' }}
                >
                  Create Thread
                </Button>
              )}
            </View>
            
            {threads.length === 0 ? (
              <Card style={[styles.emptyCard, { borderRadius: 20, backgroundColor: theme.colors.elevation.level1 }]}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>No active discussion channels.</Text>
                </Card.Content>
              </Card>
            ) : (
              threads.map((thread) => (
                <Card 
                  key={thread.id} 
                  style={[styles.threadCard, { 
                    borderColor: 'rgba(0, 212, 170, 0.25)', 
                    borderWidth: theme.dark ? 1 : 0.5,
                    borderRadius: 20,
                    backgroundColor: theme.colors.elevation.level1
                  }]}
                  onPress={() => {
                    setActiveThread(thread);
                    setThreadTab('chat');
                  }}
                >
                  <Card.Title
                    title={thread.title}
                    subtitle={`Category: ${getCategoryLabel(thread.category)}`}
                    titleStyle={{ fontWeight: 'bold', color: theme.colors.onSurface }}
                    subtitleStyle={{ color: theme.colors.outline }}
                    left={(props) => (
                      <Avatar.Icon 
                        {...props} 
                        icon={getCategoryIcon(thread.category)} 
                        style={{ backgroundColor: 'rgba(0, 212, 170, 0.15)' }} 
                        color="#00D4AA"
                      />
                    )}
                    right={(props) => <IconButton {...props} icon="chevron-right" iconColor="#00D4AA" />}
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
        )}

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
      </KeyboardAvoidingView>
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
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              threadTab === 'chat' && styles.tabItemActive
            ]} 
            onPress={() => setThreadTab('chat')}
          >
            <MaterialCommunityIcons 
              name="forum-outline" 
              size={18} 
              color={threadTab === 'chat' ? '#0F0F0F' : '#8A8A8A'} 
              style={{ marginRight: 6 }} 
            />
            <Text 
              style={[
                styles.tabText, 
                threadTab === 'chat' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              Debate Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tabItem, 
              threadTab === 'polls' && styles.tabItemActive
            ]} 
            onPress={() => setThreadTab('polls')}
          >
            <MaterialCommunityIcons 
              name="chat-processing-outline" 
              size={18} 
              color={threadTab === 'polls' ? '#0F0F0F' : '#8A8A8A'} 
              style={{ marginRight: 6 }} 
            />
            <Text 
              style={[
                styles.tabText, 
                threadTab === 'polls' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              Voting Polls
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pinned Message Banner */}
      {threadTab === 'chat' && pinnedMessage && (
        <Card style={[styles.pinnedBanner, { backgroundColor: theme.colors.elevation.level1, borderColor: '#00D4AA', borderWidth: 1, borderRadius: 16 }]}>
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
            <IconButton icon="pin" iconColor="#00D4AA" size={20} style={{ margin: 0 }} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#00D4AA' }}>
                PINNED RESOLUTION:
              </Text>
              <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurface }}>
                {pinnedMessage.content}
              </Text>
            </View>
            {(profile?.role === 'admin' || profile?.role === 'owner') && (
              <IconButton 
                icon="close-circle" 
                iconColor="#00D4AA"
                size={18} 
                style={{ margin: 0 }} 
                onPress={() => handlePinToggle(pinnedMessage.id, true)} 
              />
            )}
          </Card.Content>
        </Card>
      )}

      {threadTab === 'chat' && isOffline && (
        <Chip 
          icon="wifi-off" 
          style={{ margin: 8, alignSelf: 'center', backgroundColor: '#FBEAE3' }} 
          textStyle={{ color: '#A8401C', fontSize: 10, fontWeight: 'bold' }}
        >
          Offline Mode (Showing Cached Chat)
        </Chip>
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
                          ? [styles.bubbleMe, { backgroundColor: '#00D4AA', borderRadius: 16, borderTopRightRadius: 2 }] 
                          : [styles.bubbleOther, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 16, borderTopLeftRadius: 2 }]
                      ]}
                      onLongPress={() => handlePinToggle(msg.id, msg.is_pinned)}
                    >
                      <Card.Content style={styles.bubbleContent}>
                        <Text 
                          style={{ 
                            color: isMe ? '#09090b' : theme.colors.onSurface,
                            fontSize: 13.5,
                            fontWeight: isMe ? '600' : 'normal',
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
        <View style={[styles.inputFooter, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 8 }]}>
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
    paddingBottom: 130,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#00D4AA',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#0F0F0F',
  },
  tabTextInactive: {
    color: '#8A8A8A',
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
  calendarStrip: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  calendarStripScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateCard: {
    width: 54,
    height: 62,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 1,
  },
  dateCardDay: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#8A8A8A',
    fontWeight: 'bold',
  },
  dateCardNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  botMessagesScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  botMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 6,
  },
  botMessageRowMe: {
    justifyContent: 'flex-end',
  },
  botMessageBubble: {
    borderRadius: 16,
    elevation: 0.5,
  },
  botBubbleMe: {
    borderBottomRightRadius: 2,
  },
  botBubbleOther: {
    borderBottomLeftRadius: 2,
  },
  botBubbleContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botMessageTime: {
    fontSize: 8.5,
    color: '#8A8A8A',
    marginTop: 3,
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  typingBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 2,
  },
  botInputFooter: {
    padding: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  botInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langToggleButton: {
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.05)',
  },
  langToggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00D4AA',
  },
});
