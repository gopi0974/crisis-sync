import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_BUILDING_ID } from '../utils/constants';
import { Camera, RefreshCw, ArrowLeft } from 'lucide-react';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Try to find the back camera (environment)
        const backCameraIndex = devices.findIndex(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        );
        const startIndex = backCameraIndex !== -1 ? backCameraIndex : 0;
        setCurrentCameraIndex(startIndex);
        startScanning(devices[startIndex].id);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
    });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async (cameraId) => {
    if (!scannerRef.current) return;
    
    try {
      if (isScanning) {
        await scannerRef.current.stop();
      }
      
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (result) => {
          setScanResult(result);
          stopScanning();
          setTimeout(() => navigate(`/onboarding/${result || DEFAULT_BUILDING_ID}`), 1000);
        },
        (errorMessage) => {
          // ignore
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Failed to start scanner", err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    startScanning(cameras[nextIndex].id);
  };

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    try {
      const { db } = await import('../firebase/config');
      const { ref, get, query, orderByChild, equalTo } = await import('firebase/database');
      
      // Check if ID is the mock hackathon ID or exists in Database
      if (code === 'HOTEL_HYD_001' || code === 'APOLLO_1234') {
         navigate(`/onboarding/${code}`);
         return;
      }

      // Query admins node for the buildingId
      const adminsRef = ref(db, 'admins');
      const q = query(adminsRef, orderByChild('buildingId'), equalTo(code));
      const snapshot = await get(q);
      
      if (snapshot.exists()) {
        navigate(`/onboarding/${code}`);
      } else {
        const toast = (await import('react-hot-toast')).default;
        toast.error("Invalid Building ID. Please check and try again.");
      }
    } catch (err) {
      console.error("Verification failed", err);
      const toast = (await import('react-hot-toast')).default;
      toast.error("Network error. Could not verify Building ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg relative">
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-8 left-8 text-text-secondary hover:text-white transition flex items-center gap-2 text-lg font-semibold z-50"
      >
        <ArrowLeft size={24} /> Back
      </button>
      <div className="max-w-md w-full bg-card-bg p-8 rounded-xl border border-card-border shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-red to-alert-red"></div>
        
        <h2 className="text-3xl font-bold mb-2 text-white">Enter Building</h2>
        <p className="text-text-secondary mb-8">Scan the building's QR code to connect.</p>
        
        <div className="relative group">
          <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border border-card-border aspect-square"></div>
          
          {cameras.length > 1 && !scanResult && (
            <button 
              onClick={switchCamera}
              className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full text-white transition-all border border-white/20 z-10"
              title="Switch Camera"
            >
              <RefreshCw size={24} />
            </button>
          )}

          {scanResult && (
            <div className="absolute inset-0 bg-success/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Camera size={32} />
              </div>
              <h3 className="font-bold text-2xl">Connected!</h3>
              <p className="opacity-80">Redirecting...</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-card-border">
          {!showManualInput ? (
            <button 
              onClick={() => setShowManualInput(true)}
              className="w-full border border-card-border hover:bg-card-border text-white py-3 rounded-lg font-semibold transition"
            >
              Enter Manually
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <input 
                type="text"
                placeholder="Enter Unique Building ID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-black border border-card-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-alert-red transition placeholder:text-gray-600"
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="flex-1 border border-card-border text-text-secondary py-2 rounded-lg text-sm hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!manualCode.trim() || loading}
                  className="flex-[2] bg-alert-red disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold hover:bg-red-600 transition"
                >
                  {loading ? 'Verifying...' : 'Access Building'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
