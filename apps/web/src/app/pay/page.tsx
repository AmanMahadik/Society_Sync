'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';

function PaymentComponent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const keyId = searchParams.get('keyId');
  const amount = searchParams.get('amount');
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const contact = searchParams.get('contact') || '';
  const campaignTitle = searchParams.get('campaignTitle') || 'Chanda Contribution';

  const [status, setStatus] = useState<'loading' | 'script-loaded' | 'verifying' | 'success' | 'failed'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCheckout = () => {
    if (!orderId || !keyId || !amount) {
      setStatus('failed');
      setErrorMsg('Missing key parameters (orderId, keyId, or amount)');
      return;
    }

    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      setStatus('failed');
      setErrorMsg('Razorpay SDK failed to load');
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      name: 'SocietySync',
      description: campaignTitle,
      order_id: orderId,
      prefill: {
        name,
        email,
        contact,
      },
      theme: {
        color: '#00d4aa',
      },
      modal: {
        ondismiss: function () {
          setStatus('failed');
          setErrorMsg('Payment cancelled by user.');
          // Redirect back to app after small delay
          setTimeout(() => {
            window.location.href = 'societysync://chanda-detail?status=cancelled';
          }, 1500);
        },
      },
      handler: async function (response: any) {
        setStatus('verifying');
        try {
          const verifyRes = await fetch('/api/chanda/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setStatus('success');
            // Notify the webhook trigger simulation in case webhook is not live yet
            if (verifyData.mock) {
              await fetch('/api/chanda/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'payment.captured',
                  payload: {
                    payment: {
                      entity: {
                        order_id: response.razorpay_order_id,
                        id: response.razorpay_payment_id,
                        amount: Number(amount) * 100,
                      },
                    },
                  },
                }),
              }).catch((e) => console.warn('Mock webhook post failed:', e));
            }
            // Redirect back to app
            setTimeout(() => {
              window.location.href = 'societysync://chanda-history?status=success';
            }, 2000);
          } else {
            setStatus('failed');
            setErrorMsg(verifyData.error || 'Verification failed');
            setTimeout(() => {
              window.location.href = 'societysync://chanda-detail?status=failed';
            }, 2000);
          }
        } catch (e: any) {
          setStatus('failed');
          setErrorMsg(e.message || 'Verification request failed');
          setTimeout(() => {
            window.location.href = 'societysync://chanda-detail?status=failed';
          }, 2000);
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  useEffect(() => {
    // If Script is already loaded, start checkout
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      setStatus('script-loaded');
      startCheckout();
    }
  }, [orderId, keyId]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E2E8F0] flex flex-col items-center justify-center p-6 font-sans">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => {
          setStatus('script-loaded');
          startCheckout();
        }}
        onError={() => {
          setStatus('failed');
          setErrorMsg('Failed to load Razorpay SDK. Please check your internet connection.');
        }}
      />

      <div className="w-full max-w-md bg-[#181818] border border-[#262626] rounded-2xl p-8 text-center shadow-xl">
        <h1 className="text-2xl font-extrabold text-[#00d4aa] mb-2 tracking-wide uppercase">
          SocietySync Pay Desk
        </h1>
        <p className="text-sm text-[#8A8A8A] mb-8">
          Secure, verified UPI & online gateway
        </p>

        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00d4aa] mb-4"></div>
            <p className="text-[#E2E8F0] font-medium">Initializing secure gateway...</p>
            <p className="text-xs text-[#8A8A8A] mt-2">Loading checkout libraries</p>
          </div>
        )}

        {status === 'script-loaded' && (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00d4aa] mb-4"></div>
            <p className="text-[#E2E8F0] font-medium">Opening Razorpay desk...</p>
            <p className="text-xs text-[#8A8A8A] mt-2">Redirecting to UPI/Card options</p>
            <button
              onClick={startCheckout}
              className="mt-6 px-6 py-2 bg-[#00d4aa] hover:bg-[#00bda0] text-[#0F0F0F] font-bold rounded-lg transition-colors text-sm"
            >
              Open Payment Dialog Manually
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00d4aa] mb-4"></div>
            <p className="text-[#E2E8F0] font-medium">Verifying transaction...</p>
            <p className="text-xs text-[#8A8A8A] mt-2">Please do not close this window or hit back</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="h-16 w-16 bg-[#00d4aa15] border border-[#00d4aa] rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl text-[#00d4aa]">✓</span>
            </div>
            <p className="text-lg font-bold text-white">Payment Successful!</p>
            <p className="text-sm text-[#8A8A8A] mt-2">Generating e-receipt and returning to app...</p>
            <a
              href="societysync://chanda-history?status=success"
              className="mt-6 text-sm text-[#00d4aa] underline hover:text-[#00bda0]"
            >
              Click here if you are not redirected
            </a>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center py-6">
            <div className="h-16 w-16 bg-red-950/20 border border-red-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl text-red-500">✕</span>
            </div>
            <p className="text-lg font-bold text-white">Payment Incomplete</p>
            <p className="text-sm text-red-400 mt-2">{errorMsg || 'Something went wrong.'}</p>
            
            <div className="flex flex-col gap-3 w-full mt-8">
              <button
                onClick={startCheckout}
                className="w-full py-3 bg-[#00d4aa] hover:bg-[#00bda0] text-[#0F0F0F] font-bold rounded-xl transition-colors text-sm"
              >
                Retry Payment
              </button>
              <a
                href="societysync://chanda-detail?status=failed"
                className="w-full py-3 bg-[#262626] hover:bg-[#333] text-[#E2E8F0] font-medium rounded-xl transition-colors text-sm block"
              >
                Return to Campaign
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F0F] text-[#E2E8F0] flex flex-col items-center justify-center p-6 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00d4aa] mb-4"></div>
        <p className="text-[#E2E8F0] font-medium">Loading pay desk...</p>
      </div>
    }>
      <PaymentComponent />
    </Suspense>
  );
}
