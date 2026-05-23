'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Hand, Play, BookOpen, Sliders, Type, Cpu, AlertTriangle, RefreshCw } from 'lucide-react'

// ==================== AUDIO SYNTHESIZER ENGINE ====================
let audioCtx = null;
let lastPlayed = { wake: 0, voice: 0, error: 0 };

const playSound = (type) => {
  const nowMs = Date.now();

  // 🌟 THE BUFFER: Prevent any sound from playing if it was triggered less than 1.5 seconds ago
  if (nowMs - (lastPlayed[type] || 0) < 1500) {
    return;
  }
  lastPlayed[type] = nowMs;

  if (typeof window !== 'undefined' && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'wake' || type === 'voice') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
    setTimeout(() => {
      if(!audioCtx) return;
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
      gain2.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.1);
    }, 120);

  } else if (type === 'error') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

// ==================== ADVANCED ANATOMICAL SVG ENGINE ====================
const GestureIcon = ({ config, animation, showArrows }) => {
  if (config.thumb === 'up') {
    return (
      <motion.svg viewBox="0 0 100 100" className="w-24 h-24 overflow-visible stroke-indigo-400 fill-indigo-950/80 stroke-[2.5px] drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" animate={animation}>
        <rect x="30" y="40" width="25" height="46" rx="10" />
        <rect x="30" y="10" width="12" height="35" rx="6" />
        <rect x="30" y="42" width="38" height="9" rx="4.5" className="fill-indigo-900" />
        <rect x="30" y="53" width="38" height="9" rx="4.5" className="fill-indigo-900" />
        <rect x="30" y="64" width="38" height="9" rx="4.5" className="fill-indigo-900" />
        <rect x="30" y="75" width="38" height="9" rx="4.5" className="fill-indigo-900" />
      </motion.svg>
    )
  }

  return (
    <motion.svg viewBox="0 0 100 100" className="w-24 h-24 overflow-visible stroke-indigo-400 fill-indigo-950/80 stroke-[2.5px] drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" animate={animation}>
      {config.index && <rect x="28" y="10" width="10" height="40" rx="5" />}
      {config.middle && <rect x="41" y="3" width="10" height="47" rx="5" />}
      {config.ring && <rect x="54" y="12" width="10" height="38" rx="5" />}
      {config.pinky && <rect x="67" y="22" width="10" height="28" rx="5" />}
      {config.thumb === 'side' && <rect x="2" y="50" width="30" height="12" rx="6" />}
      <rect x="25" y="42" width="54" height="45" rx="12" />
      {!config.index && <rect x="28" y="42" width="10" height="22" rx="5" className="fill-indigo-900" />}
      {!config.middle && <rect x="41" y="42" width="10" height="22" rx="5" className="fill-indigo-900" />}
      {!config.ring && <rect x="54" y="42" width="10" height="22" rx="5" className="fill-indigo-900" />}
      {!config.pinky && <rect x="67" y="42" width="10" height="22" rx="5" className="fill-indigo-900" />}
      {config.thumb === 'down' && <rect x="25" y="55" width="28" height="12" rx="6" className="fill-indigo-900" />}
      {showArrows && (
        <g className="stroke-emerald-400 fill-transparent stroke-[3px]">
          <path d="M 85 30 L 85 45 M 80 35 L 85 30 L 90 35" />
          <path d="M 85 55 L 85 70 M 80 65 L 85 70 L 90 65" />
        </g>
      )}
    </motion.svg>
  )
}

const CONFIG = {
  APP_NAME: 'AccessAI',
  APP_SUBTITLE: 'Navigate Your World, Hands-Free.',
  LOADING_TEXT: 'Initializing Vision Matrix...',
  USERS: [
    { id: 'guest', name: 'Guest', avatar: '👤' },
    { id: 'alex', name: 'Alex', avatar: '👨' },
    { id: 'jordan', name: 'Jordan', avatar: '👩' },
  ],
  GESTURES: [
    { name: 'Wake / Sleep', desc: 'Index & Pinky UP. All other fingers folded.', config: { index: true, pinky: true, middle: false, ring: false, thumb: 'down' }, animation: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } } },
    { name: 'Move Cursor', desc: 'Only Index finger UP. All others folded.', config: { index: true, pinky: false, middle: false, ring: false, thumb: 'down' }, animation: { x: [-6, 6, -6], y: [-4, 4, -4], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } } },
    { name: 'Left Click', desc: 'Index & Middle UP. All others folded.', config: { index: true, middle: true, pinky: false, ring: false, thumb: 'down' }, animation: { scale: [1, 0.85, 1], transition: { repeat: Infinity, duration: 1.5, repeatDelay: 1 } } },
    { name: 'Right Click', desc: 'Index, Middle, & Ring UP. Others folded.', config: { index: true, middle: true, ring: true, pinky: false, thumb: 'down' }, animation: { scale: [1, 0.85, 1], transition: { repeat: Infinity, duration: 1.5, repeatDelay: 1.2 } } },
    { name: 'Press Enter', desc: 'Only Thumb UP. All four fingers folded.', config: { thumb: 'up', index: false, middle: false, ring: false, pinky: false }, animation: { y: [0, -8, 0], transition: { repeat: Infinity, duration: 1.5, repeatDelay: 0.5 } } },
    { name: 'Scroll Page', desc: 'Thumb sideways. Four fingers folded. Move hand up/down.', config: { thumb: 'side', index: false, middle: false, ring: false, pinky: false }, showArrows: true, animation: { y: [-12, 12, -12], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } } },
    { name: 'Voice Toggle', desc: 'Only Pinky UP. All others folded.', config: { pinky: true, index: false, middle: false, ring: false, thumb: 'down' }, animation: { rotate: [-12, 18, -12], originX: 0.5, originY: 0.9, transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } } },
  ],
}

export default function App() {
  const [state, setState] = useState({
    view: 'login',
    currentUser: null,
    showSettings: false,
    showTutorial: false,
    systemActive: false,
    handGesturesActive: false,
    voiceCommandsActive: false,
    liveStatus: 'System Idle',
    dictatedText: '',
    calibrationStage: 0,
    cameraError: false,
    settings: { mouseSpeed: 50, mouseSmoothing: 75, scrollSensitivity: 30 },
  })

  const mousePosition = useRef({ x: 0, y: 0 })
  const ws = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => mousePosition.current = { x: e.clientX, y: e.clientY }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws')

    ws.current.onopen = () => {
      console.log('🟢 Connected to Python Backend!')
      ws.current.send(JSON.stringify({ action: "dashboard_connected" }))
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.action === "dictation_update") {
        setState((prev) => ({ ...prev, dictatedText: prev.dictatedText + " " + data.text }))
      }
      else if (data.action === "sync_voice") {
        playSound('voice')
        setState((prev) => ({
          ...prev,
          voiceCommandsActive: data.active,
          dictatedText: data.active ? 'Listening natively via Local Whisper AI...' : prev.dictatedText
        }))
      }
      else if (data.action === "gesture_update") {
        // 🌟 REMOVED the Shaka audio trigger from here. It will just update the live text now.
        setState((prev) => ({ ...prev, liveStatus: data.status }))
      }
      else if (data.action === "camera_error") {
        playSound('error')
        setState((prev) => ({ ...prev, cameraError: true, systemActive: false, handGesturesActive: false, calibrationStage: 0 }))
      }
    }

    return () => { if (ws.current) ws.current.close() }
  }, [])

  const handleUserSelect = (user) => {
    setState((prev) => ({ ...prev, currentUser: user, view: 'loading' }))
    setTimeout(() => setState((prev) => ({ ...prev, view: 'dashboard', showTutorial: true })), 2500)
  }

  const handleToggleHandGestures = () => {
    const newState = !state.handGesturesActive

    // 🌟 ONLY play the wake sound when the physical UI button is clicked
    playSound('wake')

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: "toggle_gestures", active: newState }))
    }
    setState((prev) => ({ ...prev, handGesturesActive: newState, systemActive: newState, cameraError: false }))
  }

  const handleToggleVoiceCommands = () => {
    const newState = !state.voiceCommandsActive
    playSound('voice')
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: "toggle_voice", active: newState }))
    }
    setState((prev) => ({ ...prev, voiceCommandsActive: newState, dictatedText: newState ? 'Listening natively via Local Whisper AI...' : '' }))
  }

  const handleStartSystem = () => {
    setState((prev) => ({ ...prev, calibrationStage: 1, cameraError: false }))
    setTimeout(() => setState((prev) => ({ ...prev, calibrationStage: 2 })), 1000)
    setTimeout(() => setState((prev) => ({ ...prev, calibrationStage: 3 })), 2000)

    setTimeout(() => {
      playSound('wake')
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: "initialize_matrix" }))
      }
      setState((prev) => ({ ...prev, systemActive: true, handGesturesActive: true, calibrationStage: 0 }))
    }, 3000)
  }

  const handleSaveSettings = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: "update_settings", settings: state.settings }))
    }
    setState((prev) => ({ ...prev, showSettings: false }))
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-black">
        <motion.div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ background: `radial-gradient(800px at ${mousePosition.current.x}px ${mousePosition.current.y}px, rgba(99, 102, 241, 0.15), transparent 80%)` }} transition={{ type: 'tween', duration: 0.1 }} />
      </div>

      <AnimatePresence mode="wait">
        {state.view === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="flex items-center justify-center min-h-screen px-4">
            <div className="text-center">
              <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tighter">{CONFIG.APP_NAME}</motion.h1>
              <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-xl md:text-2xl text-slate-400 mb-16 font-light">{CONFIG.APP_SUBTITLE}</motion.p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {CONFIG.USERS.map((user) => (
                  <motion.button key={user.id} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} onClick={() => handleUserSelect(user)} className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-indigo-500/20 transition-all flex flex-col items-center gap-6 group">
                    <span className="text-6xl group-hover:scale-110 transition-transform">{user.avatar}</span>
                    <span className="text-xl font-bold text-slate-200">{user.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {state.view === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center min-h-screen">
            <div className="text-center flex flex-col items-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-24 h-24 mb-8 rounded-full border-4 border-slate-800 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]" />
              <h2 className="text-3xl font-bold text-white mb-2">{CONFIG.LOADING_TEXT}</h2>
              <p className="text-slate-400 font-medium">Authenticating {state.currentUser?.name}...</p>
            </div>
          </motion.div>
        )}

        {state.view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen p-4 md:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30"><Hand className="text-indigo-400 w-8 h-8" /></div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{CONFIG.APP_NAME}</h1>
                  <p className="text-sm text-slate-400 font-medium uppercase">Core Systems Online</p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setState((prev) => ({ ...prev, showTutorial: true }))} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-slate-200 font-bold hover:bg-white/10 transition-all shadow-xl">
                <BookOpen className="w-5 h-5" /> User Manual
              </motion.button>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              <div className="lg:w-80 flex flex-col gap-5 flex-shrink-0">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleToggleHandGestures} className={`p-6 rounded-3xl font-bold transition-all flex flex-col gap-4 border backdrop-blur-xl ${state.handGesturesActive ? 'bg-indigo-600/90 text-white border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3"><Hand className="w-7 h-7" /><span className="text-xl">Hand Gestures</span></div>
                  <span className={`text-sm font-medium ${state.handGesturesActive ? 'text-indigo-200' : 'text-slate-500'}`}>{state.handGesturesActive ? 'Matrix Active & Tracking' : 'System Paused'}</span>
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleToggleVoiceCommands} className={`p-6 rounded-3xl font-bold transition-all flex flex-col gap-4 border backdrop-blur-xl ${state.voiceCommandsActive ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3"><Mic className="w-7 h-7" /><span className="text-xl">Voice Commands</span></div>
                  <span className={`text-sm font-medium ${state.voiceCommandsActive ? 'text-emerald-100' : 'text-slate-500'}`}>{state.voiceCommandsActive ? 'Mic Active - Listening' : 'System Paused'}</span>
                </motion.button>

                <div className="mt-auto p-8 rounded-3xl bg-slate-800/50 backdrop-blur-xl border border-white/10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[60px] opacity-20 -mr-20 -mt-20 group-hover:opacity-40 transition-opacity" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Live Status</span>
                  <p className="text-2xl font-bold leading-snug relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{state.liveStatus}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-6">
                <div className="flex-1 relative rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center ring-1 ring-white/5">

                  {state.cameraError ? (
                    <div className="flex flex-col items-center text-center p-8">
                      <AlertTriangle className="w-20 h-20 text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                      <h2 className="text-3xl font-bold text-white mb-4">Hardware Disconnected</h2>
                      <p className="text-slate-400 max-w-md mb-8">AccessAI lost connection to your webcam. Please check your USB cable or Privacy Settings and try again.</p>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setState(prev => ({...prev, cameraError: false}))} className="px-8 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold flex items-center gap-3 hover:bg-slate-700 transition-colors">
                        <RefreshCw className="w-5 h-5" /> Dismiss Error
                      </motion.button>
                    </div>
                  ) : state.systemActive && state.handGesturesActive ? (
                    <>
                      <img src="http://localhost:8000/video_feed" alt="Video Feed" className="w-full h-full object-contain opacity-90" />
                      <div className="absolute top-6 left-6 flex items-center gap-3 text-indigo-400 bg-black/50 px-4 py-2 rounded-2xl text-sm font-bold tracking-widest backdrop-blur-md border border-indigo-500/30">
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}><Cpu className="w-5 h-5" /></motion.div>
                        ANALYZING
                      </div>
                    </>
                  ) : state.calibrationStage > 0 ? (
                    <div className="flex flex-col items-center">
                       <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 mb-8 rounded-full border-4 border-slate-800 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]" />
                       <AnimatePresence mode="wait">
                         {state.calibrationStage === 1 && <motion.h2 key="1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-2xl font-bold text-indigo-300 tracking-widest">ALIGNING VISION MATRIX...</motion.h2>}
                         {state.calibrationStage === 2 && <motion.h2 key="2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-2xl font-bold text-emerald-300 tracking-widest">CALIBRATING NEURAL ENGINE...</motion.h2>}
                         {state.calibrationStage === 3 && <motion.h2 key="3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-2xl font-bold text-white tracking-widest">MATRIX ONLINE.</motion.h2>}
                       </AnimatePresence>
                    </div>
                  ) : (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleStartSystem} className="flex flex-col items-center gap-6 px-12 py-10 rounded-3xl bg-slate-800/80 text-indigo-300 font-bold border border-indigo-500/20 hover:bg-slate-700/80 hover:text-indigo-200 shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all">
                      <Play className="w-16 h-16 opacity-80" fill="currentColor" />
                      <span className="text-2xl tracking-widest font-semibold opacity-90">INITIALIZE MATRIX</span>
                    </motion.button>
                  )}
                </div>

                <div className="h-48 rounded-3xl bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl p-8 flex flex-col relative overflow-hidden">
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-4 uppercase tracking-widest">
                    <Type className="w-4 h-4 text-indigo-400" /> Live Dictation Output
                  </span>
                  <p className="text-slate-200 font-medium text-lg italic overflow-y-auto pr-4 leading-relaxed">
                    {state.dictatedText || "Waiting for voice input..."}
                  </p>
                </div>
              </div>

              <div className="lg:w-56 flex flex-col justify-end flex-shrink-0">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setState((prev) => ({ ...prev, showSettings: true }))} className="w-full p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-5 shadow-2xl">
                  <div className="p-4 bg-indigo-500/20 rounded-full"><Sliders className="w-8 h-8 text-indigo-400" /></div>
                  <span className="text-lg">Tune Settings</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setState((prev) => ({ ...prev, showSettings: false }))} className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl z-50 p-8 flex flex-col">
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-black text-white">System Tuner</h2>
                <button onClick={() => setState((prev) => ({ ...prev, showSettings: false }))} className="text-3xl text-slate-500 hover:text-white transition-colors">×</button>
              </div>

              <div className="space-y-10 flex-1">
                <div>
                  <label className="flex justify-between text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">
                    Mouse Speed <span className="text-indigo-400">{state.settings.mouseSpeed}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={state.settings.mouseSpeed} onChange={(e) => setState((prev) => ({ ...prev, settings: { ...prev.settings, mouseSpeed: parseInt(e.target.value) } }))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">
                    Cursor Smoothing <span className="text-indigo-400">{state.settings.mouseSmoothing}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={state.settings.mouseSmoothing} onChange={(e) => setState((prev) => ({ ...prev, settings: { ...prev.settings, mouseSmoothing: parseInt(e.target.value) } }))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">
                    Scroll Sensitivity <span className="text-indigo-400">{state.settings.scrollSensitivity}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={state.settings.scrollSensitivity} onChange={(e) => setState((prev) => ({ ...prev, settings: { ...prev.settings, scrollSensitivity: parseInt(e.target.value) } }))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveSettings} className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all mt-8 border border-indigo-400/50">
                Deploy Settings
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.showTutorial && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setState((prev) => ({ ...prev, showTutorial: false }))} className="fixed inset-0 bg-black/70 backdrop-blur-md z-40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden pointer-events-auto p-10 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-8 flex-shrink-0">
                  <h3 className="text-4xl font-black text-white tracking-tight">System Cheat Sheet</h3>
                  <button onClick={() => setState((prev) => ({ ...prev, showTutorial: false }))} className="text-3xl text-slate-500 hover:text-white transition-colors">×</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 overflow-y-auto pr-2 pb-4 flex-1">
                  {CONFIG.GESTURES.map((gesture) => (
                    <div key={gesture.name} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors shadow-lg group">
                      <div className="mb-4 h-28 flex items-center justify-center">
                         <GestureIcon config={gesture.config} animation={gesture.animation} showArrows={gesture.showArrows} />
                      </div>
                      <p className="font-bold text-indigo-300 mb-3 text-xl">{gesture.name}</p>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">{gesture.desc}</p>
                    </div>
                  ))}
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setState((prev) => ({ ...prev, showTutorial: false }))} className="w-full py-5 rounded-2xl bg-white text-slate-900 font-black text-lg hover:bg-slate-200 transition-colors flex-shrink-0">
                  Matrix Understood
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}