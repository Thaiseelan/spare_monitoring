import React, { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import profileImage from "./profile.jpeg"; // Adjust the path if needed

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const [gmailPhotoURL, setGmailPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Get the Gmail photo URL from localStorage
    const storedPhotoURL = localStorage.getItem('userPhoto');
    console.log('Stored Photo URL from localStorage:', storedPhotoURL);

    // Also try to get from Firebase user object as backup
    const firebasePhotoURL = user?.photoURL;
    console.log('Firebase Photo URL:', firebasePhotoURL);

    // Use stored URL first, then Firebase URL, then null
    const finalPhotoURL = storedPhotoURL || firebasePhotoURL || null;
    console.log('Final Photo URL to use:', finalPhotoURL);

    if (finalPhotoURL) {
      setGmailPhotoURL(finalPhotoURL);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-10 px-4 flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-10 px-4 flex items-center justify-center">
        <div className="text-xl">Please log in to view your profile</div>
      </div>
    );
  }

  // Extract user information from Google account
  const firstName = user.displayName?.split(' ')[0] || 'N/A';
  const lastName = user.displayName?.split(' ').slice(1).join(' ') || 'N/A';
  const email = user.email || 'N/A';
  const phoneNumber = user.phoneNumber || 'N/A';

  // Prioritize Gmail photo URL - use it if available and no error
  const displayPhotoURL = gmailPhotoURL && !photoError ? gmailPhotoURL : profileImage;
  const hasGmailPhoto = gmailPhotoURL && !photoError;

  const handlePhotoError = () => {
    console.log('Photo failed to load, using fallback');
    setPhotoError(true);
  };

  const handlePhotoLoad = () => {
    console.log('Gmail photo loaded successfully');
    setPhotoError(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-10 px-4">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-6 mb-8">
          <img
            src={displayPhotoURL}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
            onError={handlePhotoError}
            onLoad={handlePhotoLoad}
          />
          <div>
            <h2 className="text-2xl font-bold">{firstName} {lastName}</h2>
            <p className="text-blue-400">User</p>
            <p className="text-gray-400">{email}</p>
            {hasGmailPhoto && (
              <p className="text-green-400 text-sm">✓ Gmail Profile Photo</p>
            )}
            {photoError && (
              <p className="text-red-400 text-sm">Using Default Photo</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Personal Information</h3>
            <p><strong>First Name:</strong> {firstName}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Phone Number:</strong> {phoneNumber}</p>
            <p><strong>Account Created:</strong> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2 invisible">.</h3>
            <p><strong>Last Name:</strong> {lastName}</p>
            <p><strong>Display Name:</strong> {user.displayName || 'N/A'}</p>
            <p><strong>Last Sign In:</strong> {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <h3 className="text-xl font-semibold mt-4 mb-4 border-b border-gray-600 pb-2">Account Information</h3>
            <p><strong>User ID:</strong> {user.uid}</p>
            <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
            <p><strong>Provider:</strong> {user.providerData[0]?.providerId || 'N/A'}</p>
            <p><strong>Profile Photo:</strong> {hasGmailPhoto ? 'Gmail Photo Available' : 'Using Default Photo'}</p>
            {gmailPhotoURL && (
              <p><strong>Gmail Photo URL:</strong> <span className="text-xs break-all">{gmailPhotoURL}</span></p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Work Done</h3>
          <textarea
            placeholder="Describe the work done recently..."
            className="w-full p-4 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
