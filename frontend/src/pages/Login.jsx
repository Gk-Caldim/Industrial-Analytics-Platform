import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { DotLottiePlayer } from '@dotlottie/react-player';
import LoginForm from '../components/LoginForm';
import SplitText from '../components/SplitText';

const transitionEasing = [0.16, 1, 0.3, 1];

const Login = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard/projects');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginStart = () => {
    setIsAuthenticating(true);
  };

  const handleLoginSuccess = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-950 font-outfit relative overflow-hidden flex flex-col">
      
      {/* 1. INITIAL LOADER */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="initial-loader"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
            exit={{ opacity: 0, y: -20, filter: "blur(20px)" }}
            transition={{ duration: 1, ease: transitionEasing }}
          >
            <div className="w-[300px] h-[300px]">
              <DotLottiePlayer
                src="/Office%20work.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-300 mt-8"
            >
              Initializing_Gateway_v4.2
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN LOGIN HUB */}
      {!loading && (
        <motion.div
          className="flex-1 relative flex flex-col z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          {/* IMMERSIVE FLUID BACKGROUND */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-white">
            {/* Structural Mesh */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_30%,transparent_100%)]"></div>
            
            {/* High-Impact Fluid Orbs */}
            <motion.div 
               animate={{ scale: [1, 1.2, 1], x: [0, 120, 0], y: [0, 80, 0] }} 
               transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full bg-indigo-500/15 blur-[120px]" 
            />
            <motion.div 
               animate={{ scale: [1, 1.3, 1], x: [0, -120, 0], y: [0, -80, 0] }} 
               transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
               className="absolute bottom-[-10%] right-[-5%] w-[900px] h-[900px] rounded-full bg-blue-400/15 blur-[150px]" 
            />
          </div>

          {/* CONTENT CONTAINER */}
          <div className="max-w-[1700px] mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] h-full min-h-screen relative px-12 lg:px-24 gap-20 lg:gap-32">
            
            {/* LEFT: TEXT SECTION */}
            <div className="flex flex-col justify-center py-20 lg:py-0 z-20 lg:pr-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: transitionEasing }}
                className="space-y-16"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: transitionEasing }}
                  className="inline-flex items-center gap-3 px-6 py-2 bg-slate-100 rounded-full border border-slate-200 shadow-sm w-fit"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-950">System Access Node</span>
                </motion.div>

                <div className="space-y-6">
                  <h1 className="text-6xl lg:text-[6rem] font-black tracking-tighter uppercase leading-[0.9] text-slate-950">
                    <SplitText
                      text="INDUSTRIAL"
                      className="block"
                      delay={30}
                      duration={1.0}
                      textAlign="left"
                    />
                    <div className="text-slate-400 lg:text-[6.5rem]">
                      <SplitText
                        text="ANALYTICS"
                        className="block"
                        delay={40}
                        duration={1.0}
                        textAlign="left"
                      />
                    </div>
                    <SplitText
                      text="PLATFORM"
                      className="block"
                      delay={50}
                      duration={1.0}
                      textAlign="left"
                    />
                  </h1>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.5, delay: 1.2, ease: transitionEasing }}
                  className="text-xl lg:text-3xl text-slate-400 max-w-xl font-medium tracking-tight leading-normal"
                >
                  Orchestrate high-fidelity industrial landscapes with predictive clarity and absolute synchronization.
                </motion.p>

                {/* Status Indicator */}
                <motion.div
                  className="flex items-center gap-8 mt-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.8 }}
                >
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 shadow-xl overflow-hidden backdrop-blur-md">
                         <div className={`w-full h-full bg-gradient-to-br ${i % 2 === 0 ? 'from-indigo-100 to-white' : 'from-slate-100 to-white'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Platform Sync Status</div>
                    <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                       99.9% System uptime
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* RIGHT: 3D FORM SECTION */}
            <div className="flex items-center justify-center lg:justify-end z-20 pb-20 lg:pb-0">
               <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1.8, delay: 0.8, ease: transitionEasing }}
                  className="w-full lg:w-[520px] perspective-[2000px] h-fit"
               >
                  <motion.div
                    whileHover={{ rotateY: 5, rotateX: 2, scale: 1.02 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                    className="relative group isolate"
                  >
                    <div className="absolute inset-0 bg-slate-900/[0.04] rounded-[5rem] translate-y-16 blur-[120px] -z-10 group-hover:translate-y-20 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-slate-200/50 rounded-[5rem] translate-y-6 blur-[60px] -z-10" />
                    
                    <div className="relative w-full bg-white/40 backdrop-blur-3xl border border-white/60 ring-1 ring-white/40 rounded-[4.5rem] p-12 lg:p-20 shadow-[0_2px_40px_-10px_rgba(0,0,0,0.02)] overflow-hidden">
                       <LoginForm onLoginStart={handleLoginStart} onLoginSuccess={handleLoginSuccess} />
                    </div>
                  </motion.div>
               </motion.div>
            </div>

          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isExiting && (
          <motion.div 
             key="exit-transition"
             className="fixed inset-0 z-[200] bg-slate-950 origin-bottom"
             initial={{ scaleY: 0 }}
             animate={{ scaleY: 1 }}
             transition={{ duration: 1, ease: transitionEasing }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;