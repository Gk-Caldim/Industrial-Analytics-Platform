import React from 'react';
import LoginForm from '../components/LoginForm';

const Login = () => {

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white relative overflow-hidden">
      {/* Subtle background glow for full page */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-900/10 blur-[120px]"></div>
      </div>

      {/* Tech Circuitry Full Page SVG Background */}
      <div className="absolute inset-0 w-full h-full opacity-[0.3] pointer-events-none z-0 overflow-hidden">
        <svg viewBox="0 0 2000 1000" className="w-full h-full object-cover text-white" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle dots background */}
          <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.3" />
            <circle cx="22" cy="22" r="1.5" fill="currentColor" opacity="0.1" />
          </pattern>
          <rect width="2000" height="1000" fill="url(#dots)" />

          {/* Circuitry / PCB-like Tracks */}
          <path d="M 0 900 L 200 900 L 300 800 L 600 800 L 700 700 L 1200 700 L 1300 600 L 1800 600 L 1900 500 L 2000 500" stroke="currentColor" strokeWidth="2" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 50 1000 L 50 900 L 150 800 L 150 400 L 250 300 L 550 300 L 650 200 L 1050 200 L 1150 100" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 400 1000 L 400 850 L 550 700 L 550 550 L 650 450 L 950 450 L 1050 350 L 1350 350 L 1450 250 L 1850 250" stroke="currentColor" strokeWidth="3" opacity="0.4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Connection Nodes */}
          <circle cx="300" cy="800" r="6" fill="currentColor" />
          <circle cx="700" cy="700" r="6" fill="currentColor" />
          <circle cx="1300" cy="600" r="8" fill="transparent" stroke="currentColor" strokeWidth="2" />
          <circle cx="1900" cy="500" r="6" fill="currentColor" />

          <circle cx="150" cy="400" r="4" fill="currentColor" opacity="0.8" />
          <circle cx="250" cy="300" r="4" fill="currentColor" opacity="0.8" />
          <circle cx="650" cy="200" r="4" fill="currentColor" opacity="0.8" />
          <circle cx="1150" cy="100" r="7" fill="transparent" stroke="currentColor" strokeWidth="2" opacity="0.8" />

          <circle cx="550" cy="700" r="5" fill="currentColor" opacity="0.6" />
          <circle cx="650" cy="450" r="5" fill="currentColor" opacity="0.6" />
          <circle cx="1050" cy="350" r="9" fill="transparent" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <circle cx="1450" cy="250" r="5" fill="currentColor" opacity="0.6" />

          {/* Abstract Data Rings */}
          <g transform="translate(1600, 300)" opacity="0.5">
            <circle cx="0" cy="0" r="150" stroke="currentColor" strokeWidth="1" strokeDasharray="10 10" />
            <circle cx="0" cy="0" r="100" stroke="currentColor" strokeWidth="2" />
            <circle cx="0" cy="0" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="0" cy="0" r="40" stroke="currentColor" strokeWidth="4" opacity="0.3" />
            <path d="M -150 0 L 150 0 M 0 -150 L 0 150" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            {/* Radar / scan wedge abstract */}
            <path d="M 0 0 L 70 -70 A 100 100 0 0 1 100 0 Z" fill="currentColor" opacity="0.1" />
          </g>

          <g transform="translate(400, 750)" opacity="0.3">
            <circle cx="0" cy="0" r="120" stroke="currentColor" strokeWidth="1" />
            <circle cx="0" cy="0" r="90" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" />
            <circle cx="0" cy="0" r="60" stroke="currentColor" strokeWidth="1" />
            <path d="M -80 -80 L 80 80 M -80 80 L 80 -80" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
          </g>

          {/* Polygons / Hex arrays */}
          <path d="M 900 650 L 930 630 L 960 650 L 960 680 L 930 700 L 900 680 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M 960 650 L 990 630 L 1020 650 L 1020 680 L 990 700 L 960 680 Z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.1" />
          <path d="M 930 600 L 960 580 L 990 600 L 990 630 L 960 650 L 930 630 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />

        </svg>
      </div>

      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative z-10 w-full max-w-screen-2xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-32 w-full">
          {/* Creative Agency Hero */}
          <div className="text-center lg:text-left flex-1 max-w-3xl">
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.05]">
              <span className="text-white block mb-2">Welcome</span>
              <span className="text-white block mb-2">to the</span>
              <span className="aurora-text block">Future of</span>
              <span className="aurora-text block">Industry 4.0</span>
            </h1>
            <p className="text-gray-400 text-lg lg:text-xl leading-relaxed mt-8 max-w-xl mx-auto lg:mx-0 font-medium">
              Empowering your manufacturing with intelligent analytics, real-time insights, and next-generation connectivity.
            </p>
          </div>

          {/* Login Form Container */}
          <div className="w-full max-w-md relative group z-10 pt-10 lg:pt-0">

            <div className="absolute -inset-0.5 bg-gradient-to-br from-red-600/30 via-transparent to-purple-600/30 rounded-[2rem] blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 z-10 pointer-events-none"></div>
            <div className="relative w-full bg-gray-950/80 p-8 sm:p-10 rounded-3xl border border-gray-800/60 backdrop-blur-2xl shadow-2xl z-20">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS animation for aurora text */}
      <style>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .aurora-text {
          background: linear-gradient(
            -45deg,
            #ff3366, #ff9933, #33ccff, #9933ff, #ff3366
          );
          background-size: 300% auto;
          color: #fff;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: aurora 6s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;