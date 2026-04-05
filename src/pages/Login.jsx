import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff, Shield, Package, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// Al Assile Date Logo SVG Component
const AlAssileLogo = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="url(#logoGradientLogin)" />
    <ellipse cx="32" cy="36" rx="12" ry="16" fill="#8B4513" />
    <ellipse cx="32" cy="36" rx="10" ry="14" fill="#A0522D" />
    <ellipse cx="29" cy="33" rx="4" ry="8" fill="#CD853F" opacity="0.6" />
    <path d="M32 8 C32 8 24 16 24 20 C24 24 28 22 32 18 C36 22 40 24 40 20 C40 16 32 8 32 8Z" fill="#228B22" />
    <path d="M32 10 C32 10 26 16 26 19 C26 22 29 21 32 18 C35 21 38 22 38 19 C38 16 32 10 32 10Z" fill="#32CD32" />
    <ellipse cx="28" cy="30" rx="3" ry="5" fill="white" opacity="0.2" />
    <defs>
      <linearGradient id="logoGradientLogin" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#D4A574" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
    </defs>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : language === 'fr' ? 'Veuillez entrer le nom d\'utilisateur et le mot de passe' : 'Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || (language === 'ar' ? 'فشل تسجيل الدخول' : language === 'fr' ? 'Échec de la connexion' : 'Login failed'));
      }
    } catch (err) {
      setError(language === 'ar' ? 'حدث خطأ' : language === 'fr' ? 'Une erreur est survenue' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Package,
      label: language === 'ar' ? 'إدارة المخزون' : language === 'fr' ? 'Gestion de Stock' : 'Inventory',
      value: language === 'ar' ? 'تتبع كامل' : language === 'fr' ? 'Suivi complet' : 'Full tracking'
    },
    {
      icon: TrendingUp,
      label: language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales',
      value: language === 'ar' ? 'نقطة بيع' : language === 'fr' ? 'Point de vente' : 'POS ready'
    },
    {
      icon: Shield,
      label: language === 'ar' ? 'الأمان' : language === 'fr' ? 'Sécurité' : 'Security',
      value: language === 'ar' ? 'حسب الأدوار' : language === 'fr' ? 'Par rôles' : 'Role-gated'
    }
  ];

  const langOptions = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇩🇿' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' }
  ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#080c14' }}>

      {/* Left Panel — Brand & Info */}
      <div
        className="hidden lg:flex lg:w-[420px] flex-col justify-between p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1208 0%, #0d0a04 50%, #080c14 100%)'
        }}
      >
        {/* Subtle gradient accent */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] opacity-30"
          style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-20 left-0 w-60 h-60 rounded-full blur-[100px] opacity-20"
          style={{ background: 'radial-gradient(circle, #228B22 0%, transparent 70%)' }}
        />

        {/* Top — Logo & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <AlAssileLogo size={48} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#D4A574' }}>
                {language === 'ar' ? 'الأصيل' : 'Al Assile'}
              </h1>
              <p className="text-xs font-medium" style={{ color: '#8B7355' }}>
                {language === 'ar' ? 'منتجات التمور' : language === 'fr' ? 'Produits de Dattes' : 'Date Products'}
              </p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-sm font-medium mb-2" style={{ color: '#8B7355' }}>
              {language === 'ar' ? 'لوحة الإدارة' : language === 'fr' ? 'PANNEAU D\'ADMINISTRATION' : 'ADMIN WORKSPACE'}
            </p>
            <h2 className="text-2xl font-semibold leading-snug" style={{ color: '#e8d5c0' }}>
              {language === 'ar'
                ? 'إدارة شاملة لأعمالك من مكان واحد'
                : language === 'fr'
                  ? 'Gérez votre activité depuis un seul espace'
                  : 'Manage your entire business from one place'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#6b5a4a' }}>
              {language === 'ar'
                ? 'تتبع المخزون، إدارة المبيعات، متابعة العملاء والموردين، وإنشاء الوثائق التجارية'
                : language === 'fr'
                  ? 'Suivez le stock, gérez les ventes, clients et fournisseurs, et générez des documents commerciaux'
                  : 'Track inventory, manage sales, monitor clients & suppliers, and generate business documents'}
            </p>
          </div>
        </div>

        {/* Bottom — Feature Grid */}
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-3">
            {features.map((feat, i) => (
              <div
                key={i}
                className="rounded-xl p-3 text-center"
                style={{
                  background: 'rgba(212, 165, 116, 0.06)',
                  border: '1px solid rgba(212, 165, 116, 0.1)'
                }}
              >
                <feat.icon size={18} style={{ color: '#D4A574' }} className="mx-auto mb-2" />
                <p className="text-xs font-semibold" style={{ color: '#c4a882' }}>{feat.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#6b5a4a' }}>{feat.value}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-6 text-center" style={{ color: '#3D2914' }}>
            © {new Date().getFullYear()} Al Assile — {language === 'ar' ? 'جميع الحقوق محفوظة' : language === 'fr' ? 'Tous droits réservés' : 'All Rights Reserved'}
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(212,165,116,0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile Logo (hidden on desktop) */}
          <div className="lg:hidden text-center mb-8">
            <AlAssileLogo size={56} />
            <h1 className="text-xl font-bold mt-3" style={{ color: '#D4A574' }}>
              {language === 'ar' ? 'الأصيل' : 'Al Assile'}
            </h1>
          </div>

          {/* Language Selector */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {langOptions.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: language === opt.code ? 'rgba(212, 165, 116, 0.15)' : 'transparent',
                    color: language === opt.code ? '#D4A574' : '#555',
                    border: language === opt.code ? '1px solid rgba(212, 165, 116, 0.2)' : '1px solid transparent'
                  }}
                >
                  {opt.flag}
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#D4A574' }}>
              {language === 'ar' ? 'تسجيل الدخول' : language === 'fr' ? 'Connexion' : 'Sign in'}
            </p>
            <h2 className="text-2xl font-bold text-white">
              {language === 'ar'
                ? 'الدخول إلى لوحة التحكم'
                : language === 'fr'
                  ? 'Accéder au tableau de bord'
                  : 'Access the dashboard'}
            </h2>
            <p className="text-sm mt-2" style={{ color: '#666' }}>
              {language === 'ar'
                ? 'استخدم بيانات المسؤول لتسجيل الدخول'
                : language === 'fr'
                  ? 'Utilisez vos identifiants pour vous connecter'
                  : 'Enter your credentials to continue'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#f87171'
                }}
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#888' }}>
                {language === 'ar' ? 'اسم المستخدم' : language === 'fr' ? 'Nom d\'utilisateur' : 'Username'}
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#555' }} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : language === 'fr' ? 'Entrez le nom d\'utilisateur' : 'Enter username'}
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 transition-all outline-none focus:ring-1 focus:ring-amber-700/50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#888' }}>
                {language === 'ar' ? 'كلمة المرور' : language === 'fr' ? 'Mot de passe' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#555' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={language === 'ar' ? 'أدخل كلمة المرور' : language === 'fr' ? 'Entrez le mot de passe' : 'Enter password'}
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 rounded-xl text-sm text-white placeholder-gray-600 transition-all outline-none focus:ring-1 focus:ring-amber-700/50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: '#555' }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(212, 165, 116, 0.15)' : 'linear-gradient(135deg, #8B6914 0%, #D4A574 100%)',
                color: '#fff',
                border: '1px solid rgba(212, 165, 116, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                  <span>{language === 'ar' ? 'جاري الدخول...' : language === 'fr' ? 'Connexion...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>{language === 'ar' ? 'تسجيل الدخول' : language === 'fr' ? 'Se connecter' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer text */}
          <p className="text-center text-[11px] mt-8" style={{ color: '#333' }}>
            {language === 'ar' ? 'نظام إدارة المخزون — الأصيل' : language === 'fr' ? 'Système de Gestion — Al Assile' : 'Inventory Management — Al Assile'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
