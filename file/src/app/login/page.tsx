"use client";

import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  function loginWithGoogle() {
    setLoading(true);
    window.location.href = "/api/auth/google";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">FreeStorage</h1>
          <p className="mt-2 text-gray-500">
            Store and manage your files securely.
          </p>
        </div>

        <button
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full rounded-xl border px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Connecting to Google..." : "Continue with Google"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Sign in with your Google account to continue.
        </p>
      </div>
    </main>
  );
}