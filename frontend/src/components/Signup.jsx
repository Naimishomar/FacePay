import React, {useState} from 'react'
import FacenPay from '../assets/FacenPay.png'
import { useNavigate } from 'react-router-dom'


function Signup() {
  const [sendOtp, setSendOtp] = useState(false);
  const navigate = useNavigate();
  return (
    <div className='w-full h-screen flex flex-col justify-center items-center gap-5'>
      <img src={FacenPay} alt="logo" />
      <input type="text" placeholder='Name'  className='px-3 py-2 border border-gray-400 rounded-md w-sm'/>
      <input type="text" placeholder='Email' className='px-3 py-2 border border-gray-400 rounded-md w-sm' />
      <input type="text" placeholder='Phone Number'  className='px-3 py-2 border border-gray-400 rounded-md w-sm'/>
      <input type="password" placeholder='Password'  className='px-3 py-2 border border-gray-400 rounded-md w-sm'/>
      {sendOtp && <input type="text" placeholder='OTP' className='px-3 py-2 border border-gray-400 rounded-md w-sm'/>}
      {sendOtp ? <button className='bg-blue-500 text-white px-3 w-sm py-2 rounded-md cursor-pointer hover:bg-blue-600' onClick={()=> navigate('/face-detection')}>Sign up</button> : <button className='bg-blue-500 text-white px-3 w-sm py-2 rounded-md cursor-pointer hover:bg-blue-600' onClick={()=> setSendOtp(true)}>Send OTP</button>}
    </div>
  )
}

export default Signup