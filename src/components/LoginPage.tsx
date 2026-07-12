import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, Lock, AlertCircle, Shield } from 'lucide-react';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { SpktLogo } from './SpktLogo';
import { spktApi } from '@/lib/spktApi';

type AuthView = 'login' | 'register' | 'forgot' | '2fa';

export const LoginPage: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const isProduction = process.env.NODE_ENV === 'production';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requires2fa && result.tempToken) {
        setTempToken(result.tempToken);
        setView('2fa');
      }
    } catch {
      setError('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await spktApi.verify2fa(tempToken, totpCode);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kode tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const password = 'spkt123';
    if (role === 'user') {
      setEmail('user@spkt.id');
      setPassword(password);
    } else if (role === 'petugas-laporan') {
      setEmail('petugas@spkt.id');
      setPassword(password);
    } else if (role === 'petugas-surat') {
      setEmail('petugas-surat@spkt.id');
      setPassword(password);
    } else if (role === 'petugas-pengaduan') {
      setEmail('petugas-pengaduan@spkt.id');
      setPassword(password);
    } else if (role === 'admin') {
      setEmail('admin@spkt.id');
      setPassword(password);
    }
  };

  if (view === 'register') {
    return <RegisterPage onBackToLogin={() => setView('login')} />;
  }
  if (view === 'forgot') {
    return <ForgotPasswordPage onBack={() => setView('login')} />;
  }

  if (view === '2fa') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-900 to-blue-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" /> Verifikasi 2FA
              </CardTitle>
              <CardDescription className="text-blue-200">Masukkan kode dari aplikasi authenticator</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2fa} className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest bg-blue-950/60 border-blue-400/60 text-white"
                  required
                />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
                  {loading ? 'Memverifikasi...' : 'Verifikasi'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setView('login')} className="w-full text-blue-300">
                  Kembali
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 space-y-1">
          <SpktLogo priority className="mx-auto max-w-[170px] sm:max-w-[190px]" />
          <p className="text-blue-200 text-sm">Sistem Pelayanan Kepolisian Terpadu</p>
        </div>

        <Card className="shadow-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-900 to-blue-800">
          <CardHeader>
            <CardTitle className="text-white">Login</CardTitle>
            <CardDescription className="text-blue-200">Masuk ke akun Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-100">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-blue-950/60 border-blue-400/60 text-white placeholder:text-blue-400 focus:border-blue-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-blue-100">Password</Label>
                  <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-blue-950/60 border-blue-400/60 text-white placeholder:text-blue-400 focus:border-blue-300"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>

            {!isProduction && (
              <div className="mt-6 pt-6 border-t border-blue-500/40">
                <p className="text-sm text-blue-300 mb-3 text-center">Login demo:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => quickLogin('user')} className="text-xs border-blue-400/60 text-blue-100 bg-blue-800/40">User</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => quickLogin('admin')} className="text-xs border-blue-400/60 text-blue-100 bg-blue-800/40">Admin</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => quickLogin('petugas-laporan')} className="text-xs border-blue-400/60 text-blue-100 bg-blue-800/40">Petugas Laporan</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => quickLogin('petugas-surat')} className="text-xs border-blue-400/60 text-blue-100 bg-blue-800/40">Petugas Surat</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => quickLogin('petugas-pengaduan')} className="col-span-2 text-xs border-blue-400/60 text-blue-100 bg-blue-800/40">Petugas Pengaduan</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-blue-300 mt-6">
          <p>
            Belum punya akun?{' '}
            <button type="button" onClick={() => setView('register')} className="text-blue-400 hover:text-blue-300 hover:underline">Daftar sekarang</button>
          </p>
        </div>
      </div>
    </div>
  );
};
