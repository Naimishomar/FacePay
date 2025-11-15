import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !pin) {
      setError('Please enter both email and password.');
      return;
    }
    

    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pin }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Login failed');
        return;
      }

      // Store JWT (or use cookies/HttpOnly in production)
      localStorage.setItem('token', data.token);
      // Optionally store minimal user info
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate(`/home/${data.user.id}`);
    } catch (err) {
      console.error('Login error', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full h-screen flex flex-col justify-center items-center pt-10 bg-gray-50'>
      <div className='w-full max-w-md px-6'>
        <div className='flex flex-col space-y-4 mb-6'>
          <div className='flex flex-col space-y-1.5 pb-4 items-center'>
            <img
              src='https://placehold.co/64x64/007bff/ffffff?text=FACEPAY'
              alt='FacePay Logo'
              className='w-16 h-16 object-contain mb-2'
            />
            <h3 className='text-2xl font-semibold leading-none tracking-tight'>FacePay</h3>
            <p className='text-sm text-gray-500'>Login to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {error && <div className='text-sm text-red-600 bg-red-50 p-2 rounded'>{error}</div>}

          <input
            type="email"
            placeholder='Enter email'
            className='border px-3 py-2 rounded-lg'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder='Enter pin'
            className='border px-3 py-2 rounded-lg'
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className='w-full py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-60'
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
