import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_BUILDING_ID } from '../utils/constants';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    let isCleared = false;

    scanner.render(success, error);

    async function success(result) {
      if (isCleared) return;
      isCleared = true;
      
      try {
        await scanner.clear();
      } catch (e) {
        console.error("Camera release error:", e);
      }
      
      setScanResult(result);
      setTimeout(() => navigate(`/onboarding/${result || DEFAULT_BUILDING_ID}`), 1000);
    }

    function error(err) {
      // Ignore background scan errors
    }

    return () => {
      if (!isCleared) {
        isCleared = true;
        scanner.clear().catch(err => console.log('Failed to clear scanner on unmount', err));
      }
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg">
      <div className="max-w-md w-full bg-card-bg p-8 rounded-xl border border-card-border shadow-2xl text-center">
        <h2 className="text-3xl font-bold mb-2 text-white">Enter Building</h2>
        <p className="text-text-secondary mb-8">Scan the building's QR code to connect to the emergency network.</p>
        
        {scanResult ? (
          <div className="bg-success/20 border border-success text-success p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg">✅ Connected!</h3>
            <p className="text-sm mt-1">Redirecting to onboarding...</p>
          </div>
        ) : (
          <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border border-card-border"></div>
        )}

        <div className="mt-8 pt-6 border-t border-card-border">
          <p className="text-sm text-text-secondary mb-3">Scanner not working?</p>
          <button 
            onClick={() => navigate(`/onboarding/${DEFAULT_BUILDING_ID}`)}
            className="w-full border border-card-border hover:bg-card-border text-white py-3 rounded-lg font-semibold transition"
          >
            Enter Manually (Demo Mode)
          </button>
        </div>
      </div>
    </div>
  );
}
