import React from 'react';
import LoginForm from '../components/LoginForm';

const Login = () => {
  return (
    <div className="min-h-screen bg-[#020617] flex w-full relative overflow-hidden font-inter">

      {/* Unified Aurora glowing background blobs for the entire page */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-64 lg:w-[500px] h-64 lg:h-[500px] bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] lg:blur-[150px] opacity-20 animate-blob z-0 pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 w-64 lg:w-[500px] h-64 lg:h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] lg:blur-[150px] opacity-20 animate-blob animation-delay-2000 z-0 pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 lg:w-[500px] h-64 lg:h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] lg:blur-[150px] opacity-20 animate-blob animation-delay-4000 z-0 pointer-events-none"></div>

      {/* Background Analytics SVG with Opacity 0.2 across entire page */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 800"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" fill="none">
            {/* Grid Pattern */}
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 40} x2="1440" y2={i * 40} />
            ))}
            {Array.from({ length: 36 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="800" />
            ))}
          </g>

          {/* Analytics Lines */}
          <path fill="none" stroke="#0ea5e9" strokeWidth="3" opacity="0.8" d="M0,600 C200,550 400,700 600,450 C800,200 1000,500 1200,300 C1300,200 1400,250 1440,150" />
          <path fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.6" d="M0,650 C200,600 400,750 600,500 C800,250 1000,550 1200,350 C1300,250 1400,300 1440,200" />
          <path fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.4" d="M0,700 C200,650 400,800 600,550 C800,300 1000,600 1200,400 C1300,300 1400,350 1440,250" />

          {/* Data Nodes */}
          {[
            [200, 550], [400, 700], [600, 450], [800, 200], [1000, 500], [1200, 300]
          ].map(([x, y], i) => (
            <g key={`node-${i}`}>
              <circle cx={x} cy={y} r="8" fill="#0ea5e9" opacity="0.8" />
              <circle cx={x} cy={y} r="16" fill="rgba(14, 165, 233, 0.3)" />
            </g>
          ))}

          {/* Bar Charts Background */}
          {Array.from({ length: 15 }).map((_, i) => (
            <rect key={`bar-${i}`} x={100 + i * 80} y={800 - (Math.random() * 300 + 100)} width="40" height={400} fill="url(#bar-gradient)" opacity="0.4" />
          ))}

          <defs>
            <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="aurora-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row min-h-screen">

        {/* Left Side: Agency Hero Content */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center order-2 lg:order-1 px-8 lg:px-16 xl:px-24 pb-12 lg:pb-0 pt-0">
          <div className="relative z-10 w-full text-center lg:text-left">
            <h2 className="font-outfit text-gray-400 uppercase tracking-[0.25em] text-xs lg:text-sm font-semibold mb-6 flex items-center justify-center lg:justify-start">
              <span className="hidden lg:block w-12 h-[2px] bg-blue-500 mr-4"></span>
              CALDIM Engineering Team
            </h2>
            <h1 className="font-outfit text-4xl sm:text-5xl lg:text-5xl xl:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-white">
              Industrial
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 inline-block drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                Analytics
              </span>
              <br className="hidden sm:block" />
              <span className="text-gray-400 sm:ml-2 lg:ml-0 font-light">
                Platform
              </span>
            </h1>
            <p className="font-inter text-gray-400 text-base sm:text-lg lg:text-xl leading-relaxed mb-12 font-normal max-w-xl mx-auto lg:mx-0">
              Centralized telemetry aggregation and diagnostic metrics for heavy machinery. Access live throughput data and historical performance records securely.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-gray-300 bg-[#0f172a]/60 w-fit mx-auto lg:mx-0 px-6 py-3 rounded-xl border border-white/5 backdrop-blur-md uppercase tracking-wider">
              <div className="flex items-center whitespace-nowrap">
                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full mr-2.5 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>
                Network Active
              </div>
              <span className="text-gray-700 hidden sm:inline">|</span>
              <div className="flex items-center text-gray-400 whitespace-nowrap">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                SSL Encrypted
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Layout block without separate background mechanics */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center relative order-1 lg:order-2 px-6 sm:px-12 py-16 lg:py-0 z-20">
          <div className="w-full max-w-md bg-[#0f172a]/60 p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-xl">
            <LoginForm />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Login;