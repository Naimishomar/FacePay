import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'

function Pay() {
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!amount || !pin) {
            setError('Please enter both amount and pin.');
            return;
        }
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/payment/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, pin }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                setError(data.message || 'Payment failed');
                return;
            }

            // Store JWT (or use cookies/HttpOnly in production)
            localStorage.setItem('token', data.token);
            // Optionally store minimal user info
            localStorage.setItem('user', JSON.stringify(data.user));

            navigate('/home/123');
        } catch (err) {
            console.error('Payment error', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };
  return (

    <div className='w-full h-screen flex flex-col justify-center items-center'>
        <div className='w-md flex flex-col gap-4 items-center'>
            <h1 className='text-3xl font-bold'>Pay</h1>
            <input type="text" placeholder="Enter amount" className='w-full border p-2 rounded-lg'/>
            <input type="text" placeholder='Pin' className='w-full border p-2 rounded-lg'/>
            <button className='text-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold cursor-pointer w-full'>Pay</button>

        </div>
    </div>
  )
}

export default Pay