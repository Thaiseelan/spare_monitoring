import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebaseConfig'; // adjust path if needed

type AuthFormProps = {
  onLogin: () => void;
};

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const navigate = useNavigate();

  const toggleForm = () => setIsLogin(!isLogin);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.password) {
      localStorage.setItem('authToken', 'dummy_token');
      onLogin();
      navigate('/');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      // Store user information from Google account
      localStorage.setItem('userName', result.user.displayName || '');
      localStorage.setItem('userEmail', result.user.email || '');
      localStorage.setItem('userPhone', result.user.phoneNumber || '');
      localStorage.setItem('userPhoto', result.user.photoURL || '');
      localStorage.setItem('authToken', token);

      // Debug: Log the Gmail photo URL
      console.log('Gmail Photo URL:', result.user.photoURL);
      console.log('User Display Name:', result.user.displayName);
      console.log('User Email:', result.user.email);

      onLogin();
      navigate('/');
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Login to SmartMonitor' : 'Sign Up for SmartMonitor'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-3 rounded-md bg-gray-700 text-white"
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 rounded-md bg-gray-700 text-white"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 rounded-md bg-gray-700 text-white"
            required
          />
          <button type="submit" className="w-full bg-blue-600 p-3 rounded-xl text-white font-semibold">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="flex items-center justify-center my-4">
          <hr className="flex-grow border-gray-600" />
          <span className="px-4 text-gray-400">or</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full bg-white text-black p-3 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-100"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <p className="text-gray-400 text-sm text-center mt-4">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={toggleForm} className="text-blue-400 hover:underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
