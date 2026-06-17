import React, { useState } from 'react';
import { auth } from '../firebase'; // আপনার firebase.ts ফাইল অনুযায়ী পাথ ঠিক রাখুন
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';

const Authentication = () => {
  // লগইন নাকি রেজিস্ট্রেশন পেজ দেখাবে তার স্টেট (Default: Login)
  const [isLoginView, setIsLoginView] = useState(true);

  // ইনপুট স্টেটসমূহ
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // ইরর এবং সাকসেস মেসেজ স্টেট
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // গুগল প্রোভাইডার সেটআপ
  const googleProvider = new GoogleAuthProvider();

  // ১. গুগল লগইন ফাংশন
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      alert('গুগল দিয়ে সফলভাবে লগইন হয়েছে!');
    } catch (err: any) {
      setError(err.message || 'গুগল লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  // ২. ইমেইল/পাসওয়ার্ড দিয়ে লগইন ও রেজিস্ট্রেশন সাবমিট ফাংশন
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginView) {
        // --- লগইন প্রসেস ---
        await signInWithEmailAndPassword(auth, email, password);
        alert('সফলভাবে লগইন হয়েছে!');
      } else {
        // --- রেজিস্ট্রেশন প্রসেস ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // ফায়ারবেস প্রোফাইলে ইউজারের নাম আপডেট করা
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: fullName
          });
          
          // নোট: মোবাইল নাম্বারটি আপনি চাইলে ফায়ারবেস ফায়ারস্টোর (Firestore) ডাটাবেজে সেভ করতে পারেন।
          console.log("ইউজারের মোবাইল নাম্বার:", mobileNumber);
        }
        
        alert('অ্যাকাউন্ট তৈরি সফল হয়েছে!');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেইলটি দিয়ে ইতিমধ্যেই অ্যাকাউন্ট তৈরি করা আছে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ ডিজিটের হতে হবে।');
      } else {
        setError(err.message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        width: '100%', maxWidth: '450px'
      }}>
        
        {/* হেডার */}
        <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          {isLoginView ? 'স্বাগতম!' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          {isLoginView ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'নিচের ফর্মটি পূরণ করে সাইন আপ করুন'}
        </p>

        {/* ইরর মেসেজ শো করার জায়গা */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* মূল ফর্ম */}
        <form onSubmit={handleSubmit}>
          
          {/* রেজিস্ট্রেশনের জন্য অতিরিক্ত ফিল্ডসমূহ */}
          {!isLoginView && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Full Name</label>
                <input 
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required 
                  placeholder="John Doe"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Mobile Number</label>
                <input 
                  type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required 
                  placeholder="017XXXXXXXX"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
                />
              </div>
            </>
          )}

          {/* ইমেইল ফিল্ড (লগইন ও রেজিস্ট্রেশন উভয়ের জন্য) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Email Address</label>
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
              placeholder="example@mail.com"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
            />
          </div>

          {/* পাসওয়ার্ড ফিল্ড (লগইন ও রেজিস্ট্রেশন উভয়ের জন্য) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Password</label>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
            />
          </div>

          {/* সাবমিট বাটন */}
          <button 
            type="submit" disabled={loading}
            style={{ 
              width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', 
              border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '16px', 
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' 
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            {loading ? 'অপেক্ষা করুন...' : (isLoginView ? 'লগইন করুন' : 'নিবন্ধন করুন')}
          </button>
        </form>

        {/* OR ডিভাইডার */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
          <span style={{ padding: '0 10px', color: '#9ca3af', fontSize: '14px' }}>অথবা</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
        </div>

        {/* গুগল লগইন বাটন */}
        <button 
          onClick={handleGoogleSignIn} disabled={loading}
          style={{ 
            width: '100%', padding: '10px', backgroundColor: '#ffffff', color: '#374151', 
            border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '500', fontSize: '14px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px'
          }}
        >
          <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/logo_googleg_color_24dp.png" alt="Google" style={{ width: '18px', height: '18px' }} />
          Google দিয়ে এগিয়ে যান
        </button>

        {/* ভিউ পরিবর্তন করার লিঙ্ক */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#4b5563' }}>
          {isLoginView ? 'নতুন ইউজার?' : 'ইতিমধ্যেই অ্যাকাউন্ট আছে?'} {' '}
          <button 
            onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
            style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer', padding: 0 }}
          >
            {isLoginView ? 'এখানে অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
          </button>
        </p>

      </div>
    </div>
  );
};

export default Authentication;
