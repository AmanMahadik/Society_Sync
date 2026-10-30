'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DigiLockerComponent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || 'register';
  const societyId = searchParams.get('societyId') || 'new';
  const redirectUri = searchParams.get('redirectUri') || 'societysync://aadhaar-verification';

  const [step, setStep] = useState<'login' | 'otp' | 'consent' | 'success'>('login');
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);

  // Countdown timer for OTP
  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!aadhaarInput.trim() || aadhaarInput.trim().length < 10) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number or 10-digit mobile number.');
      return;
    }

    if (pinInput.trim().length !== 6) {
      setErrorMsg('Please enter your 6-digit security PIN.');
      return;
    }

    // Advance to simulated OTP verification
    setStep('otp');
    setTimer(60);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpInput.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP sent to your registered mobile.');
      return;
    }

    // OTP accepted, advance to consent page
    setStep('consent');
  };

  const handleAllowConsent = () => {
    setStep('success');

    const mockKycData = {
      name: 'Sairaj Patil',
      aadhaarNo: '123456789012',
      dob: '1995-04-12',
      gender: 'Male',
      address: 'Flat 102, Wing B, Sai Shraddha Park, Spine Road, Pune, Maharashtra - 411019'
    };

    if (userId === 'register') {
      // 1. Web Portal Registration (Parent Window PostMessage)
      if (window.opener) {
        window.opener.postMessage({
          type: 'DIGILOCKER_VERIFIED',
          data: mockKycData
        }, '*');
      }
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      // 2. Mobile App (Expo Deep Link Redirect)
      const connector = redirectUri.includes('?') ? '&' : '?';
      const redirectUrl = `${redirectUri}${connector}status=success&name=${encodeURIComponent(mockKycData.name)}&aadhaarNo=${mockKycData.aadhaarNo}&userId=${userId}&societyId=${societyId}`;
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    }
  };

  const handleDenyConsent = () => {
    if (userId === 'register') {
      if (window.opener) {
        window.opener.postMessage({
          type: 'DIGILOCKER_DENIED',
          error: 'User denied document consent.'
        }, '*');
      }
      window.close();
    } else {
      const connector = redirectUri.includes('?') ? '&' : '?';
      window.location.href = `${redirectUri}${connector}status=failed&error=ConsentDenied&userId=${userId}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-zinc-800 flex flex-col font-sans">
      {/* DigiLocker Official Brand Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gov logo" className="h-9 w-9 object-contain" />
          <div className="h-6 w-[1px] bg-zinc-200" />
          <span className="font-extrabold text-lg tracking-tight text-blue-900">
            DigiLocker
          </span>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold uppercase">
          National e-Governance Division
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8 shadow-md">
          {/* STEP 1: LOGIN */}
          {step === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Sign In to your account</h2>
                <p className="text-xs text-zinc-500 mt-1">Access your Aadhaar credentials securely</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-zinc-500 uppercase">Aadhaar / Mobile Number</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaarInput}
                    onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 12-digit Aadhaar number"
                    className="border border-zinc-300 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-700 text-zinc-800"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-zinc-500 uppercase">6-Digit Security PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN"
                    className="border border-zinc-300 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-700 text-zinc-800 tracking-widest"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#E05626] hover:bg-[#c94518] text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
              >
                Sign In
              </button>

              <div className="text-center text-[10px] text-zinc-400 border-t border-zinc-100 pt-4">
                Your authentication details are secured by government standard encryption protocols.
              </div>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Enter OTP</h2>
                <p className="text-xs text-zinc-500 mt-1">A one-time passcode has been sent to Aadhaar linked mobile number</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-extrabold text-zinc-500 uppercase text-center">6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="border border-zinc-300 rounded-lg p-3 text-center text-lg focus:outline-none focus:border-blue-700 text-zinc-800 tracking-widest font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
              >
                Submit OTP
              </button>

              <div className="text-center text-xs">
                {timer > 0 ? (
                  <span className="text-zinc-500">Resend OTP in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTimer(60)}
                    className="text-blue-700 hover:underline font-bold cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: DOCUMENT CONSENT */}
          {step === 'consent' && (
            <div className="space-y-6">
              <div className="text-center border-b border-zinc-100 pb-4">
                <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Confirm Consent</h2>
                <p className="text-xs text-zinc-500 mt-1">Document access authorization request</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-2 leading-relaxed">
                <p className="font-bold uppercase tracking-wider text-[10px]">Permission Requested:</p>
                <p className="font-semibold text-zinc-800 text-sm">SocietySync App Platform</p>
                <p className="text-zinc-500">wants to read your Aadhaar details from issued documents folder:</p>
                <ul className="list-disc pl-4 space-y-1 mt-2 text-zinc-700">
                  <li>Full Name & Gender</li>
                  <li>Date of Birth (DOB)</li>
                  <li>Permanent Address Coordinates</li>
                  <li>Photograph</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleDenyConsent}
                  className="flex-1 py-3 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-lg text-sm transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllowConsent}
                  className="flex-1 py-3 bg-[#E05626] hover:bg-[#c94518] text-white font-bold rounded-lg text-sm transition-colors shadow-sm cursor-pointer text-center"
                >
                  Allow Access
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS REDIRECT */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 bg-emerald-50 border border-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl text-emerald-500">✓</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-800">Verification Successful</h2>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                Your Aadhaar identity has been successfully authenticated by DigiLocker. Returning back to the application...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DigiLockerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3F4F6] text-zinc-800 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 mb-4"></div>
        <p className="text-zinc-600 font-medium">Loading DigiLocker Gateway...</p>
      </div>
    }>
      <DigiLockerComponent />
    </Suspense>
  );
}
