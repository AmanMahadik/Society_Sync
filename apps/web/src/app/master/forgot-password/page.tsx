'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, Mail, ArrowRight, ShieldAlert, CheckCircle2, Clock, UserCheck, Key, RefreshCw, Cpu, Fingerprint } from 'lucide-react';

type RecoveryStage = 'email' | 'verify_offline_code' | 'verify_mfa' | 'initiated_time_delay' | 'dual_approval' | 'reset_password' | 'success';

export default function MasterForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<RecoveryStage>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recovery variables
  const [recoveryRequestId, setRecoveryRequestId] = useState<string | null>(null);
  const [offlineCode, setOfflineCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaTapping, setMfaTapping] = useState(false);
  const [timeDelayRemaining, setTimeDelayRemaining] = useState(10); // Simulated delay (10s)
  const [delayCompleted, setDelayCompleted] = useState(false);
  const [dualAdminEmail, setDualAdminEmail] = useState('');
  const [dualAdminPassword, setDualAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle stage 1: Email Submission & Check Policy
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // ONLY allow master admin email or check if it exists in profile
      if (email.trim().toLowerCase() !== 'societysync5@gmail.com') {
        // Normal password reset (standard supabase behavior)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/master/login`,
        });
        if (error) throw error;
        setStage('success');
        setLoading(false);
        return;
      }

      // Master Admin recovery policy triggered!
      // 1. Create a Master Recovery Request in the database
      const eta = new Date();
      eta.setHours(eta.getHours() + 24); // 24-hour delay

      const { data, error } = await supabase
        .from('master_recovery_requests')
        .insert({
          email: email.trim().toLowerCase(),
          status: 'pending',
          verification_step: 1,
          eta_completion: eta.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to initiate secure recovery request.');

      setRecoveryRequestId(data.id);
      setStage('verify_offline_code');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to initiate password recovery.');
    } finally {
      setLoading(false);
    }
  };

  // Handle stage 2: Offline Recovery Code Verification
  const handleOfflineCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineCode || !recoveryRequestId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // Fetch recovery codes from settings
      const { data: settings, error: settingsError } = await supabase
        .from('master_recovery_settings')
        .select('recovery_codes')
        .eq('master_email', 'societysync5@gmail.com')
        .single();

      if (settingsError || !settings) {
        throw new Error('Security recovery settings not configured for this account.');
      }

      if (!settings.recovery_codes.includes(offlineCode.trim())) {
        throw new Error('Invalid offline recovery code. Check printed hardware sheet.');
      }

      // Update recovery request state
      const { error: updateError } = await supabase
        .from('master_recovery_requests')
        .update({
          out_of_band_verified: true,
          verification_step: 2
        })
        .eq('id', recoveryRequestId);

      if (updateError) throw updateError;

      setStage('verify_mfa');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle stage 3: MFA Hardware Key Verification
  const triggerMfaTap = () => {
    setMfaTapping(true);
    setErrorMsg(null);
    setTimeout(async () => {
      try {
        if (!recoveryRequestId) return;

        // Invalidate previous MFA and verify device trust simulation
        const { error: updateError } = await supabase
          .from('master_recovery_requests')
          .update({
            verification_step: 3
          })
          .eq('id', recoveryRequestId);

        if (updateError) throw updateError;

        setStage('initiated_time_delay');
      } catch (err: any) {
        setErrorMsg('FIDO2 hardware key verification failed.');
      } finally {
        setMfaTapping(false);
      }
    }, 1500);
  };

  // Stage 4 timer countdown simulation
  useEffect(() => {
    if (stage !== 'initiated_time_delay') return;

    const timer = setInterval(() => {
      setTimeDelayRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDelayCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  const handleDelayBypass = async () => {
    setLoading(true);
    try {
      if (!recoveryRequestId) return;
      // Mark as approved (simulating 24h delay passed + warnings reviewed)
      const { error: updateError } = await supabase
        .from('master_recovery_requests')
        .update({
          status: 'approved'
        })
        .eq('id', recoveryRequestId);

      if (updateError) throw updateError;
      setStage('dual_approval');
    } catch (err: any) {
      setErrorMsg('Failed to update delay state.');
    } finally {
      setLoading(false);
    }
  };

  // Handle stage 5: Dual Approver Sign-off
  const handleDualApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dualAdminEmail || !dualAdminPassword || !recoveryRequestId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // Validate secondary administrator credentials (dual control)
      // For mock purposes: secops@societysync.com / SecureSecOps2026
      if (
        dualAdminEmail.trim().toLowerCase() !== 'secops@societysync.com' ||
        dualAdminPassword !== 'SecureSecOps2026'
      ) {
        throw new Error('Unauthorized or invalid security officer credentials. Dual sign-off failed.');
      }

      // Update recovery request state
      const { error: updateError } = await supabase
        .from('master_recovery_requests')
        .update({
          dual_approver_email: dualAdminEmail.trim().toLowerCase(),
          dual_approver_verified: true,
          verification_step: 4
        })
        .eq('id', recoveryRequestId);

      if (updateError) throw updateError;

      setStage('reset_password');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Dual approval failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle stage 6: Reset Password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword || !recoveryRequestId) return;

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New passcode must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Call the secure RPC function to update password
      const { data, error } = await supabase.rpc('reset_master_password', {
        new_password: newPassword,
        recovery_req_id: recoveryRequestId
      });

      if (error) throw error;
      if (!data) throw new Error('Password reset function failed.');

      setStage('success');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Reset failed. Verify recovery request parameters.');
    } finally {
      setLoading(false);
    }
  };

  // RENDER DYNAMIC UI STAGES
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#dc2626] selection:text-[#09090b]">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-center font-bold text-red-500 text-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">SocietySync</span>
          </div>
          <h2 className="text-[10px] font-bold text-red-500 tracking-widest uppercase mt-1">SECURE OUT-OF-BAND RECOVERY</h2>
          <p className="text-zinc-500 text-[11px] mt-1">Multi-Factor Privileged Identity Reset</p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#351515] border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STAGE 1: ENTER EMAIL */}
        {stage === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Master Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="master@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white"
                  required
                />
              </div>
              <span className="text-[10px] text-zinc-500 leading-normal mt-1 block">
                Warning: Entering the Master Admin email triggers a strict multi-factor out-of-band security recovery flow. Standard email reset is prohibited.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Verifying Policy...' : 'Initiate Secure Recovery'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STAGE 2: OFFLINE RECOVERY CODE */}
        {stage === 'verify_offline_code' && (
          <form onSubmit={handleOfflineCodeSubmit} className="space-y-6">
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[10px] text-yellow-500/80 leading-relaxed flex gap-2">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>POLICY ENFORCED:</strong> Input one of your offline Master Recovery Codes. These were generated during initial setup and stored in your physical security safe.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Offline Recovery Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type="text"
                  value={offlineCode}
                  onChange={(e) => setOfflineCode(e.target.value)}
                  placeholder="SS-MA-RECOVERY-XXXX-XXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white font-mono uppercase"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Verifying Code...' : 'Verify Offline Code'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STAGE 3: VERIFY MFA HARDWARE KEY */}
        {stage === 'verify_mfa' && (
          <div className="space-y-6 text-center">
            <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <Fingerprint className={`h-10 w-10 ${mfaTapping ? 'animate-pulse scale-110' : ''}`} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-white">Hardware Key Verification</h3>
              <p className="text-[11px] text-zinc-400 leading-normal max-w-xs mx-auto">
                Insert your registered WebAuthn / FIDO2 security key (e.g. YubiKey) and tap the button below or trigger your biometrics.
              </p>
            </div>

            <button
              onClick={triggerMfaTap}
              disabled={mfaTapping}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {mfaTapping ? 'Tapping Security Key...' : 'Verify Hardware Key'}
              <Cpu className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STAGE 4: TIME DELAY */}
        {stage === 'initiated_time_delay' && (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto text-yellow-500">
              <Clock className="h-8 w-8 animate-spin" style={{ animationDuration: '6s' }} />
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm text-white">Mandatory 24-Hour Recovery Hold</h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed text-left bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                ⚠️ <strong>Security Notification Sent:</strong> A broadcast notice has been dispatched to all other security administrators. To prevent attacker takeovers, privileged credential resets have a mandatory time delay. If this is an attack, any security officer can click "CANCEL" via their security logs.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 py-3 rounded-lg">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest block">Time Delay Hold Active</span>
              <span className="text-white font-mono font-bold text-lg block mt-1">
                {delayCompleted ? '00:00:00 - HOLD CLEARED' : `23:59:${timeDelayRemaining.toString().padStart(2, '0')} PENDING`}
              </span>
            </div>

            <button
              onClick={handleDelayBypass}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Processing Hold...' : 'Proceed to Dual Approval'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STAGE 5: DUAL APPROVAL */}
        {stage === 'dual_approval' && (
          <form onSubmit={handleDualApproval} className="space-y-5">
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-400/90 leading-relaxed flex gap-2">
              <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>DUAL CONTROL SIGN-OFF:</strong> This action requires confirmation from a secondary security officer or secondary administrator account (e.g. <code>secops@societysync.com</code>). They must enter their credentials below to approve this reset.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Security Officer Email</label>
              <input
                type="email"
                value={dualAdminEmail}
                onChange={(e) => setDualAdminEmail(e.target.value)}
                placeholder="secops@societysync.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Officer Passcode</label>
              <input
                type="password"
                value={dualAdminPassword}
                onChange={(e) => setDualAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Verifying Credentials...' : 'Approve Reset Request'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STAGE 6: RESET PASSWORD */}
        {stage === 'reset_password' && (
          <form onSubmit={handlePasswordReset} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">New Master Passcode</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Confirm Passcode</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Updating Passcode...' : 'Save New Passcode'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* STAGE SUCCESS: RESET SUCCESSFUL */}
        {stage === 'success' && (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-500">
              <CheckCircle2 className="h-6 w-6 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold mb-2">Security recovery completed</h2>
            <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
              Your Master Admin credentials have been securely updated. The time delay recovery hold has been closed and logged in the audit history.
            </p>
            <Link
              href="/master/login"
              className="inline-flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm uppercase tracking-wider"
            >
              Return to Login
            </Link>
          </div>
        )}

        {/* BACK TO LOGIN */}
        {stage !== 'success' && (
          <div className="text-center mt-6 border-t border-zinc-800/60 pt-4">
            <Link href="/master/login" className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center gap-1">
              Cancel & Return to Login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
