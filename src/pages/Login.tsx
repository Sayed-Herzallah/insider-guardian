import { useState, useRef, useEffect } from 'react';
import { Shield, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Fingerprint, Zap, Globe } from 'lucide-react';
import { useData } from '@/context/DataContext';
import gsap from 'gsap';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useData();

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 }
    )
    .fromTo(
      leftPanelRef.current,
      { opacity: 0, x: -80 },
      { opacity: 1, x: 0, duration: 1, ease: 'power3.out' },
      '-=0.1'
    )
    .fromTo(
      glowRef.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' },
      '-=0.8'
    )
    .fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.4)' },
      '-=1'
    )
    .fromTo(
      rightPanelRef.current,
      { opacity: 0, x: 80 },
      { opacity: 1, x: 0, duration: 1, ease: 'power3.out' },
      '-=0.8'
    )
    .fromTo(
      formRef.current?.children || [],
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
      '-=0.5'
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');

    const validation = loginSchema.safeParse({ email: username, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path as keyof typeof fieldErrors] = issue.message;
      });
      setErrors(fieldErrors);
      
      const tl = gsap.timeline();
      tl.to(formRef.current, { x: -12, duration: 0.06, ease: 'power2.out' })
        .to(formRef.current, { x: 12, duration: 0.06, ease: 'power2.out' })
        .to(formRef.current, { x: -12, duration: 0.06, ease: 'power2.out' })
        .to(formRef.current, { x: 12, duration: 0.06, ease: 'power2.out' })
        .to(formRef.current, { x: 0, duration: 0.06, ease: 'power2.out' });
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(username, password);

      if (user) {
        gsap.to([leftPanelRef.current, rightPanelRef.current], {
          opacity: 0,
          y: -30,
          duration: 0.5,
          ease: 'power3.in',
          onComplete: onLogin,
        });
      } else {
        setError('Login failed: Invalid backend response');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error in UI:', err);
      const isNetworkError = err.message?.toLowerCase().includes('failed') || 
                             err.message?.toLowerCase().includes('fetch') || 
                             err.code === 'network_error';
      setError(isNetworkError 
        ? 'Unable to connect to the backend server. Please verify the server is running.' 
        : (err.message || 'Connection error. Make sure backend is running.')
      );
      setIsLoading(false);
      
      const tl = gsap.timeline();
      tl.to(formRef.current, { 
        x: -12, 
        duration: 0.06, 
        ease: 'power2.out' 
      })
      .to(formRef.current, { x: 12, duration: 0.06, ease: 'power2.out' })
      .to(formRef.current, { x: -12, duration: 0.06, ease: 'power2.out' })
      .to(formRef.current, { x: 12, duration: 0.06, ease: 'power2.out' })
      .to(formRef.current, { x: 0, duration: 0.06, ease: 'power2.out' });
    }
  };

  const features = [
    { icon: Zap, text: 'Real-time threat detection' },
    { icon: Shield, text: 'Automated incident response' },
    { icon: Globe, text: 'Complete endpoint visibility' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col lg:flex-row bg-[#050505] overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-[#00d4c3]/30 animate-pulse" />
        <div className="absolute top-3/4 left-1/3 w-1 h-1 rounded-full bg-[#00d4c3]/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/5 w-1.5 h-1.5 rounded-full bg-[#ff3b30]/20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Left Panel */}
      <div
        ref={leftPanelRef}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4c3]/5 via-transparent to-[#ff3b30]/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        
        {/* Animated glow orbs */}
        <div 
          ref={glowRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,212,195,0.15)_0%,transparent_60%)] rounded-full animate-pulse" />
          <div className="absolute inset-8 bg-[radial-gradient(circle,rgba(0,212,195,0.08)_0%,transparent_50%)] rounded-full" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(255,59,48,0.1)_0%,transparent_50%)] rounded-full" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div ref={logoRef} className="mb-10">
            <div className="flex items-center gap-5 mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00d4c3] to-[#00a896] flex items-center justify-center shadow-2xl shadow-[#00d4c3]/30">
                  <Shield className="w-10 h-10 text-[#050505]" />
                </div>
                <div className="absolute -inset-2 bg-[#00d4c3]/20 rounded-2xl blur-xl -z-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-[#f4f6fb] tracking-tight">Insider Guardian</h1>
                <p className="text-[#6b7280] text-sm uppercase tracking-[0.2em] mt-1">Endpoint Detection & Response</p>
              </div>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-[#f4f6fb] mb-6 leading-[1.1]">
            See what others miss.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4c3] to-[#00a896]">Respond in seconds.</span>
          </h2>

          <p className="text-[#9ca3af] text-lg mb-12 max-w-md leading-relaxed">
            AI-powered detection and response for endpoints, cloud, and identity.
            Protect your organization from advanced threats.
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,195,0.1)] flex items-center justify-center border border-[rgba(0,212,195,0.2)] group-hover:bg-[rgba(0,212,195,0.15)] group-hover:border-[rgba(0,212,195,0.3)] transition-all duration-300">
                  <feature.icon className="w-5 h-5 text-[#00d4c3]" />
                </div>
                <span className="text-[#e5e7eb] font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div
        ref={rightPanelRef}
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative min-h-screen"
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4c3]/[0.02] to-transparent pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4c3] to-[#00a896] flex items-center justify-center shadow-lg shadow-[#00d4c3]/20">
                <Shield className="w-7 h-7 text-[#050505]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f4f6fb]">Insider Guardian</h1>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider">EDR Platform</p>
            </div>
          </div>

          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00d4c3]/20 via-transparent to-[#00d4c3]/20 rounded-3xl blur-xl opacity-50" />
            
            <div className="relative bg-[#111318]/80 backdrop-blur-xl border border-[rgba(244,246,251,0.08)] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4c3]/20 to-[#00a896]/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-[#00d4c3]" />
                </div>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-[#f4f6fb] mb-1">Welcome back</h2>
              <p className="text-[#6b7280] text-sm mb-6 sm:mb-8">Sign in to access your security dashboard</p>

              {error && (
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] text-sm mb-5 sm:mb-6 animate-shake">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{error}</span>
                </div>
              )}

              <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className={`
                    relative group transition-all duration-300
                    ${focusedField === 'username' ? 'transform scale-[1.02]' : ''}
                  `}>
                    <div className={`
                      absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300
                      ${focusedField === 'username' ? 'text-[#00d4c3]' : 'text-[#4b5563]'}
                    `}>
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      className={`
                        w-full pl-12 pr-4 py-4 rounded-xl
                        bg-[#0a0a0c] border text-[#f4f6fb] text-sm
                        placeholder:text-[#4b5563]
                        transition-all duration-300 outline-none
                        ${errors.email 
                          ? 'border-[#ff3b30]/50 focus:border-[#ff3b30] shadow-[0_0_20px_rgba(255,59,48,0.1)]' 
                          : focusedField === 'username' 
                            ? 'border-[#00d4c3] shadow-[0_0_20px_rgba(0,212,195,0.15)]' 
                            : 'border-[rgba(244,246,251,0.08)] hover:border-[rgba(244,246,251,0.15)]'
                        }
                      `}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  {errors.email && (
                    <span className="text-[10px] text-[#ff3b30] mt-1.5 block">
                      {errors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className={`
                    relative group transition-all duration-300
                    ${focusedField === 'password' ? 'transform scale-[1.02]' : ''}
                  `}>
                    <div className={`
                      absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300
                      ${focusedField === 'password' ? 'text-[#00d4c3]' : 'text-[#4b5563]'}
                    `}>
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={`
                        w-full pl-12 pr-12 py-4 rounded-xl
                        bg-[#0a0a0c] border text-[#f4f6fb] text-sm
                        placeholder:text-[#4b5563]
                        transition-all duration-300 outline-none
                        ${errors.password 
                          ? 'border-[#ff3b30]/50 focus:border-[#ff3b30] shadow-[0_0_20px_rgba(255,59,48,0.1)]' 
                          : focusedField === 'password' 
                            ? 'border-[#00d4c3] shadow-[0_0_20px_rgba(0,212,195,0.15)]' 
                            : 'border-[rgba(244,246,251,0.08)] hover:border-[rgba(244,246,251,0.15)]'
                        }
                      `}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#9ca3af] transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-[10px] text-[#ff3b30] mt-1.5 block">
                      {errors.password}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    w-full flex items-center justify-center gap-2 
                    py-3 sm:py-4 px-6 rounded-xl
                    bg-gradient-to-r from-[#00d4c3] to-[#00a896]
                    text-[#050505] font-semibold text-sm
                    shadow-lg shadow-[#00d4c3]/25
                    hover:shadow-xl hover:shadow-[#00d4c3]/35
                    hover:from-[#00e8d5] hover:to-[#00b8a6]
                    transform hover:-translate-y-0.5
                    transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  "
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#050505] border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
