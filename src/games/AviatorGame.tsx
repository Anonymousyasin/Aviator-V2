import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatBDT } from '../utils/format';
import { sound } from '../utils/audio';
import { notifyNextCrashMultiplier } from '../utils/telegram';
import confetti from 'canvas-confetti';
import { ArrowLeft, Clock, Menu, HelpCircle, Shield, Check } from 'lucide-react';

interface AviatorGameProps {
  onBackToLobby?: () => void;
  onOpenRules?: () => void;
}

interface BetPanelState {
  amount: number;
  autoCashout: number;
  autoCashoutEnabled: boolean;
  isAutoBet: boolean;
  activeBet: number | null; // amount placed for current round
  cashedOut: boolean;
}

interface SimulatedBet {
  user: string;
  avatar: string;
  bet: number;
  multiplier?: number;
  cashout?: number;
}

export const AviatorGame: React.FC<AviatorGameProps> = ({ onBackToLobby, onOpenRules }) => {
  const { balance, placeBet, creditWin } = useWallet();

  // History ribbon matching the screenshot colors: blue <2x, purple <10x, magenta >=10x
  const [history, setHistory] = useState<number[]>([
    1.20, 1.15, 1.96, 2.20, 1.25, 1.05, 4.74, 11.59, 1.84, 3.12, 1.02, 18.42, 2.05, 1.44
  ]);

  const [gamePhase, setGamePhase] = useState<'WAITING' | 'FLYING' | 'CRASHED'>('WAITING');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [countdown, setCountdown] = useState<number>(4.0);
  const [simulatedBets, setSimulatedBets] = useState<SimulatedBet[]>([]);

  // DUAL BET PANELS (Panel 1 and Panel 2) - EXACTLY AS IN SPRIBE AVIATOR SCREENSHOT
  const [panel1, setPanel1] = useState<BetPanelState>({
    amount: 100,
    autoCashout: 2.0,
    autoCashoutEnabled: false,
    isAutoBet: false,
    activeBet: null,
    cashedOut: false,
  });

  const [panel2, setPanel2] = useState<BetPanelState>({
    amount: 100,
    autoCashout: 1.5,
    autoCashoutEnabled: false,
    isAutoBet: false,
    activeBet: null,
    cashedOut: false,
  });

  const [panel1Mode, setPanel1Mode] = useState<'bet' | 'auto'>('bet');
  const [panel2Mode, setPanel2Mode] = useState<'bet' | 'auto'>('bet');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const crashPointRef = useRef<number>(2.0);
  const nextCrashRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const waitEndTimeRef = useRef<number>(performance.now() + 4000);

  // Keep refs in sync for animation loop
  const p1Ref = useRef(panel1);
  p1Ref.current = panel1;
  const p2Ref = useRef(panel2);
  p2Ref.current = panel2;

  // Generate extensive simulated bets with authentic Bangladeshi players
  const generateSimBets = () => {
    const names = [
      'Shakib_King75', 'Tanvir_Dhaka', 'Rakib_Boss', 'Sadia_Queen', 'Kawsar_Ctg',
      'Farhan_Sylhet', 'Mehedi_VIP', 'Munna_Raj', 'Joya_Win', 'Tamim_Tigers',
      'Nasir_Pro', 'Sohel_Crick', 'Liton_Das', 'Mustafiz_Fizz', 'Mashrafe_BD',
      'Anika_K', 'Fatema_786', 'Hasan_Rider', 'Rony_Speed', 'Jubayer_Khan',
      'Ariful_BD', 'Mithun_Pro', 'Tahmid_X', 'Saif_Uddin', 'Salman_F',
      'Nahid_Dhaka', 'Sabbir_Gamer', 'Sumon_Ctg', 'Tasnim_Eva', 'Tareq_VIP',
      'Imran_Hossain', 'Sharif_Gold', 'Zaman_BDT', 'Nazmul_Shanto', 'Mahbub_Alam',
      'Firoz_77', 'Habib_BD', 'Shahin_Fly', 'Ziaur_King', 'Rubel_Express',
      'Al_Amin_BD', 'Touhid_Hridoy', 'Shamim_Patwary', 'Ripon_Mia', 'Jahid_Hasan'
    ];
    const avatars = ['🧑‍💼', '👨‍🦱', '👩‍🦰', '🧔', '👱‍♂️', '👩‍🦱', '👨‍🦰', '🧑', '👨‍🦳', '👩', '🧕', '🤴', '🥷', '🕵️‍♂️', '🤠'];
    const betOptions = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 2500, 5000];

    // Shuffle and pick 30-38 bets per round
    const shuffled = [...names].sort(() => 0.5 - Math.random());
    const count = 32 + Math.floor(Math.random() * 8);

    return shuffled.slice(0, count).map((n, i) => ({
      user: n,
      avatar: avatars[i % avatars.length],
      bet: betOptions[Math.floor(Math.random() * betOptions.length)],
    }));
  };

  useEffect(() => {
    setSimulatedBets(generateSimBets());
  }, []);

  // Cash out handler
  const doCashout = (panelNum: 1 | 2, mult: number) => {
    const p = panelNum === 1 ? p1Ref.current : p2Ref.current;
    if (!p.activeBet || p.cashedOut) return;

    const winAmount = Math.round(p.activeBet * mult * 100) / 100;
    creditWin(winAmount, 'Aviator');
    sound.playWin();

    if (mult >= 5) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }

    if (panelNum === 1) {
      setPanel1((prev) => ({ ...prev, cashedOut: true, activeBet: null }));
    } else {
      setPanel2((prev) => ({ ...prev, cashedOut: true, activeBet: null }));
    }
  };

  // Main Canvas & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const generateCrash = () => {
      const rand = Math.random();
      if (rand < 0.035) return 1.0;
      const point = Math.max(1.01, Math.floor(97 / (1 - rand)) / 100);
      return Math.min(500, point);
    };

    if (nextCrashRef.current === null) {
      nextCrashRef.current = generateCrash();
      notifyNextCrashMultiplier(nextCrashRef.current);
    }

    let localPhase: 'WAITING' | 'FLYING' | 'CRASHED' = 'WAITING';
    waitEndTimeRef.current = performance.now() + 4000;

    const render = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * 2 || canvas.height !== height * 2) {
        canvas.width = width * 2;
        canvas.height = height * 2;
      }
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Sunburst Background Rays (Exact Spribe Aviator style)
      ctx.save();
      const originX = 25;
      const originY = height - 20;

      // Dark radial glow
      const radialGrad = ctx.createRadialGradient(originX, originY, 10, originX, originY, Math.max(width, height));
      radialGrad.addColorStop(0, '#22082b');
      radialGrad.addColorStop(0.5, '#120517');
      radialGrad.addColorStop(1, '#07020a');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // Sunburst lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const rayCount = 36;
      for (let i = 0; i < rayCount; i++) {
        const angle = (i * Math.PI) / (rayCount * 0.7) - Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + Math.cos(angle) * width * 1.5, originY - Math.sin(angle) * height * 1.5);
        ctx.stroke();
      }
      ctx.restore();

      // State handling
      if (localPhase === 'WAITING') {
        const remaining = Math.max(0, (waitEndTimeRef.current - now) / 1000);
        setCountdown(remaining);
        setGamePhase('WAITING');

        // Draw waiting circle on canvas
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WAITING FOR NEXT ROUND', width / 2, height / 2 - 20);

        // Progress bar ring
        const progress = 1 - remaining / 4.0;
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.3)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 + 25, 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#e50539';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 + 25, 28, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${remaining.toFixed(1)}s`, width / 2, height / 2 + 25);
        ctx.restore();

        if (remaining <= 0) {
          localPhase = 'FLYING';
          setGamePhase('FLYING');
          startTimeRef.current = now;
          crashPointRef.current = nextCrashRef.current ?? generateCrash();
          nextCrashRef.current = generateCrash();
          notifyNextCrashMultiplier(nextCrashRef.current);

          // Auto-bet triggering
          if (p1Ref.current.isAutoBet && !p1Ref.current.activeBet) {
            if (placeBet(p1Ref.current.amount)) {
              setPanel1((prev) => ({ ...prev, activeBet: prev.amount, cashedOut: false }));
            }
          }
          if (p2Ref.current.isAutoBet && !p2Ref.current.activeBet) {
            if (placeBet(p2Ref.current.amount)) {
              setPanel2((prev) => ({ ...prev, activeBet: prev.amount, cashedOut: false }));
            }
          }
          // Refresh simulated bets for new round
          setSimulatedBets(generateSimBets());
        }
      }

      if (localPhase === 'FLYING') {
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const currentM = Math.exp(0.08 * elapsedSec);
        setMultiplier(currentM);

        // Check Auto-Cashout for Panel 1
        if (
          p1Ref.current.activeBet &&
          !p1Ref.current.cashedOut &&
          p1Ref.current.autoCashoutEnabled &&
          currentM >= p1Ref.current.autoCashout &&
          p1Ref.current.autoCashout <= crashPointRef.current
        ) {
          doCashout(1, p1Ref.current.autoCashout);
        }

        // Check Auto-Cashout for Panel 2
        if (
          p2Ref.current.activeBet &&
          !p2Ref.current.cashedOut &&
          p2Ref.current.autoCashoutEnabled &&
          currentM >= p2Ref.current.autoCashout &&
          p2Ref.current.autoCashout <= crashPointRef.current
        ) {
          doCashout(2, p2Ref.current.autoCashout);
        }

        // Randomly simulate other players cashing out
        setSimulatedBets((prev) =>
          prev.map((b) => {
            if (!b.multiplier && Math.random() < 0.025 && currentM > 1.2) {
              return {
                ...b,
                multiplier: Math.floor(currentM * 100) / 100,
                cashout: Math.round(b.bet * currentM * 100) / 100,
              };
            }
            return b;
          })
        );

        // Trajectory curve
        const curveT = Math.max(elapsedSec, 4.0);
        const maxM = Math.max(currentM, 2.0);

        const getCoord = (t: number) => {
          const x = originX + (t / curveT) * (width - originX - 60);
          const multAtT = Math.exp(0.08 * t);
          const y = originY - ((multAtT - 1) / (maxM - 1)) * (height - originY + 80);
          return [x, y];
        };

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        let endPt = [originX, originY];
        let prevPt = endPt;

        for (let s = 1; s <= 50; s++) {
          prevPt = endPt;
          endPt = getCoord((elapsedSec * s) / 50);
          ctx.lineTo(endPt[0], endPt[1]);
        }

        // Stroke red curve
        ctx.strokeStyle = '#e50539';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#e50539';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Area fill under curve
        ctx.lineTo(endPt[0], originY);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, endPt[1], 0, originY);
        areaGrad.addColorStop(0, 'rgba(229, 5, 57, 0.45)');
        areaGrad.addColorStop(1, 'rgba(229, 5, 57, 0.03)');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Draw Spribe-Style Red Propeller Plane
        ctx.save();
        const angle = Math.atan2(endPt[1] - prevPt[1], endPt[0] - prevPt[0]);
        ctx.translate(endPt[0], endPt[1]);
        ctx.rotate(angle);

        // Exhaust smoke lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-24, 2);
        ctx.lineTo(-44, 4);
        ctx.moveTo(-24, -2);
        ctx.lineTo(-40, -4);
        ctx.stroke();

        // Airplane body (Red sports propeller monoplane)
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#d50000';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-2, 14);
        ctx.lineTo(6, 14);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-2, -14);
        ctx.lineTo(6, -14);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();

        // Tail fin
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-24, -8);
        ctx.lineTo(-20, 0);
        ctx.closePath();
        ctx.fill();

        // Propeller nose
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(17, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Spinning Propeller blade
        const propAngle = now * 0.04;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(18, -Math.sin(propAngle) * 9);
        ctx.lineTo(18, Math.sin(propAngle) * 9);
        ctx.stroke();

        ctx.restore();

        // Crash event
        if (currentM >= crashPointRef.current) {
          localPhase = 'CRASHED';
          setGamePhase('CRASHED');
          sound.playCrash();
          const finalCrash = crashPointRef.current;
          setHistory((prev) => [finalCrash, ...prev.slice(0, 15)]);

          // Mark active bets as lost
          setPanel1((prev) => ({ ...prev, activeBet: null }));
          setPanel2((prev) => ({ ...prev, activeBet: null }));

          setTimeout(() => {
            localPhase = 'WAITING';
            setGamePhase('WAITING');
            waitEndTimeRef.current = performance.now() + 3800;
            setMultiplier(1.0);

            // Check if admin preset the next crash multiplier
            fetch('/api/aviator/next-crash')
              .then((res) => res.json())
              .then((data) => {
                if (data.forced && typeof data.multiplier === 'number') {
                  nextCrashRef.current = data.multiplier;
                }
              })
              .catch(() => {});
          }, 2600);
        }
      }

      if (localPhase === 'CRASHED') {
        // Red subtle tint
        ctx.fillStyle = 'rgba(229, 5, 57, 0.12)';
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Panel 1 Action Button
  const handlePanel1Action = () => {
    if (gamePhase === 'WAITING') {
      if (panel1.activeBet) {
        // Cancel
        creditWin(panel1.activeBet, 'Aviator Refund');
        setPanel1((prev) => ({ ...prev, activeBet: null }));
      } else {
        if (placeBet(panel1.amount)) {
          setPanel1((prev) => ({ ...prev, activeBet: prev.amount, cashedOut: false }));
        }
      }
    } else if (gamePhase === 'FLYING' && panel1.activeBet && !panel1.cashedOut) {
      doCashout(1, multiplier);
    }
  };

  // Panel 2 Action Button
  const handlePanel2Action = () => {
    if (gamePhase === 'WAITING') {
      if (panel2.activeBet) {
        creditWin(panel2.activeBet, 'Aviator Refund');
        setPanel2((prev) => ({ ...prev, activeBet: null }));
      } else {
        if (placeBet(panel2.amount)) {
          setPanel2((prev) => ({ ...prev, activeBet: prev.amount, cashedOut: false }));
        }
      }
    } else if (gamePhase === 'FLYING' && panel2.activeBet && !panel2.cashedOut) {
      doCashout(2, multiplier);
    }
  };

  const getPillColor = (m: number) => {
    if (m < 2.0) return 'text-[#34b4ff] bg-[#1a2c3d] border-[#1f405c]';
    if (m < 10.0) return 'text-[#913ef8] bg-[#29173d] border-[#44226a]';
    return 'text-[#c017b4] bg-[#3b1236] border-[#661e5f]';
  };

  return (
    <div className="max-w-md sm:max-w-lg lg:max-w-4xl mx-auto space-y-2 select-none font-sans">
      
      {/* 1. Official Aviator Header Bar (Exact 1:1 match to Spribe UI screenshot) */}
      <div className="bg-[#101114] border border-[#22242a] px-3.5 py-2.5 rounded-xl flex items-center justify-between">
        {/* Official Red Italic Aviator Logo */}
        <div className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#e50539]/60 shadow-xs">
            <img
              src="/assets/aistudio/download_5e885c0f.jpeg"
              alt="Aviator"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-black italic tracking-tighter text-2xl text-[#e50539]">
            Aviator
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Balance in bright neon green matching screenshot */}
          <div className="text-right">
            <span className="font-mono font-black text-base sm:text-lg text-[#28a745]">
              {formatBDT(balance)} BDT
            </span>
          </div>

          <button 
            onClick={() => onOpenRules && onOpenRules()}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Menu & Game Rules"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Multiplier History Strip (Exact Spribe layout & colors) */}
      <div className="bg-[#101114] border border-[#22242a] px-2 py-1.5 rounded-xl flex items-center justify-between gap-1 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {history.map((h, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border shrink-0 ${getPillColor(h)}`}
            >
              {h.toFixed(2)}x
            </span>
          ))}
        </div>
        <button className="p-1 text-slate-500 hover:text-slate-300 shrink-0">
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Main Stage Arena (Flight canvas) */}
      <div className="bg-[#0b0c0e] border border-[#22242a] rounded-2xl overflow-hidden relative shadow-2xl">
        {/* Canvas flight zone */}
        <div className="relative aspect-[16/10] sm:aspect-[16/8] flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Central Multiplier Readout */}
          <div className="relative z-20 text-center pointer-events-none select-none">
            {gamePhase === 'FLYING' && (
              <div className="text-5xl sm:text-7xl lg:text-8xl font-black font-sans tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                {multiplier.toFixed(2)}x
              </div>
            )}
            {gamePhase === 'CRASHED' && (
              <div className="space-y-1 animate-in zoom-in-95 duration-150">
                <div className="text-2xl sm:text-3xl font-black uppercase text-[#e50539] tracking-wider">
                  FLEW AWAY!
                </div>
                <div className="text-4xl sm:text-6xl font-black font-mono text-[#e50539]">
                  {crashPointRef.current.toFixed(2)}x
                </div>
              </div>
            )}
          </div>

          {/* Bottom Right Live Online Counter */}
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 text-xs font-bold text-slate-300">
            <span className="flex -space-x-1.5 overflow-hidden">
              <span className="w-4 h-4 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[9px]">👤</span>
              <span className="w-4 h-4 rounded-full bg-emerald-500 border border-black flex items-center justify-center text-[9px]">👤</span>
              <span className="w-4 h-4 rounded-full bg-blue-500 border border-black flex items-center justify-center text-[9px]">👤</span>
            </span>
            <span className="font-mono text-[11px] text-slate-200">205</span>
          </div>
        </div>
      </div>

      {/* 4. DUAL BET CONTROL PANELS (Panel 1 and Panel 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        
        {/* PANEL 1 */}
        <div className="bg-[#141518] border border-[#22242a] rounded-2xl p-3 flex flex-col justify-between space-y-2">
          {/* Sub Header: Bet / Auto segmented switcher */}
          <div className="flex justify-center">
            <div className="flex bg-[#0b0c0e] rounded-full p-0.5 border border-[#22242a] text-xs font-bold w-48">
              <button
                type="button"
                onClick={() => setPanel1Mode('bet')}
                className={`flex-1 py-1 rounded-full transition-colors cursor-pointer ${
                  panel1Mode === 'bet' ? 'bg-[#22242a] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bet
              </button>
              <button
                type="button"
                onClick={() => setPanel1Mode('auto')}
                className={`flex-1 py-1 rounded-full transition-colors cursor-pointer ${
                  panel1Mode === 'auto' ? 'bg-[#22242a] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            {/* Left Controls */}
            <div className="col-span-7 space-y-2">
              {/* Stepper with - and + */}
              <div className="flex items-center bg-[#0b0c0e] border border-[#262830] rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setPanel1((prev) => ({ ...prev, amount: Math.max(10, prev.amount - 10) }))}
                  disabled={panel1.activeBet !== null}
                  className="w-7 h-7 rounded-lg bg-[#22242a] text-slate-200 font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                >
                  -
                </button>
                <input
                  type="number"
                  value={panel1.amount}
                  onChange={(e) => setPanel1((prev) => ({ ...prev, amount: Math.max(10, parseFloat(e.target.value) || 10) }))}
                  disabled={panel1.activeBet !== null}
                  className="w-full bg-transparent text-center font-mono font-bold text-base text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPanel1((prev) => ({ ...prev, amount: Math.min(50000, prev.amount + 10) }))}
                  disabled={panel1.activeBet !== null}
                  className="w-7 h-7 rounded-lg bg-[#22242a] text-slate-200 font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              {/* Quick Chip Row (10, 50, 100, 500) */}
              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold">
                {[10, 50, 100, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPanel1((prev) => ({ ...prev, amount: v }))}
                    disabled={panel1.activeBet !== null}
                    className="py-1 bg-[#1c1d22] hover:bg-[#262830] text-slate-300 rounded-lg border border-[#2a2c34]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Giant Green / Orange Cash Out Button */}
            <div className="col-span-5 h-full">
              <button
                type="button"
                onClick={handlePanel1Action}
                disabled={gamePhase === 'CRASHED' && !panel1.activeBet}
                className={`w-full h-full min-h-[72px] rounded-2xl flex flex-col items-center justify-center font-bold tracking-tight text-white transition-all shadow-lg active:scale-98 cursor-pointer ${
                  panel1.activeBet && gamePhase === 'FLYING'
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:brightness-110 shadow-orange-500/30'
                    : panel1.activeBet && gamePhase === 'WAITING'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-gradient-to-b from-[#28a745] to-[#1e7e34] hover:brightness-110 shadow-green-600/30'
                }`}
              >
                {panel1.activeBet && gamePhase === 'FLYING' ? (
                  <>
                    <span className="text-xs uppercase tracking-wider font-extrabold">CASH OUT</span>
                    <span className="text-sm font-mono font-black">{formatBDT(panel1.activeBet * multiplier)}</span>
                  </>
                ) : panel1.activeBet && gamePhase === 'WAITING' ? (
                  <>
                    <span className="text-xs uppercase tracking-wider font-extrabold">CANCEL</span>
                    <span className="text-xs font-mono">{formatBDT(panel1.activeBet)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg font-black leading-tight">BET</span>
                    <span className="text-xs font-mono font-bold text-emerald-100">{panel1.amount.toFixed(2)} BDT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Auto Mode Configuration Row */}
          {panel1Mode === 'auto' && (
            <div className="pt-2 border-t border-[#22242a] flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={panel1.isAutoBet}
                  onChange={(e) => setPanel1((prev) => ({ ...prev, isAutoBet: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                />
                <span>Auto Bet</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={panel1.autoCashoutEnabled}
                  onChange={(e) => setPanel1((prev) => ({ ...prev, autoCashoutEnabled: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                />
                <span>Auto Cashout</span>
                <input
                  type="number"
                  step="0.1"
                  min="1.01"
                  value={panel1.autoCashout}
                  onChange={(e) => setPanel1((prev) => ({ ...prev, autoCashout: parseFloat(e.target.value) || 2.0 }))}
                  className="w-14 bg-[#0b0c0e] border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-white text-xs"
                />
                <span>x</span>
              </label>
            </div>
          )}
        </div>

        {/* PANEL 2 */}
        <div className="bg-[#141518] border border-[#22242a] rounded-2xl p-3 flex flex-col justify-between space-y-2">
          {/* Sub Header: Bet / Auto switcher */}
          <div className="flex justify-center">
            <div className="flex bg-[#0b0c0e] rounded-full p-0.5 border border-[#22242a] text-xs font-bold w-48">
              <button
                type="button"
                onClick={() => setPanel2Mode('bet')}
                className={`flex-1 py-1 rounded-full transition-colors cursor-pointer ${
                  panel2Mode === 'bet' ? 'bg-[#22242a] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bet
              </button>
              <button
                type="button"
                onClick={() => setPanel2Mode('auto')}
                className={`flex-1 py-1 rounded-full transition-colors cursor-pointer ${
                  panel2Mode === 'auto' ? 'bg-[#22242a] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            {/* Left Controls */}
            <div className="col-span-7 space-y-2">
              <div className="flex items-center bg-[#0b0c0e] border border-[#262830] rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setPanel2((prev) => ({ ...prev, amount: Math.max(10, prev.amount - 10) }))}
                  disabled={panel2.activeBet !== null}
                  className="w-7 h-7 rounded-lg bg-[#22242a] text-slate-200 font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                >
                  -
                </button>
                <input
                  type="number"
                  value={panel2.amount}
                  onChange={(e) => setPanel2((prev) => ({ ...prev, amount: Math.max(10, parseFloat(e.target.value) || 10) }))}
                  disabled={panel2.activeBet !== null}
                  className="w-full bg-transparent text-center font-mono font-bold text-base text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPanel2((prev) => ({ ...prev, amount: Math.min(50000, prev.amount + 10) }))}
                  disabled={panel2.activeBet !== null}
                  className="w-7 h-7 rounded-lg bg-[#22242a] text-slate-200 font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold">
                {[10, 50, 100, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPanel2((prev) => ({ ...prev, amount: v }))}
                    disabled={panel2.activeBet !== null}
                    className="py-1 bg-[#1c1d22] hover:bg-[#262830] text-slate-300 rounded-lg border border-[#2a2c34]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Giant Green / Orange Cash Out Button */}
            <div className="col-span-5 h-full">
              <button
                type="button"
                onClick={handlePanel2Action}
                disabled={gamePhase === 'CRASHED' && !panel2.activeBet}
                className={`w-full h-full min-h-[72px] rounded-2xl flex flex-col items-center justify-center font-bold tracking-tight text-white transition-all shadow-lg active:scale-98 cursor-pointer ${
                  panel2.activeBet && gamePhase === 'FLYING'
                    ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:brightness-110 shadow-orange-500/30'
                    : panel2.activeBet && gamePhase === 'WAITING'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-gradient-to-b from-[#28a745] to-[#1e7e34] hover:brightness-110 shadow-green-600/30'
                }`}
              >
                {panel2.activeBet && gamePhase === 'FLYING' ? (
                  <>
                    <span className="text-xs uppercase tracking-wider font-extrabold">CASH OUT</span>
                    <span className="text-sm font-mono font-black">{formatBDT(panel2.activeBet * multiplier)}</span>
                  </>
                ) : panel2.activeBet && gamePhase === 'WAITING' ? (
                  <>
                    <span className="text-xs uppercase tracking-wider font-extrabold">CANCEL</span>
                    <span className="text-xs font-mono">{formatBDT(panel2.activeBet)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg font-black leading-tight">BET</span>
                    <span className="text-xs font-mono font-bold text-emerald-100">{panel2.amount.toFixed(2)} BDT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {panel2Mode === 'auto' && (
            <div className="pt-2 border-t border-[#22242a] flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={panel2.isAutoBet}
                  onChange={(e) => setPanel2((prev) => ({ ...prev, isAutoBet: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                />
                <span>Auto Bet</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={panel2.autoCashoutEnabled}
                  onChange={(e) => setPanel2((prev) => ({ ...prev, autoCashoutEnabled: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                />
                <span>Auto Cashout</span>
                <input
                  type="number"
                  step="0.1"
                  min="1.01"
                  value={panel2.autoCashout}
                  onChange={(e) => setPanel2((prev) => ({ ...prev, autoCashout: parseFloat(e.target.value) || 1.5 }))}
                  className="w-14 bg-[#0b0c0e] border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-white text-xs"
                />
                <span>x</span>
              </label>
            </div>
          )}
        </div>

      </div>

      {/* 5. Bottom Live Bets Feed (Exact Spribe layout: All Bets, Previous, Top) */}
      <div className="bg-[#101114] border border-[#22242a] rounded-2xl overflow-hidden">
        {/* Bets Feed Header (Single "All Bets" view without previous/top tabs) */}
        <div className="flex items-center justify-between border-b border-[#22242a] text-xs font-bold px-3.5 py-2.5 bg-[#0b0c0e]">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#22242a] text-white text-xs font-black shadow-xs tracking-wide">
              All Bets
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              ({simulatedBets.length} Active Players)
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-[11px] font-semibold pr-2">
            <span>Bet</span>
            <span className="w-12 text-center">X</span>
            <span className="w-16 text-right">Cash Out</span>
          </div>
        </div>

        {/* Live List */}
        <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-[#1c1d22] text-xs">
          {simulatedBets.map((b, i) => (
            <div
              key={i}
              className={`px-3 py-2 flex items-center justify-between transition-colors ${
                b.cashout ? 'bg-[#152a1e]/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{b.avatar}</span>
                <span className="text-slate-300 font-medium">{b.user}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-400">৳{b.bet.toFixed(2)}</span>
                {b.multiplier ? (
                  <span className="font-mono font-bold text-emerald-400 bg-[#1e462d] px-2 py-0.5 rounded text-[11px]">
                    {b.multiplier.toFixed(2)}x
                  </span>
                ) : (
                  <span className="text-slate-600 text-[11px]">—</span>
                )}
                {b.cashout ? (
                  <span className="font-mono font-bold text-emerald-400 min-w-[70px] text-right">
                    ৳{b.cashout.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-slate-600 text-[11px] min-w-[70px] text-right">in flight</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Live Cashed Out Count & Dynamic Round Total Win */}
        {(() => {
          const totalWon = simulatedBets.reduce((sum, b) => sum + (b.cashout || 0), 0);
          const cashedCount = simulatedBets.filter((b) => b.cashout).length;
          const pct = Math.min(100, Math.round((cashedCount / Math.max(1, simulatedBets.length)) * 100));

          return (
            <div className="px-4 py-2.5 bg-[#0b0c0e] border-t border-[#22242a] flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex -space-x-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] flex items-center justify-center">👤</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[8px] flex items-center justify-center">👤</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-[8px] flex items-center justify-center">👤</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {cashedCount}/{simulatedBets.length} Cashed Out
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#28a745] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Round Total Win</div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  {formatBDT(totalWon)}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

    </div>
  );
};
