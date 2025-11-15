// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Home() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Missing user id in URL.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    async function fetchProfile() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`http://localhost:3000/api/auth/profile/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // include token if your server requires auth; harmless if not required
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.status === 401 || res.status === 403) {
          // not authorized — redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Failed to fetch profile.');
          return;
        }

        setProfile(data.user);
      } catch (err) {
        console.error('fetchProfile error', err);
        setError('Network error while fetching profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <img src="https://placehold.co/64x64/007bff/ffffff?text=FP" alt="logo" className="w-12 h-12 rounded" />
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {profile.name}</h1>
          <p className="text-sm text-gray-600">Account: {profile.account_number}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-lg font-medium mb-2">Profile</h2>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Phone:</strong> {profile.phone}</p>
          <p><strong>Balance:</strong> ₹{profile.balance}</p>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-lg font-medium mb-2">Scanned Images</h2>
          <div className="grid grid-cols-3 gap-2">
            {profile.scannedImage && Object.entries(profile.scannedImage).map(([side, url]) => (
              <div key={side} className="text-center">
                {url ? (
                  <img src={url} alt={side} className="w-full h-24 object-cover rounded" />
                ) : (
                  <div className="h-24 flex items-center justify-center bg-gray-100 rounded text-xs">{side}</div>
                )}
                <div className="text-xs mt-1">{side}</div>
              </div>
            ))}
          </div>
        </div>
        <button className='text-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold cursor-pointer' onClick={()=> navigate('/pay')}>Pay</button>
      </section>
    </div>
  );
}
