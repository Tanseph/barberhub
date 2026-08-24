import React, { useState } from 'react';
import {
  Scissors,
  Mail,
  LogIn,
  Cloud,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  currentEmail?: string;
  themeDark?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  currentEmail,
  themeDark = true,
}) => {
  const [email, setEmail] = useState<string>(currentEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('กรุณากรอก Email ของท่านก่อนเข้าใช้งาน');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('รูปแบบ Email ไม่ถูกต้อง (ตัวอย่าง: name@example.com)');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    sounds.playSuccess();

    setTimeout(() => {
      onLogin(cleanEmail);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors ${
      themeDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Decorative ambient backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          themeDark ? 'bg-amber-500' : 'bg-amber-400'
        }`} />
        <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          themeDark ? 'bg-indigo-600' : 'bg-indigo-400'
        }`} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl ${
          themeDark
            ? 'bg-zinc-900/90 border-zinc-800/80 shadow-black/60'
            : 'bg-white/95 border-slate-200/80 shadow-slate-200/80'
        }`}>
          {/* Header Brand */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 mb-1">
              <Scissors className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">BarberPOS Cloud</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className={`text-xs ${themeDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              ระบบบริหารร้านตัดผม ซิงก์ข้อมูลคลาวด์แยกตามอีเมลร้าน
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="user-email-input"
                className={`block text-xs font-bold mb-2 ${
                  themeDark ? 'text-zinc-200' : 'text-slate-700'
                }`}
              >
                อีเมลร้านค้า (Email) <span className="text-rose-500">*</span>
              </label>
              <div className={`relative flex items-center rounded-2xl border transition-all ${
                themeDark
                  ? 'bg-zinc-950 border-zinc-800 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-800/10'
              }`}>
                <div className="pl-4 pr-2 text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="user-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="กรุณากรอก Email"
                  autoFocus
                  required
                  className={`w-full py-3.5 pr-4 bg-transparent text-sm font-medium focus:outline-none ${
                    themeDark ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
              {errorMsg && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium animate-fadeIn">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 btn-tactile ${
                themeDark
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>กำลังเชื่อมต่อฐานข้อมูล...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.2]" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Security & Multi-tenant Info */}
          <div className={`mt-6 p-3.5 rounded-2xl border text-xs space-y-1.5 ${
            themeDark
              ? 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Cloud className="w-3.5 h-3.5" />
              <span>Firebase Cloud Firestore Database</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              ข้อมูลยอดขาย, คิว, รายจ่าย และการตั้งค่าของแต่ละอีเมลจะถูกแยกเป็นอิสระจากกันอย่างปลอดภัย
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <p className={`text-[11px] ${themeDark ? 'text-zinc-600' : 'text-slate-400'}`}>
            รองรับการใช้งานพร้อมกันทุกอุปกรณ์ ทั้งคอมพิวเตอร์ แท็บเล็ต และสมาร์ทโฟน
          </p>
        </div>
      </div>
    </div>
  );
};
