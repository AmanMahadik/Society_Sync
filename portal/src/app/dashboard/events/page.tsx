'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Languages, 
  Bell, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Moon, 
  Sun, 
  Laptop, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  X, 
  Info,
  CalendarDays,
  FileText
} from 'lucide-react';

interface Event {
  id: string;
  name: string;
  name_en?: string;
  name_mr?: string;
  description?: string;
  description_en?: string;
  description_mr?: string;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  status: 'upcoming' | 'active' | 'completed';
  is_active: boolean;
}

interface TimetableItem {
  id: string;
  event_id: string;
  date: string;
  time: string;
  category: 'pooja' | 'aarti' | 'competition' | 'food_stall' | 'visarjan' | 'other';
  title_en: string;
  title_mr: string;
  notes_en?: string;
  notes_mr?: string;
  is_triggered: boolean;
  triggered_at?: string;
}

interface Society {
  id: string;
  name: string;
  society_code: string;
}

export default function EventsAdminDashboard() {
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [timetableItems, setTimetableItems] = useState<Record<string, TimetableItem[]>>({});
  
  // Theme settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  // Modals
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [selectedTimetableItem, setSelectedTimetableItem] = useState<TimetableItem | null>(null);
  
  // Form states (Event)
  const [eventNameEn, setEventNameEn] = useState('');
  const [eventNameMr, setEventNameMr] = useState('');
  const [eventDescEn, setEventDescEn] = useState('');
  const [eventDescMr, setEventDescMr] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventPosterUrl, setEventPosterUrl] = useState('');
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [translatingEvent, setTranslatingEvent] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  // Form states (Timetable Item)
  const [itemDate, setItemDate] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemCategory, setItemCategory] = useState<'pooja' | 'aarti' | 'competition' | 'food_stall' | 'visarjan' | 'other'>('pooja');
  const [itemTitleEn, setItemTitleEn] = useState('');
  const [itemTitleMr, setItemTitleMr] = useState('');
  const [itemNotesEn, setItemNotesEn] = useState('');
  const [itemNotesMr, setItemNotesMr] = useState('');
  const [translatingItem, setTranslatingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Ad-hoc notification states
  const [adhocTitleEn, setAdhocTitleEn] = useState('');
  const [adhocTitleMr, setAdhocTitleMr] = useState('');
  const [adhocBodyEn, setAdhocBodyEn] = useState('');
  const [adhocBodyMr, setAdhocBodyMr] = useState('');
  const [translatingAdhoc, setTranslatingAdhoc] = useState(false);
  const [sendingAdhoc, setSendingAdhoc] = useState(false);

  // Patrika bulk AI importer states
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [translatingPatrika, setTranslatingPatrika] = useState(false);
  const [parsedPatrika, setParsedPatrika] = useState<any>(null);
  const [importingPatrika, setImportingPatrika] = useState(false);

  // Load Theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'dark';
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    let resolvedMode = mode;
    if (mode === 'system') {
      resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.add(resolvedMode);
  };

  // Auth check & load initial data
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Fetch society_admins mapping
        const { data: adminMapping } = await supabase
          .from('society_admins')
          .select('society_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        let societyId = '';
        if (adminMapping) {
          societyId = adminMapping.society_id;
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('society_id, role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!profile || profile.society_id === null) {
            alert('Security Error: Your account is not mapped to any society.');
            router.push('/login');
            return;
          }
          societyId = profile.society_id;
        }

        // Fetch society details
        const { data: soc } = await supabase
          .from('societies')
          .select('*')
          .eq('id', societyId)
          .single();

        if (soc) setSociety(soc);

        // Fetch admin profile
        const { data: currentProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (currentProf) setAdminProfile(currentProf);

        await fetchEvents(societyId);
      } catch (err) {
        console.error('Error loading events dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const fetchEvents = async (societyId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('society_id', societyId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
    } else {
      setEvents(data || []);
    }
  };

  const fetchTimetableItems = async (eventId: string) => {
    const { data, error } = await supabase
      .from('timetable_items')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error loading timetable items:', error);
    } else {
      setTimetableItems(prev => ({
        ...prev,
        [eventId]: data || []
      }));
    }
  };

  const toggleExpandEvent = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      await fetchTimetableItems(eventId);
    }
  };

  // AI translation assistant call
  const triggerTranslation = async (text: string, targetLang: 'mr' | 'en', setter: (val: string) => void, setLoadingState: (val: boolean) => void) => {
    if (!text.trim()) return;
    setLoadingState(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      });
      if (response.ok) {
        const data = await response.json();
        setter(data.translatedText);
      } else {
        console.error('Translation failed:', await response.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingState(false);
    }
  };

  // Create or Update Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society || !eventNameEn.trim()) return;

    setSavingEvent(true);
    const eventPayload = {
      society_id: society.id,
      name: eventNameEn.trim(),
      name_en: eventNameEn.trim(),
      name_mr: eventNameMr.trim() || eventNameEn.trim(),
      description: eventDescEn.trim(),
      description_en: eventDescEn.trim(),
      description_mr: eventDescMr.trim() || eventDescEn.trim(),
      start_date: eventStartDate || null,
      end_date: eventEndDate || null,
      status: eventStatus,
      poster_url: eventPosterUrl.trim() || null,
      is_active: eventStatus !== 'completed'
    };

    try {
      if (selectedEvent) {
        // Update
        const { error } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', selectedEvent.id);
        if (error) throw error;
        alert('Event updated successfully!');
      } else {
        // Insert
        const { error } = await supabase
          .from('events')
          .insert(eventPayload);
        if (error) throw error;
        alert('Event created successfully!');
      }
      setEventModalOpen(false);
      await fetchEvents(society.id);
    } catch (err: any) {
      alert(`Error saving event: ${err.message}`);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setEventNameEn(event.name_en || event.name);
    setEventNameMr(event.name_mr || '');
    setEventDescEn(event.description_en || event.description || '');
    setEventDescMr(event.description_mr || '');
    setEventStartDate(event.start_date || '');
    setEventEndDate(event.end_date || '');
    setEventPosterUrl(event.poster_url || '');
    setEventStatus(event.status);
    setEventModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setEventNameEn('');
    setEventNameMr('');
    setEventDescEn('');
    setEventDescMr('');
    setEventStartDate('');
    setEventEndDate('');
    setEventPosterUrl('');
    setEventStatus('upcoming');
    setEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all timetable items and schedule details.')) return;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
      alert('Event deleted.');
      if (society) await fetchEvents(society.id);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Create or Update Timetable Item
  const handleSaveTimetableItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedEventId || !itemDate || !itemTime || !itemTitleEn.trim()) return;

    setSavingItem(true);
    const itemPayload = {
      event_id: expandedEventId,
      date: itemDate,
      time: itemTime,
      category: itemCategory,
      title_en: itemTitleEn.trim(),
      title_mr: itemTitleMr.trim() || itemTitleEn.trim(),
      notes_en: itemNotesEn.trim() || null,
      notes_mr: itemNotesMr.trim() || null
    };

    try {
      if (selectedTimetableItem) {
        // Update
        const { error } = await supabase
          .from('timetable_items')
          .update(itemPayload)
          .eq('id', selectedTimetableItem.id);
        if (error) throw error;
        alert('Schedule item updated!');
      } else {
        // Insert
        const { error } = await supabase
          .from('timetable_items')
          .insert(itemPayload);
        if (error) throw error;
        alert('Schedule item added!');
      }
      setTimetableModalOpen(false);
      await fetchTimetableItems(expandedEventId);
    } catch (err: any) {
      alert(`Error saving schedule: ${err.message}`);
    } finally {
      setSavingItem(false);
    }
  };

  const handleEditTimetableItem = (item: TimetableItem) => {
    setSelectedTimetableItem(item);
    setItemDate(item.date);
    setItemTime(item.time);
    setItemCategory(item.category);
    setItemTitleEn(item.title_en);
    setItemTitleMr(item.title_mr || '');
    setItemNotesEn(item.notes_en || '');
    setItemNotesMr(item.notes_mr || '');
    setTimetableModalOpen(true);
  };

  const handleNewTimetableItem = (event: Event) => {
    setSelectedTimetableItem(null);
    setItemDate(event.start_date || '');
    setItemTime('');
    setItemCategory('pooja');
    setItemTitleEn('');
    setItemTitleMr('');
    setItemNotesEn('');
    setItemNotesMr('');
    setTimetableModalOpen(true);
  };

  const handleDeleteTimetableItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this schedule item?')) return;
    try {
      const { error } = await supabase
        .from('timetable_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      alert('Schedule item deleted.');
      if (expandedEventId) await fetchTimetableItems(expandedEventId);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Trigger push notification from schedule item
  const handleTriggerNotification = async (item: TimetableItem) => {
    if (!society) return;
    const confirmTrigger = confirm(`Trigger real-time push notification for: "${item.title_en}" / "${item.title_mr}"? All residents will receive it instantly.`);
    if (!confirmTrigger) return;

    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId: society.id,
          titleEn: `Event Activity Started`,
          titleMr: `कार्यक्रम सुरू झाला आहे`,
          bodyEn: `${item.title_en} has started! Join now.`,
          bodyMr: `${item.title_mr} सुरू झाला आहे! त्वरित उपस्थित रहा.`,
          timetableItemId: item.id,
          category: item.category
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully triggered! Notification sent to ${result.sentCount} unique registered devices.`);
        if (expandedEventId) await fetchTimetableItems(expandedEventId);
      } else {
        const errText = await response.text();
        alert(`Failed to send notification: ${errText}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Send ad-hoc notification
  const handleSendAdhocNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society || !adhocTitleEn.trim() || !adhocBodyEn.trim()) return;

    const confirmSend = confirm(`Dispatch ad-hoc announcement alert to all residents?`);
    if (!confirmSend) return;

    setSendingAdhoc(true);
    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId: society.id,
          titleEn: adhocTitleEn.trim(),
          titleMr: adhocTitleMr.trim() || adhocTitleEn.trim(),
          bodyEn: adhocBodyEn.trim(),
          bodyMr: adhocBodyMr.trim() || adhocBodyEn.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Ad-hoc push alert successfully sent to ${result.sentCount} devices!`);
        setAdhocTitleEn('');
        setAdhocTitleMr('');
        setAdhocBodyEn('');
        setAdhocBodyMr('');
      } else {
        const errText = await response.text();
        alert(`Failed to trigger push: ${errText}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSendingAdhoc(false);
    }
  };

  const handleOpenBulkImport = (event: Event) => {
    setSelectedEvent(event);
    setBulkText('');
    setParsedPatrika(null);
    setBulkImportModalOpen(true);
  };

  const handleTranslatePatrika = async () => {
    if (!bulkText.trim()) return;
    setTranslatingPatrika(true);
    setParsedPatrika(null);
    try {
      const response = await fetch('/api/translate-patrika', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText }),
      });
      if (response.ok) {
        const data = await response.json();
        setParsedPatrika(data);
      } else {
        alert('Translation failed. Please check the logs.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error calling AI translator.');
    } finally {
      setTranslatingPatrika(false);
    }
  };

  const mapIconToCategory = (icon: string) => {
    switch (icon) {
      case 'puja':
      case 'installation':
      case 'satyanarayan':
        return 'pooja';
      case 'aarti':
        return 'aarti';
      case 'visarjan':
        return 'visarjan';
      case 'competition_kids':
      case 'competition_women':
      case 'competition_dance':
        return 'competition';
      case 'food_stall':
        return 'food_stall';
      default:
        return 'other';
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!parsedPatrika || !selectedEvent) return;
    setImportingPatrika(true);
    try {
      const insertRows: any[] = [];
      parsedPatrika.days.forEach((day: any) => {
        if (!day.date_iso || !day.events || day.events.length === 0) return;
        
        day.events.forEach((ev: any) => {
          insertRows.push({
            event_id: selectedEvent.id,
            date: day.date_iso,
            time: ev.time_display || '8:00 AM',
            category: mapIconToCategory(ev.icon),
            title_en: ev.text || 'Activity',
            title_mr: ev.text || 'कार्यक्रम',
            notes_en: ev.tag || null,
            notes_mr: ev.tag || null,
            is_triggered: false
          });
        });
      });

      if (insertRows.length === 0) {
        alert('No valid items found in the generated schedule to import.');
        setImportingPatrika(false);
        return;
      }

      const { error } = await supabase
        .from('timetable_items')
        .insert(insertRows);

      if (error) throw error;
      
      alert(`Successfully imported ${insertRows.length} activities into the schedule timeline!`);
      setBulkImportModalOpen(false);
      await fetchTimetableItems(selectedEvent.id);
    } catch (err: any) {
      alert(`Error during bulk import: ${err.message}`);
    } finally {
      setImportingPatrika(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm animate-pulse flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#1D9E75]" />
          Opening Events Manager...
        </p>
      </div>
    );
  }

  if (!society) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#1D9E75] selection:text-[#0b0e10]">
      {/* NAVBAR */}
      <header className="border-b border-border bg-background px-6 py-4 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SocietySync Logo" className="h-7 w-7 rounded object-contain" />
            <span className="font-extrabold text-base tracking-tight">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#0F6E56]/20 text-[#1D9E75] border border-[#1D9E75]/30">
            SOCIETY ADMIN
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Overview</Link>
            <Link href="/dashboard/chanda" className="text-muted-foreground hover:text-foreground transition-colors">Billing</Link>
            <Link href="/dashboard/parking" className="text-muted-foreground hover:text-foreground transition-colors">Parking</Link>
            <Link href="/dashboard/forum" className="text-muted-foreground hover:text-foreground transition-colors">Forum</Link>
            <Link href="/dashboard/events" className="text-[#1D9E75] transition-colors border-b-2 border-[#1D9E75] pb-1">Events</Link>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Events & Schedules</h1>
            <p className="text-muted-foreground text-xs mt-1">Configure society event calendars, daily timetables, and trigger resident notifications.</p>
          </div>
          <button 
            onClick={handleNewEvent}
            className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white font-extrabold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-lg shadow-[#1D9E75]/25"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>

        {/* CONTENT ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT/MID: EVENTS LIST & TIMETABLES (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="bg-card border border-border border-dashed p-20 rounded-lg text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-bold">No events created yet.</p>
                  <p className="text-xs mt-1">Click the &quot;Add Event&quot; button to launch a calendar schedule.</p>
                </div>
              ) : (
                events.map((event) => {
                  const isExpanded = expandedEventId === event.id;
                  const items = timetableItems[event.id] || [];

                  return (
                    <div key={event.id} className="bg-card border border-border rounded-lg overflow-hidden transition-all shadow-md">
                      {/* Event Card Header */}
                      <div className="p-5 flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-extrabold text-base text-foreground">
                              {event.name_en || event.name} 
                              {event.name_mr && <span className="text-muted-foreground font-semibold text-xs ml-2">({event.name_mr})</span>}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              event.status === 'active' 
                                ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' 
                                : event.status === 'upcoming' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'bg-zinc-800 text-muted-foreground border border-zinc-700'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed max-w-2xl">
                            {event.description_en || event.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBD'} to {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'TBD'}
                            </span>
                            {event.poster_url && (
                              <a href={event.poster_url} target="_blank" rel="noopener noreferrer" className="text-[#1D9E75] hover:underline flex items-center gap-1 font-semibold">
                                <FileText className="h-3.5 w-3.5" />
                                View Poster
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Event Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditEvent(event)}
                            className="p-1.5 rounded bg-background border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1.5 rounded bg-background border border-border text-red-400 hover:text-red-500 cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => toggleExpandEvent(event.id)}
                            className="p-1.5 rounded bg-background border border-border text-foreground hover:bg-border cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          >
                            Schedule
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Timetable Sub-Panel */}
                      {isExpanded && (
                        <div className="border-t border-border bg-background/35 p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Timetable / Schedule Log</h4>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleOpenBulkImport(event)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 font-extrabold text-[10px] uppercase tracking-wider rounded border border-blue-500/30 transition-all cursor-pointer"
                              >
                                <Languages className="h-3.5 w-3.5" />
                                Import Patrika (AI)
                              </button>
                              <button 
                                onClick={() => handleNewTimetableItem(event)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#0F6E56]/25 hover:bg-[#0F6E56]/40 text-[#1D9E75] font-extrabold text-[10px] uppercase tracking-wider rounded border border-[#1D9E75]/30 transition-all cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Activity
                              </button>
                            </div>
                          </div>

                          {items.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground border border-border border-dashed rounded">
                              No scheduled items added to this timetable.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-border rounded">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-background/50 text-muted-foreground font-semibold uppercase tracking-wider">
                                    <th className="p-3">Time & Date</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Title (English / Marathi)</th>
                                    <th className="p-3">Notes</th>
                                    <th className="p-3 text-center">Notifications</th>
                                    <th className="p-3 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-background/25 transition-colors">
                                      <td className="p-3 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                          {item.time}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                      </td>
                                      <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold capitalize tracking-wide ${
                                          item.category === 'pooja' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                          item.category === 'aarti' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                          item.category === 'competition' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                          item.category === 'food_stall' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                          item.category === 'visarjan' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                        }`}>
                                          {item.category.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="p-3 font-medium">
                                        <div className="font-bold text-foreground">{item.title_en}</div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">{item.title_mr}</div>
                                      </td>
                                      <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                                        <div className="truncate">{item.notes_en || '-'}</div>
                                        <div className="text-[10px] truncate text-muted-foreground/60">{item.notes_mr}</div>
                                      </td>
                                      <td className="p-3 text-center whitespace-nowrap">
                                        {item.is_triggered ? (
                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="inline-flex items-center gap-1 text-[#1D9E75] font-bold text-[10px]">
                                              <CheckCircle className="h-3.5 w-3.5" />
                                              Triggered
                                            </span>
                                            {item.triggered_at && (
                                              <span className="text-[8px] text-muted-foreground">
                                                {new Date(item.triggered_at).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleTriggerNotification(item)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1D9E75] hover:bg-[#15803d] text-white font-extrabold text-[10px] uppercase rounded transition-all cursor-pointer shadow shadow-[#1D9E75]/20"
                                            title="Broadcast Push Notification"
                                          >
                                            <Bell className="h-3 w-3" />
                                            Trigger Push
                                          </button>
                                        )}
                                      </td>
                                      <td className="p-3 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-1.5">
                                          <button
                                            onClick={() => handleEditTimetableItem(item)}
                                            className="p-1 rounded bg-background border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="Edit Item"
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTimetableItem(item.id)}
                                            className="p-1 rounded bg-background border border-border text-red-400 hover:text-red-500 cursor-pointer"
                                            title="Delete Item"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT SIDE: AD-HOC PUSH ALERTS CONSOLE (1 Column) */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Send className="h-4.5 w-4.5 text-[#1D9E75]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Manual/Ad-Hoc Push Dispatcher
                </h3>
              </div>
              
              <form onSubmit={handleSendAdhocNotification} className="space-y-4">
                <span className="text-[10px] text-muted-foreground leading-relaxed block">
                  Broadcast custom push notices immediately to all resident devices. Enter titles and alerts in both English and Marathi.
                </span>

                {/* English Header */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Alert Title (English)</label>
                  </div>
                  <input
                    type="text"
                    value={adhocTitleEn}
                    onChange={(e) => setAdhocTitleEn(e.target.value)}
                    placeholder="e.g. Lost Keys Found / Meeting Tonight"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#1D9E75]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Alert Message (English)</label>
                    <button
                      type="button"
                      disabled={translatingAdhoc || !adhocTitleEn.trim() || !adhocBodyEn.trim()}
                      onClick={() => {
                        triggerTranslation(adhocTitleEn, 'mr', setAdhocTitleMr, setTranslatingAdhoc);
                        triggerTranslation(adhocBodyEn, 'mr', setAdhocBodyMr, setTranslatingAdhoc);
                      }}
                      className="text-[9px] font-bold text-[#1D9E75] hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {translatingAdhoc ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        <>
                          <Languages className="h-3 w-3" />
                          Auto-Translate to MR
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={adhocBodyEn}
                    onChange={(e) => setAdhocBodyEn(e.target.value)}
                    placeholder="e.g. A set of keys has been found near the play area..."
                    className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground focus:outline-none focus:border-[#1D9E75] h-20 resize-none"
                    required
                  />
                </div>

                <hr className="border-border/50" />

                {/* Marathi Header */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-amber-500">Alert Title (मराठी)</label>
                  <input
                    type="text"
                    value={adhocTitleMr}
                    onChange={(e) => setAdhocTitleMr(e.target.value)}
                    placeholder="उदा. हरवलेली किल्ली सापडली..."
                    className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-amber-500">Alert Message (मराठी)</label>
                  <textarea
                    value={adhocBodyMr}
                    onChange={(e) => setAdhocBodyMr(e.target.value)}
                    placeholder="उदा. खेळण्याच्या मैदानाजवळ किल्ल्यांचा संच सापडला आहे..."
                    className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500 h-20 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingAdhoc || !adhocTitleEn.trim() || !adhocBodyEn.trim() || !adhocTitleMr.trim() || !adhocBodyMr.trim()}
                  className="w-full py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white font-bold rounded text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sendingAdhoc ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5" />
                      Broadcast Alert
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* EVENT CRUD MODAL */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{selectedEvent ? 'Edit Event Profile' : 'Launch New Event'}</h3>
              <button onClick={() => setEventModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">Event Name (English)</label>
                <input 
                  type="text" 
                  value={eventNameEn}
                  onChange={(e) => setEventNameEn(e.target.value)}
                  placeholder="e.g. Ganesh Utsav 2026"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-muted-foreground">Description (English)</label>
                  <button
                    type="button"
                    disabled={translatingEvent || !eventNameEn.trim() || !eventDescEn.trim()}
                    onClick={() => {
                      triggerTranslation(eventNameEn, 'mr', setEventNameMr, setTranslatingEvent);
                      triggerTranslation(eventDescEn, 'mr', setEventDescMr, setTranslatingEvent);
                    }}
                    className="text-[9px] font-bold text-[#1D9E75] hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {translatingEvent ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                    Auto-Translate to मराठी
                  </button>
                </div>
                <textarea 
                  value={eventDescEn}
                  onChange={(e) => setEventDescEn(e.target.value)}
                  placeholder="Details about the event, celebrations, location, rules etc..."
                  className="w-full bg-background border border-border rounded p-2.5 h-16 resize-none focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <hr className="border-border/50" />

              <div className="space-y-2">
                <label className="font-bold text-amber-500">Event Name (मराठी)</label>
                <input 
                  type="text" 
                  value={eventNameMr}
                  onChange={(e) => setEventNameMr(e.target.value)}
                  placeholder="उदा. गणेशोत्सव २०२६"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-amber-500">Description (मराठी)</label>
                <textarea 
                  value={eventDescMr}
                  onChange={(e) => setEventDescMr(e.target.value)}
                  placeholder="उत्सवाची माहिती, उत्सव मंडळ, स्थान, नियम..."
                  className="w-full bg-background border border-border rounded p-2.5 h-16 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              <hr className="border-border/50" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-muted-foreground">Start Date</label>
                  <input 
                    type="date" 
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-muted-foreground">End Date</label>
                  <input 
                    type="date" 
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">Poster Image URL (Optional)</label>
                <input 
                  type="url" 
                  value={eventPosterUrl}
                  onChange={(e) => setEventPosterUrl(e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">Status</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value as any)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active / Running</option>
                  <option value="completed">Completed / Archived</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-border font-bold rounded uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingEvent}
                  className="px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white font-bold rounded uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEvent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMETABLE ACTIVITY MODAL */}
      {timetableModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{selectedTimetableItem ? 'Edit Activity Schedule' : 'Schedule New Activity'}</h3>
              <button onClick={() => setTimetableModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTimetableItem} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-muted-foreground">Date</label>
                  <input 
                    type="date" 
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-muted-foreground">Time</label>
                  <input 
                    type="text" 
                    value={itemTime}
                    onChange={(e) => setItemTime(e.target.value)}
                    placeholder="e.g. 8:30 PM / 10:00 AM"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as any)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                >
                  <option value="pooja">Pooja (पूजा)</option>
                  <option value="aarti">Aarti & Prasad (आरती)</option>
                  <option value="competition">Competition (स्पर्धा)</option>
                  <option value="food_stall">Food Stall (प्रसाद/भोजन)</option>
                  <option value="visarjan">Visarjan (विसर्जन)</option>
                  <option value="other">Other Activity (इतर)</option>
                </select>
              </div>

              <hr className="border-border/50" />

              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">Activity Title (English)</label>
                <input 
                  type="text" 
                  value={itemTitleEn}
                  onChange={(e) => setItemTitleEn(e.target.value)}
                  placeholder="e.g. Aarti & Evening Prasad distribution"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-muted-foreground">Notes / Details (English)</label>
                  <button
                    type="button"
                    disabled={translatingItem || !itemTitleEn.trim() || !itemNotesEn.trim()}
                    onClick={() => {
                      triggerTranslation(itemTitleEn, 'mr', setItemTitleMr, setTranslatingItem);
                      triggerTranslation(itemNotesEn, 'mr', setItemNotesMr, setTranslatingItem);
                    }}
                    className="text-[9px] font-bold text-[#1D9E75] hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {translatingItem ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                    Auto-Translate to मराठी
                  </button>
                </div>
                <input 
                  type="text" 
                  value={itemNotesEn}
                  onChange={(e) => setItemNotesEn(e.target.value)}
                  placeholder="e.g. Sponsored by Wings B & C / Open to all ages"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <hr className="border-border/50" />

              <div className="space-y-2">
                <label className="font-bold text-amber-500">Activity Title (मराठी)</label>
                <input 
                  type="text" 
                  value={itemTitleMr}
                  onChange={(e) => setItemTitleMr(e.target.value)}
                  placeholder="उदा. महाआरती आणि महाप्रसाद वाटप"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-amber-500">Notes / Details (मराठी)</label>
                <input 
                  type="text" 
                  value={itemNotesMr}
                  onChange={(e) => setItemNotesMr(e.target.value)}
                  placeholder="उदा. विंग B आणि C द्वारे प्रायोजित..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setTimetableModalOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-border font-bold rounded uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingItem}
                  className="px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white font-bold rounded uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {savingItem && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Schedule Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT PATRIKA AI MODAL */}
      {bulkImportModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-border rounded-xl shadow-2xl p-6 my-8 text-foreground flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-foreground">AI Timetable Patrika Importer & Translator</h3>
              </div>
              <button 
                onClick={() => setBulkImportModalOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[350px]">
              {/* Left Column: Raw Timetable Input */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Paste Raw Schedule Flyer / Notice Text
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste raw English/Marathi timetable here. For example:
Sept 7, Sat: 2pm arrival of deity, 3pm pranpratishtha, 8pm aarti.
Sept 8, Sun: 8:30am daily worship, 8pm aarti - B & C wings, kids musical chair at 5pm."
                  className="flex-1 w-full bg-zinc-900 border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:border-blue-500 font-mono resize-none h-[220px]"
                />
                <button
                  onClick={handleTranslatePatrika}
                  disabled={translatingPatrika || !bulkText.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 disabled:text-zinc-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow transition-colors"
                >
                  {translatingPatrika ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI Translating & Formatting...
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4" />
                      ✨ Translate & Structure Patrika
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: AI Translation Preview */}
              <div className="flex flex-col gap-3 bg-zinc-900/50 border border-border/80 rounded-lg p-4 max-h-[360px] overflow-y-auto">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Structured Preview (Marathi Notice Format)
                </label>
                
                {!parsedPatrika && !translatingPatrika && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                    <Info className="h-8 w-8 text-zinc-600" />
                    <p className="text-xs">Paste schedule text on the left and click translate to view preview.</p>
                  </div>
                )}

                {translatingPatrika && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    <p className="text-xs">AI is parsing events, structuring categories, and converting numbers to Devanagari...</p>
                  </div>
                )}

                {parsedPatrika && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-zinc-900 border border-border rounded-lg space-y-1">
                      <div className="font-bold text-blue-400 text-sm">{parsedPatrika.event_title} {parsedPatrika.event_year}</div>
                      {parsedPatrika.committee_name && (
                        <div className="text-[10px] text-muted-foreground">आयोजक: {parsedPatrika.committee_name}</div>
                      )}
                      {parsedPatrika.venue_note && (
                        <div className="text-[10px] text-amber-500/80 italic mt-1">📝 {parsedPatrika.venue_note}</div>
                      )}
                    </div>

                    {parsedPatrika.admin_warnings && parsedPatrika.admin_warnings.length > 0 && (
                      <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 rounded-lg space-y-1">
                        <div className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Parser Warnings
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                          {parsedPatrika.admin_warnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="font-bold text-zinc-300">Days & Timeline:</div>
                      {parsedPatrika.days.map((day: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-zinc-900 border border-border/60 rounded space-y-2">
                          <div className="flex items-center justify-between border-b border-border/50 pb-1">
                            <span className="font-bold text-amber-400">{day.date_display} ({day.day_name})</span>
                            {day.day_title_suffix && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] rounded font-bold">
                                {day.day_title_suffix}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {day.events.map((ev: any, evIdx: number) => (
                              <div key={evIdx} className="flex justify-between items-start gap-2 text-[11px]">
                                <div>
                                  <span className="font-semibold text-zinc-400 mr-2">{ev.time_display}</span>
                                  <span className="text-foreground">{ev.text}</span>
                                  {ev.tag && <span className="text-[9px] text-muted-foreground block mt-0.5">🏷️ {ev.tag}</span>}
                                </div>
                                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded uppercase font-semibold">
                                  {ev.icon}
                                </span>
                              </div>
                            ))}
                          </div>
                          {day.family_note && (
                            <div className="text-[9px] text-emerald-400 mt-1 italic">
                              🙏 {day.family_note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setBulkImportModalOpen(false)}
                className="px-4 py-2 border border-border hover:bg-zinc-800 font-bold rounded uppercase text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmBulkImport}
                disabled={!parsedPatrika || importingPatrika}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded uppercase text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors"
              >
                {importingPatrika && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm and Import Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
