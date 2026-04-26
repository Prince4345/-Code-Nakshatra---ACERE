import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err: any) {
            console.error("Login failed", err);
            setError("Failed to sign in. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Access Restricted</h1>
                    <p className="text-slate-400 text-sm">Authorized Personnel Only. Please sign in to verify your credentials.</p>
                </div>

                <div className="flex justify-center py-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm border border-rose-500/20">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#EA4335"
                            d="M24 12.276c0-.887-.079-1.743-.227-2.574H12.273v4.868h6.577a5.619 5.619 0 0 1-2.438 3.689v3.065h3.951c2.309-2.128 3.637-5.26 3.637-8.983z"
                        />
                        <path
                            fill="#34A853"
                            d="M12.273 24c3.298 0 6.071-1.077 8.087-2.923l-3.951-3.065c-1.094.733-2.493 1.166-4.137 1.166-3.176 0-5.871-2.146-6.831-5.029H1.411v3.167C3.473 21.419 7.625 24 12.273 24z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.442 14.149c-.25-.75-.39-1.554-.39-2.387s.14-2.387.39-3.149l-4.032-3.167a11.97 11.97 0 0 0 0 12.632l4.032-3.167z"
                        />
                        <path
                            fill="#4285F4"
                            d="M12.273 4.836c1.789 0 3.397.615 4.661 1.821l3.49-3.49C18.337 1.192 15.564 0 12.273 0 7.625 0 3.473 2.581 1.411 6.836l4.032 3.167c.96-2.883 3.655-5.029 6.831-5.029z"
                        />
                    </svg>
                    Sign in with Google
                </button>
                <p className="text-xs text-slate-500 pt-4">© 2026 AERCE Compliance Engine. All rights reserved.</p>
            </div>
        </div>
    );
};
