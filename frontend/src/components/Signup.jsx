import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Fixed compilation error by replacing local asset import with a public placeholder URL.
const LOGO_URL = "https://placehold.co/64x64/007bff/ffffff?text=FACEPAY"; 

// --- Shared Style Classes (Moved outside Signup for cleaner function body) ---
const cardClasses = "border bg-card text-card-foreground shadow-sm p-6 rounded-lg";
const inputClasses = "flex flex-col space-y-1.5";
const labelClasses = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
const formInputClasses = "h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
const primaryButtonClasses = "w-full h-10 bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function Signup() {
  const navigate = useNavigate();
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    account_number: '',
    pin: '',
    otp: ''
  });

  // Ref for the OTP input so we can focus when modal opens
  const otpRef = useRef(null);

  useEffect(() => {
    if (showOtpModal && otpRef.current) {
      // Focus and place caret in the OTP input when modal opens
      otpRef.current.focus();
      otpRef.current.select?.();
    }
  }, [showOtpModal]);

  // Generic handler but with a few sanitizations for numeric fields
  const handleChange = (e) => {
    const { id, value } = e.target;

    // Enforce digits-only for these fields
    if (id === 'phone' || id === 'account_number' || id === 'pin' || id === 'otp') {
      // allow only digits
      const digitsOnly = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [id]: digitsOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // OTP Modal component (blocking backdrop)
  const OTPVerificationModal = ({ isOpen, onClose, onVerify }) => {
    if (!isOpen) return null;

    const otpValue = formData.otp;
    const isOtpValid = otpValue.length === 4;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
        // Keep modal accessible by trapping focus to the modal in a full implementation.
        aria-modal="true"
        role="dialog"
      >
        <div className={`${cardClasses} w-full max-w-xs mx-auto space-y-4 bg-white transform transition-transform duration-300`}>
          <h3 className="text-xl font-semibold text-center">Enter Verification Code</h3>
          <p className="text-sm text-gray-500 text-center">
            A 4-digit OTP has been sent to <strong>{formData.phone}</strong>.
          </p>

          <div className={inputClasses}>
            <label htmlFor="otp" className={labelClasses}>Verification OTP</label>
            <input
              ref={otpRef}
              type="text"
              id="otp"
              placeholder="_ _ _ _"
              className={formInputClasses + " text-center text-lg tracking-[0.2em]"}
              value={otpValue}
              onChange={handleChange}
              maxLength={4}
              inputMode="numeric"
              pattern="\d*"
              required
            />
          </div>

          <button
            className={primaryButtonClasses}
            onClick={onVerify}
            disabled={!isOtpValid}
          >
            Verify & Proceed
          </button>

          <button
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const handleSendOtp = () => {
    // Basic client-side validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.account_number || !formData.pin) {
      console.error("Please fill all required fields before requesting OTP.");
      return;
    }

    // Additional length checks:
    if (formData.phone.length !== 10) {
      console.error("Phone number must be 10 digits.");
      return;
    }
    if (formData.account_number.length !== 10) {
      console.error("Account number must be 10 digits.");
      return;
    }
    if (formData.pin.length !== 6) {
      console.error("PIN must be 6 digits.");
      return;
    }

    // Simulate API call to send OTP
    console.log("Submitting initial data and requesting OTP for:", formData.phone);

    // On success:
    setIsOtpSent(true);
    setShowOtpModal(true);
  };

  const handleOtpVerification = () => {
    if (formData.otp.length !== 4) {
      console.error("Invalid OTP length.");
      return;
    }

    // Simulate OTP verification API call
    console.log("Verifying OTP:", formData.otp);

    // If verification success:
    setShowOtpModal(false);

    const userData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      account_number: formData.account_number,
      pin: formData.pin,
      otp: formData.otp
    };

    console.log("OTP Verified. Proceeding to Face Capture:", userData);

    // Navigate to Face-registration (make sure route exists in your router)
    navigate('/Face-registration', { state: { userData } });
  };

  return (
    <div className='w-full h-screen flex flex-col justify-center items-center pt-10 bg-gray-50'>
      <OTPVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerify={handleOtpVerification}
      />

      <div className={`${cardClasses} w-full max-w-md mx-auto space-y-4`}>
        <div className="flex flex-col space-y-1.5 pb-4 items-center">
          <img
            src={LOGO_URL}
            alt="FacePay Logo"
            className="w-16 h-16 object-contain mb-2"
          />
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Create FacePay Account</h3>
          <p className="text-sm text-gray-500">Enter your details and set up biometrics.</p>
        </div>

        <div className="flex flex-col space-y-4">
          <div className={inputClasses}>
            <label htmlFor="name" className={labelClasses}>Name</label>
            <input
              type="text"
              id="name"
              placeholder='Enter your full name'
              className={formInputClasses}
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={inputClasses}>
            <label htmlFor="email" className={labelClasses}>Email</label>
            <input
              type="email"
              id="email"
              placeholder='Enter your email address'
              className={formInputClasses}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={inputClasses}>
            <label htmlFor="phone" className={labelClasses}>Phone Number</label>
            <input
              type="tel"
              id="phone"
              placeholder='Enter your phone number (e.g., 9876543210)'
              className={formInputClasses}
              value={formData.phone}
              onChange={handleChange}
              maxLength={10}
              inputMode="numeric"
              required
            />
          </div>

          <div className={inputClasses}>
            <label htmlFor="password" className={labelClasses}>Password</label>
            <input
              type="password"
              id="password"
              placeholder='Choose a password'
              className={formInputClasses}
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className={inputClasses}>
            <label htmlFor="account_number" className={labelClasses}>Account Number</label>
            <input
              type="text"
              id="account_number"
              placeholder='Enter 10-digit Account Number'
              className={formInputClasses}
              value={formData.account_number}
              onChange={handleChange}
              maxLength={10}
              required
            />
          </div>

          <div className={inputClasses}>
            <label htmlFor="pin" className={labelClasses}>6-Digit PIN</label>
            <input
              type="password"
              id="pin"
              placeholder='Set your 6-digit transaction PIN'
              className={formInputClasses}
              value={formData.pin}
              onChange={handleChange}
              maxLength={6}
              required
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            className={primaryButtonClasses}
            onClick={handleSendOtp}
            disabled={isOtpSent || !formData.name || !formData.email || !formData.phone || !formData.password || !formData.account_number || !formData.pin}
          >
            {isOtpSent ? "OTP Sent! Enter Code" : "Send Verification OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;
