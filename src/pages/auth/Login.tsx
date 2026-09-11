import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft,
  HelpCircle, 
  AlertCircle 
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (activeTab === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Terjadi kendala saat memproses login. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Animated Clean Background */}
      <AnimatedBackground />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 animate-page-enter">
        {/* Back to Home Button */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white/90 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-xs hover:shadow transition-all touch-press"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </Link>
        </div>

        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white p-1.5 shadow-xl shadow-blue-500/10 mb-3 border border-slate-200 overflow-hidden group hover:scale-105 transition-all duration-300 animate-float-gentle">
            <img 
              src="/logo-pplg3.png" 
              alt="Logo XI PPLG 3" 
              className="w-full h-full object-contain rounded-2xl" 
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
            PPLG 3 SMART ATTENDANCE
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center justify-center space-x-1.5">
            <span>Sistem Absensi Digital</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">XI PPLG 3 SMKN 1 Ciomas</span>
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl bg-white/95">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer touch-press ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Siswa XI PPLG 3
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer touch-press ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin / Ketua Kelas
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs animate-page-enter">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {activeTab === 'student' ? 'Email Akun Kelas Siswa' : 'Email Admin / Ketua Kelas'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email anda"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-xl pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {activeTab === 'student' ? 'Password (Gunakan NISN)' : 'Password Admin'}
                </label>
                {activeTab === 'student' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold touch-press cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password anda"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 rounded-xl pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              {activeTab === 'student' && (
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                  * Password akun siswa adalah nomor <strong>NISN</strong> masing-masing.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2 cursor-pointer shimmer-hover hover-lift touch-press"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>Khusus 45 Siswa XI PPLG 3 SMKN 1 Ciomas</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-sm w-full p-6 border border-slate-200 space-y-4 bg-white shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Lupa Password Akun Siswa?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Akun siswa secara default menggunakan <strong>NISN</strong> masing-masing sebagai password. 
              Jika akun Anda mengalami kendala atau reset password diperlukan, silakan hubungi <strong>Ketua Kelas / Wali Kelas XI PPLG 3</strong>.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
