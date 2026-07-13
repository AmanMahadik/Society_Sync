'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, User, Mail, ShieldAlert, Award } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'master_admin' | 'admin' | 'resident';
  society_id?: string;
  wing?: string;
  flat_number?: string;
  created_at: string;
  societies?: {
    name: string;
  };
}

export default function UsersListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (!profile || profile.role !== 'master_admin') {
        router.push('/master/login');
        return;
      }

      // Fetch profiles with a join to societies to show their society name
      const { data, error } = await supabase
        .from('profiles')
        .select('*, societies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: string, newRole: 'master_admin' | 'admin' | 'resident') => {
    if (currentRole === newRole) return;
    
    const confirmChange = window.confirm(`Are you sure you want to change this user's role from "${currentRole}" to "${newRole}"?`);
    if (!confirmChange) return;

    setUpdatingId(userId);
    try {
      // Call secure security definer RPC function to change the user's role in the database
      const { error } = await supabase.rpc('toggle_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      alert(`Role successfully changed to ${newRole}!`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = window.confirm(`WARNING: Are you sure you want to permanently delete the user "${userEmail}"? This action CANNOT be undone and will delete all their profile info, flats, and auth data.`);
    if (!confirmDelete) return;

    const finalConfirm = window.prompt(`To confirm deletion, type the user's email address "${userEmail}":`);
    if (finalConfirm !== userEmail) {
      alert("Email mismatch. Deletion cancelled.");
      return;
    }

    setUpdatingId(userId);
    try {
      const { error } = await supabase.rpc('delete_user_permanently', {
        target_user_id: userId
      });

      if (error) throw error;

      alert(`User ${userEmail} and all their associated data have been permanently deleted.`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete user.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.societies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0e10] text-[#f2f2f0] flex flex-col selection:bg-[#dc2626] selection:text-[#0b0e10]">
      {/* NAVBAR */}
      <header className="border-b border-[#1c2224] bg-[#0b0e10] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-[#dc2626] flex items-center justify-center font-bold text-white shadow-lg shadow-[#dc2626]/20">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#f2f2f0]">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-950/20 text-red-500 border border-red-500/30">
            Master admin
          </span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <Link href="/master/dashboard" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Requests</Link>
            <Link href="/master/societies" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Societies</Link>
            <Link href="/master/users" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Users</Link>
          </nav>
          <button 
            onClick={() => { supabase.auth.signOut(); router.push('/master/login'); }}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-[#111517] hover:bg-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0] transition-all border border-[#1c2224] flex items-center gap-1.5"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">User Administration</h2>
            <p className="text-[#8a8f91] text-xs">Control global application roles and access privileges</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or society..."
            className="max-w-xs w-full bg-[#111517] border border-[#1c2224] rounded-lg p-2.5 text-xs text-[#f2f2f0] focus:outline-none focus:border-[#dc2626]"
          />
        </div>

        {/* USERS TABLE */}
        <div className="bg-[#111517] border border-[#1c2224] rounded-lg overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-[#8a8f91] text-xs">
              Retrieving user database profiles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#8a8f91] text-xs">
              No registered user profiles found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1c2224] bg-[#0b0e10]/40 text-[#8a8f91] font-semibold uppercase tracking-wider">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Affiliated Society</th>
                    <th className="p-4">Flat Info</th>
                    <th className="p-4">Registered On</th>
                    <th className="p-4 text-center">User Role</th>
                    <th className="p-4 text-center">Update Role</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2224]">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-[#0b0e10]/30 transition-colors">
                      <td className="p-4 font-bold text-[#f2f2f0] flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-[#0b0e10] flex items-center justify-center border border-[#1c2224] text-[#8a8f91] shrink-0">
                          {user.role === 'master_admin' ? <Award className="h-4 w-4 text-[#dc2626]" /> : <User className="h-4 w-4" />}
                        </div>
                        {user.full_name || 'N/A'}
                      </td>
                      <td className="p-4 text-[#8a8f91] font-mono text-xs">{user.email}</td>
                      <td className="p-4 text-[#f2f2f0]">
                        {user.role === 'master_admin' ? (
                          <span className="text-[#8a8f91] italic">Global Superuser</span>
                        ) : (
                          user.societies?.name || <span className="text-[#854F0B] font-semibold">Unlinked / No Society</span>
                        )}
                      </td>
                      <td className="p-4 text-[#8a8f91] font-mono text-xs">
                        {user.wing && user.flat_number ? `${user.wing}-${user.flat_number}` : 'N/A'}
                      </td>
                      <td className="p-4 text-[#8a8f91]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          user.role === 'master_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          (user.role === 'admin' ? 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20' : 'bg-[#0b0e10] text-[#8a8f91] border border-[#1c2224]')
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, user.role, e.target.value as any)}
                          className="bg-[#0b0e10] border border-[#1c2224] rounded px-2.5 py-1 text-xs text-[#f2f2f0] focus:outline-none focus:border-[#dc2626]"
                        >
                          <option value="resident">Resident</option>
                          <option value="admin">Admin</option>
                          <option value="master_admin">Master Admin</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          disabled={updatingId === user.id || user.role === 'master_admin'}
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="px-3 py-1.5 bg-[#993C1D]/10 text-[#dc2626] border border-[#dc2626]/20 hover:bg-[#dc2626]/10 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
