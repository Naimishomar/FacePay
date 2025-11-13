import React, { useState } from 'react';
import FacenPay from '../assets/FacenPay.png';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [sendOtp, setSendOtp] = useState(false);
  const navigate = useNavigate();
  
  // Define a consistent width for form elements
  const inputWidth = 'w-full max-w-sm'; 

  // --- Shadcn Style Classes ---
  // Uses border, slight shadow-sm, and rounded-lg for the card aesthetic
  const cardClasses = "border bg-card text-card-foreground shadow-sm p-6 rounded-lg";
  const inputClasses = "flex flex-col space-y-1.5";
  const labelClasses = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
  const formInputClasses = "h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

  return (
    // Outer container: Centers content vertically, allows for top padding
    <div className='w-full h-screen flex flex-col justify-center items-center pt-10 bg-gray-50'>
        
      {/* The Card Component (Simulated Shadcn Style) */}
      <div className={`${cardClasses} w-full max-w-md mx-auto`}>
          
        {/* Card Header (Image and Title concept) */}
        <div className="flex flex-col space-y-1.5 pb-4 items-center">
            <img 
                src={FacenPay} 
                alt="logo" 
                className="w-16 h-16 object-contain mb-2" // Reduced size for better card fit
            /> 
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Create Account</h3>
            <p className="text-sm text-muted-foreground">Enter your details to sign up.</p>
        </div>
        
        {/* Card Content (Form Fields) */}
        <div className="flex flex-col space-y-4">
            
            {/* Name Input */}
            <div className={inputClasses}>
                <label htmlFor="name" className={labelClasses}>Name</label>
                <input 
                    type="text" 
                    id="name" 
                    placeholder='Enter your full name' 
                    className={formInputClasses} 
                />
            </div>

            {/* Email Input */}
            <div className={inputClasses}>
                <label htmlFor="email" className={labelClasses}>Email</label>
                <input 
                    type="email" 
                    id="email" 
                    placeholder='Enter your email address' 
                    className={formInputClasses} 
                />
            </div>

            {/* Phone Number Input */}
            <div className={inputClasses}>
                <label htmlFor="phone" className={labelClasses}>Phone Number</label>
                <input 
                    type="tel" 
                    id="phone" 
                    placeholder='Enter your phone number' 
                    className={formInputClasses} 
                />
            </div>

            {/* Password Input */}
            <div className={inputClasses}>
                <label htmlFor="password" className={labelClasses}>Password</label>
                <input 
                    type="password" 
                    id="password" 
                    placeholder='Choose a password' 
                    className={formInputClasses} 
                />
            </div>

            {/* Security Number Input */}
            <div className={inputClasses}>
                <label htmlFor="security-number" className={labelClasses}>Security Number</label>
                <input 
                    type="password" 
                    placeholder='Enter Security Number' 
                    name="securityNumber" 
                    id="security-number" 
                    className={formInputClasses} 
                />
            </div>

            {/* OTP Input (Conditional) */}
            {sendOtp && 
                <div className={inputClasses}>
                    <label htmlFor="otp" className={labelClasses}>OTP</label>
                    <input 
                        type="text" 
                        id="otp" 
                        placeholder='Enter OTP' 
                        className={formInputClasses} 
                    />
                </div>
            }
        </div>
        
        {/* Card Footer (Action Button) */}
        <div className="pt-6">
            <button 
                className={`w-full h-10 bg-gray-300 text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`} 
                onClick={() => sendOtp ? navigate('/face-detection') : setSendOtp(true)}
            >
                {sendOtp ? "Sign up" : "Send OTP"}
            </button>
        </div>
      </div>
    </div>
  )
}

export default Signup