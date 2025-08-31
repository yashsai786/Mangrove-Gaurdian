import React, { useState } from "react";
import { auth } from "./config/firebase";
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("No user is logged in.");
      return;
    }

    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setSuccess("Password changed successfully!");
      setTimeout(() => navigate("/"), 2000); // Redirect after success
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Change Password</h2>

      {error && <p className="text-red-500 text-center">{error}</p>}
      {success && <p className="text-green-500 text-center">{success}</p>}

      <form onSubmit={handleChangePassword} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-gray-700">Current Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        {/* New Password */}
        <div>
          <label className="block text-gray-700">New Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-gray-700">Confirm New Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Change Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
