'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, ArrowLeft, History, Database } from 'lucide-react';

interface AuditLog {
  id: string;
  action_type: string;
  created_at: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  profile?: { full_name: string };
  society?: { name: string };
}

export default function AuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      // Fetch logs linked to profiles and societies
      const { data, error } = await supabase
        .from('portal_audit_log')
        .select('*, profile:profiles(full_name), society:societies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/master/dashboard" className="text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-extrabold text-base tracking-tight flex items-center gap-1.5"><History className="h-5 w-5 text-red-500" /> Portal Action Audit Log</span>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center gap-2">
            <Database className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-sm text-zinc-300">System Logs</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Loading system logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No audit logs found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Performed By</th>
                    <th className="p-4">Society</th>
                    <th className="p-4 text-center">Previous Value</th>
                    <th className="p-4 text-center">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-950/20 transition-colors">
                      <td className="p-4 text-zinc-500 text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-white uppercase tracking-wider text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded ${
                          log.action_type === 'approval' ? 'bg-emerald-500/10 text-emerald-400' :
                          (log.action_type === 'rejection' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-300')
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300">{log.profile?.full_name || 'System / Admin'}</td>
                      <td className="p-4 text-zinc-300">{log.society?.name || 'N/A'}</td>
                      <td className="p-4 text-center text-zinc-500 text-xs font-mono">{log.old_value || 'None'}</td>
                      <td className="p-4 text-center text-zinc-300 text-xs font-mono">{log.new_value || 'None'}</td>
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
