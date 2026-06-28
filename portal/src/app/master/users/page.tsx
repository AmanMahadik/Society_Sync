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

  const filtered = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.societies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">
            SocietySync <span className="text-red-500 text-xs uppercase tracking-wider font-bold ml-1">Master</span>
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/master/dashboard" className="text-zinc-400 hover:text-white">Requests</Link>
          <Link href="/master/societies" className="text-zinc-400 hover:text-white">Societies</Link>
          <Link href="/master/users" className="text-red-500 hover:text-red-400">Users</Link>
        </nav>
        <button 
          onClick={() => { supabase.auth.signOut(); router.push('/master/login'); }}
          className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all border border-zinc-800"
        >
          Sign Out
        </button>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">User Administration</h2>
            <p className="text-zinc-500 text-sm">Control global application roles and access privileges</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or society..."
            className="max-w-xs w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
          />
        </div>

        {/* USERS TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Retrieving user database profiles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No registered user profiles found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Affiliated Society</th>
                    <th className="p-4">Flat Info</th>
                    <th className="p-4">Registered On</th>
                    <th className="p-4 text-center">User Role</th>
                    <th className="p-4 text-center">Update Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-zinc-950 flex items-center justify-center border border-zinc-800 text-zinc-500 shrink-0">
                          {user.role === 'master_admin' ? <Award className="h-4 w-4 text-red-500" /> : <User className="h-4 w-4" />}
                        </div>
                        {user.full_name || 'N/A'}
                      </td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">{user.email}</td>
                      <td className="p-4 text-zinc-300">
                        {user.role === 'master_admin' ? (
                          <span className="text-zinc-500 italic">Global Superuser</span>
                        ) : (
                          user.societies?.name || <span className="text-yellow-600 font-semibold">Unlinked / No Society</span>
                        )}
                      </td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">
                        {user.wing && user.flat_number ? `${user.wing}-${user.flat_number}` : 'N/A'}
                      </td>
                      <td className="p-4 text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'master_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          (user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400')
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, user.role, e.target.value as any)}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
                        >
                          <option value="resident">Resident</option>
                          <option value="admin">Admin</option>
                          <option value="master_admin">Master Admin</option>
                        </select>
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
