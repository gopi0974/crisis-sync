import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_BUILDING_ID } from '../utils/constants';
import { Camera, RefreshCw } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg">
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
          <button 
            onClick={() => navigate(`/onboarding/${DEFAULT_BUILDING_ID}`)}
            className="w-full border border-card-border hover:bg-card-border text-white py-3 rounded-lg font-semibold transition"
          >
            Enter Manually
          </button>
        </div>
      </div>
    </div>
  );
}
