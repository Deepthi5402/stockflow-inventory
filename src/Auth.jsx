
import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setMessage('Login successful!');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              organization_name: organization
            }
          }
        });

        if (error) throw error;

        setMessage(
          'Account created! Check your email if verification is required.'
        );
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f4f6fb',
      fontFamily: 'Arial'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '35px',
        borderRadius: '12px',
        width: '350px',
        boxShadow: '0 5px 25px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ color: '#2563eb', textAlign: 'center' }}>
          StockFlow
        </h1>

        <h2 style={{ textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {!isLogin && (
          <input
            type="text"
            placeholder="Organization Name"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            required
            style={inputStyle}
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={{
          ...inputStyle,
          background: '#2563eb',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}>
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
        </button>

        {message && <p>{message}</p>}

        <p style={{ textAlign: 'center' }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
            style={{
              border: 'none',
              background: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              marginLeft: '5px'
            }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '15px',
  boxSizing: 'border-box',
  border: '1px solid #ddd',
  borderRadius: '6px'
};
