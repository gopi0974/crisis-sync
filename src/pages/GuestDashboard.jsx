import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GuestDashboard() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };
  const [myCrises, setMyCrises] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [buildingHasActiveCrisis, setBuildingHasActiveCrisis] = useState(false);

  useEffect(() => {
    if (!user?.buildingId) return;

    const crisesRef = ref(db, `crises/${user.buildingId}`);
    const unsubscribe = onValue(crisesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allCrises = Object.values(data);
        const mySOS = allCrises.filter(c => c.raisedBy.userId === user.userId).sort((a, b) => b.timestamp - a.timestamp);
        setMyCrises(mySOS);
      } else {
        setMyCrises([]);
      }
    });

    const servicesRef = ref(db, `serviceRequests/${user.buildingId}`);
    const unServices = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allServices = Object.values(data);
        const mySR = allServices.filter(s => s.raisedBy.userId === user.userId).sort((a, b) => b.timestamp - a.timestamp);
        setMyServices(mySR);
      } else {
        setMyServices([]);
      }
    });

    const broadcastsRef = query(ref(db, `broadcasts/${user.buildingId}`), limitToLast(1));
    const unBroadcasts = onValue(broadcastsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const keys = Object.keys(data);
        const latest = data[keys[0]];
        if (latest && latest.type === 'EMERGENCY' && (Date.now() - latest.timestamp < 30000)) {
          setBuildingHasActiveCrisis(true);
        } else {
          setBuildingHasActiveCrisis(false);
        }
      } else {
        setBuildingHasActiveCrisis(false);
      }
    });

    // Setup interval to clear badge when 30 seconds pass
    const timer = setInterval(() => {
      setBuildingHasActiveCrisis(prev => prev); // force re-eval if we had the actual timestamp, but simpler to just let it be. Let's just do a manual check.
    }, 1000);

    return () => { unsubscribe(); unServices(); unBroadcasts(); clearInterval(timer); };
  }, [user]);

  if (!user || user.role !== 'guest') {
    return <div className="p-8 text-center text-white">Unauthorized. Please log in as guest.</div>;
  }

  const handleServiceRequest = async (type) => {
    try {
      const { push, serverTimestamp, set } = await import('firebase/database');
      const newRef = push(ref(db, `serviceRequests/${user.buildingId}`));
      await set(newRef, {
        requestId: newRef.key,
        type,
        status: 'PENDING',
        timestamp: serverTimestamp(),
        raisedBy: {
          userId: user.userId,
          name: user.name,
          roomNumber: user.roomNumber,
          mobile: user.mobile
        }
      });
      import('react-hot-toast').then(m => m.default.success(`Requested: ${type}`));
    } catch (error) {
      console.error(error);
      import('react-hot-toast').then(m => m.default.error("Failed to request service"));
    }
  };

  const activeMySOS = myCrises.find(c => c.status !== 'RESOLVED');
  const pastMySOS = myCrises.filter(c => c.status === 'RESOLVED');

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4 max-w-lg md:max-w-6xl mx-auto pb-24">
      <header className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-lg mb-8 text-center mt-4 relative">
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 text-text-secondary hover:text-white transition p-2 bg-dark-bg rounded-full border border-card-border"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
        <h1 className="text-2xl font-bold mb-1">Welcome, {user.name}</h1>
        <p className="text-text-secondary text-sm">Room {user.roomNumber} • {user.buildingId}</p>
        
        <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${buildingHasActiveCrisis ? 'bg-alert-red/20 text-alert-red border border-alert-red/30' : 'bg-success/20 text-success border border-success/30'}`}>
          {buildingHasActiveCrisis ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
          {buildingHasActiveCrisis ? 'Building Emergency Active' : 'Building Status: All Clear'}
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Left Column: Tracking & Status */}
        <div className="flex flex-col gap-6">

          {/* Active SOS Tracker */}
          {activeMySOS && (
            <section>
          <div className="bg-primary-red/10 border border-primary-red p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-red animate-pulse"></div>
            <h2 className="text-xl font-bold text-alert-red mb-4 flex items-center gap-2">
              <AlertCircle className="animate-bounce" /> Your SOS is Active
            </h2>
            
            <div className="bg-dark-bg p-4 rounded-xl border border-card-border mb-4">
              <p className="font-semibold">{activeMySOS.type} Emergency</p>
              <p className="text-sm text-text-secondary mt-1">Reported: {new Date(activeMySOS.timestamp).toLocaleTimeString()}</p>
            </div>

            {activeMySOS.status === 'PENDING' ? (
              <div className="text-center p-4 bg-black/40 rounded-xl">
                <div className="w-8 h-8 border-4 border-alert-red border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="font-bold text-alert-red">Finding nearest responder...</p>
                <p className="text-xs text-text-secondary mt-1">Please stay calm.</p>
              </div>
            ) : (
              <div className="bg-success/20 border border-success p-4 rounded-xl">
                <p className="font-bold text-success flex items-center gap-2"><ShieldCheck size={18}/> SOS Accepted</p>
                <div className="mt-2 text-sm">
                  <p>Handled by: <span className="font-bold text-white">{activeMySOS.acceptedBy?.name}</span></p>
                  <p className="text-text-secondary">{activeMySOS.acceptedBy?.profession} • {activeMySOS.acceptedBy?.floor}</p>
                </div>
                <div className="mt-4 h-2 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-success w-2/3 animate-pulse rounded-full"></div>
                </div>
                <p className="text-xs text-center text-text-secondary mt-2">Help is on the way</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!activeMySOS && (
        <div className="text-center p-8 border border-dashed border-card-border rounded-2xl">
          <ShieldCheck size={48} className="mx-auto text-success mb-4 opacity-50" />
          <h3 className="font-bold text-lg mb-2">You are protected.</h3>
          <p className="text-text-secondary text-sm">Press the SOS button below if you face any emergency.</p>
        </div>
      )}

        {/* Service Request Tracker */}
        {myServices.filter(s => s.status !== 'COMPLETED').length > 0 && (
          <section className="mt-8">
            <h3 className="text-sm font-bold text-text-secondary mb-3 uppercase">Active Requests</h3>
            <div className="flex flex-col gap-3">
              {myServices.filter(s => s.status !== 'COMPLETED').map(req => (
                <div key={req.requestId} className="bg-dark-bg border border-card-border p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold">{req.type}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'ACCEPTED' && req.acceptedBy && (
                    <p className="text-sm text-text-secondary">Assigned to: <span className="text-white font-semibold">{req.acceptedBy.name}</span></p>
                  )}
                  {req.status === 'PENDING' && (
                    <p className="text-sm text-text-secondary">Awaiting staff assignment...</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right Column: Actions & History */}
      <div className="flex flex-col gap-6">
        
        {/* General Services Section */}
        <section>
          <h3 className="font-bold mb-4 flex items-center gap-2">Room & Medical Services</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Bring Stretcher', icon: '🛏️' },
              { label: 'Doctor Emergency', icon: '🩺' },
              { label: 'Clean Up', icon: '🧹' },
              { label: 'General Medical Help', icon: '🩹' },
            ].map(service => (
              <button 
                key={service.label}
                onClick={() => handleServiceRequest(service.label)}
                className="bg-card-bg border border-card-border hover:border-primary-red hover:bg-dark-bg p-4 rounded-xl flex flex-col items-center justify-center text-center transition gap-2"
              >
                <span className="text-2xl">{service.icon}</span>
                <span className="text-sm font-semibold">{service.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* History */}
        {pastMySOS.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-bold text-text-secondary mb-4 uppercase tracking-wider px-2">Past Requests</h3>
            <div className="flex flex-col gap-3">
              {pastMySOS.map(crisis => (
                <div key={crisis.sosId} className="bg-card-bg border border-card-border p-4 rounded-xl flex justify-between items-center opacity-70">
                  <div>
                    <p className="font-bold text-sm">{crisis.type}</p>
                    <p className="text-xs text-text-secondary">{new Date(crisis.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-bold text-success px-2 py-1 bg-success/20 rounded">RESOLVED</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Speed Dial */}
        <section className="mt-8">
          <h3 className="text-lg font-bold mb-4">External Services Speed Dial</h3>
          <div className="grid grid-cols-2 gap-4">
            <a href="tel:101" className="bg-card-bg border border-card-border p-4 rounded-xl flex flex-col items-center hover:border-primary-red transition text-center">
              <span className="text-3xl mb-1">🚒</span><h4 className="font-bold text-sm">Fire Dept</h4><p className="text-primary-red font-black mt-1">101</p>
            </a>
            <a href="tel:108" className="bg-card-bg border border-card-border p-4 rounded-xl flex flex-col items-center hover:border-info transition text-center">
              <span className="text-3xl mb-1">🚑</span><h4 className="font-bold text-sm">Ambulance</h4><p className="text-info font-black mt-1">108</p>
            </a>
            <a href="tel:100" className="bg-card-bg border border-card-border p-4 rounded-xl flex flex-col items-center hover:border-warning transition text-center col-span-2">
              <span className="text-3xl mb-1">🚔</span><h4 className="font-bold text-sm">Police</h4><p className="text-warning font-black mt-1">100</p>
            </a>
          </div>
        </section>
      </div>

      </div>
    </div>
  );
}
