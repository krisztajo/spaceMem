"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Circle {
  id: number;
  x: number;
  y: number;
  number: number;
}

type GamePhase =
  | "memorize"
  | "play"
  | "correct"
  | "wrong"
  | "showCorrect"
  | "gameOver";

interface Confetti {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  dx: number;
  dy: number;
  size: number;
}

const CIRCLE_RADIUS = 32;
const MEMORIZE_TIME = 3000;
const SHOW_CORRECT_TIME = 2000;
const FLASH_DURATION = 400;
const AREA_PADDING = 50;

function generateCircles(
  count: number,
  areaWidth: number,
  areaHeight: number,
): Circle[] {
  const circles: Circle[] = [];
  const numbers = Array.from({ length: count }, (_, i) => i + 1);

  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  const maxAttempts = 500;
  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = AREA_PADDING + Math.random() * (areaWidth - 2 * AREA_PADDING);
      const y = AREA_PADDING + Math.random() * (areaHeight - 2 * AREA_PADDING);

      const overlaps = circles.some((c) => {
        const dx = c.x - x;
        const dy = c.y - y;
        return Math.sqrt(dx * dx + dy * dy) < CIRCLE_RADIUS * 2.5;
      });

      if (!overlaps) {
        circles.push({ id: i, x, y, number: numbers[i] });
        placed = true;
        break;
      }
    }
    if (!placed) {
      circles.push({
        id: i,
        x: AREA_PADDING + Math.random() * (areaWidth - 2 * AREA_PADDING),
        y: AREA_PADDING + Math.random() * (areaHeight - 2 * AREA_PADDING),
        number: numbers[i],
      });
    }
  }
  return circles;
}

function createConfetti(count: number): Confetti[] {
  const colors = [
    "#ff0",
    "#f0f",
    "#0ff",
    "#f00",
    "#0f0",
    "#00f",
    "#ff8800",
    "#ff0088",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + Math.random() * 40 - 20,
    y: -10,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    dx: (Math.random() - 0.5) * 4,
    dy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
  }));
}

export default function Game() {
  const [level, setLevel] = useState(1);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [phase, setPhase] = useState<GamePhase>("memorize");
  const [nextExpected, setNextExpected] = useState(1);
  const [retryUsed, setRetryUsed] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [bestLevel, setBestLevel] = useState(1);
  const [clicked, setClicked] = useState<Set<number>>(new Set());
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<Confetti[]>([]);
  const animFrameRef = useRef<number>(0);

  const circleCount = level + 2;

  const startRound = useCallback(() => {
    const area = gameAreaRef.current;
    const w = area?.clientWidth ?? 600;
    const h = area?.clientHeight ?? 500;
    const newCircles = generateCircles(circleCount, w, h);
    setCircles(newCircles);
    setPhase("memorize");
    setNextExpected(1);
    setClicked(new Set());
    setFlashColor(null);
    setConfetti([]);
  }, [circleCount]);

  // Start round when level changes
  useEffect(() => {
    startRound();
  }, [startRound]);

  // Memorize timer
  useEffect(() => {
    if (phase !== "memorize") return;
    const timer = setTimeout(() => {
      setPhase("play");
    }, MEMORIZE_TIME);
    return () => clearTimeout(timer);
  }, [phase, circles]);

  // Show correct answers after wrong click
  useEffect(() => {
    if (phase !== "showCorrect") return;
    const timer = setTimeout(() => {
      if (retryUsed) {
        setPhase("gameOver");
      } else {
        setRetryUsed(true);
        startRound();
      }
    }, SHOW_CORRECT_TIME);
    return () => clearTimeout(timer);
  }, [phase, retryUsed, startRound]);

  // Confetti animation
  useEffect(() => {
    if (confetti.length === 0) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }
    confettiRef.current = confetti;

    const animate = () => {
      confettiRef.current = confettiRef.current
        .map((c) => ({
          ...c,
          x: c.x + c.dx * 0.3,
          y: c.y + c.dy * 0.5,
          rotation: c.rotation + 3,
        }))
        .filter((c) => c.y < 120);

      setConfetti([...confettiRef.current]);

      if (confettiRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
    // Only run on initial confetti creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confetti.length > 0 ? "active" : "inactive"]);

  // Flash effect timer
  useEffect(() => {
    if (!flashColor) return;
    const timer = setTimeout(() => setFlashColor(null), FLASH_DURATION);
    return () => clearTimeout(timer);
  }, [flashColor]);

  const playErrorSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available
    }
  };

  const playSuccessSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not available
    }
  };

  const handleCircleClick = (circle: Circle) => {
    if (phase !== "play") return;

    if (circle.number === nextExpected) {
      // Correct click
      const newClicked = new Set(clicked);
      newClicked.add(circle.id);
      setClicked(newClicked);

      if (nextExpected === circleCount) {
        // Level complete!
        setFlashColor("green");
        playSuccessSound();
        setConfetti(createConfetti(80));
        setPhase("correct");
        const newLevel = level + 1;
        if (newLevel > bestLevel) setBestLevel(newLevel);
        setTimeout(() => {
          setLevel(newLevel);
          setRetryUsed(false);
        }, 1500);
      } else {
        setNextExpected(nextExpected + 1);
      }
    } else {
      // Wrong click
      setFlashColor("red");
      playErrorSound();
      setPhase("showCorrect");
    }
  };

  const handleNewGame = () => {
    setLevel(1);
    setRetryUsed(false);
    setBestLevel(1);
  };

  const showNumbers =
    phase === "memorize" || phase === "showCorrect" || phase === "correct";

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white select-none overflow-hidden">
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor:
              flashColor === "green"
                ? "rgba(34,197,94,0.35)"
                : "rgba(239,68,68,0.35)",
          }}
        />
      )}

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute z-50 pointer-events-none rounded-sm"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.size,
            height: c.size * 1.5,
            backgroundColor: c.color,
            transform: `rotate(${c.rotation}deg)`,
          }}
        />
      ))}

      {/* Header */}
      <div className="mb-4 text-center z-10">
        <h1 className="text-3xl font-bold mb-2 tracking-wide bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Eltűnő Számok
        </h1>
        <div className="flex gap-6 text-lg">
          <span>
            Szint: <span className="font-bold text-cyan-400">{level}</span>
          </span>
          <span>
            Körök:{" "}
            <span className="font-bold text-purple-400">{circleCount}</span>
          </span>
          {retryUsed && (
            <span className="text-yellow-400 text-sm self-center">
              ⚠ Utolsó esély!
            </span>
          )}
        </div>
      </div>

      {/* Phase indicator */}
      <div className="mb-3 h-8 text-center z-10">
        {phase === "memorize" && (
          <span className="text-yellow-300 animate-pulse text-lg font-semibold">
            👀 Jegyezd meg a számok helyét!
          </span>
        )}
        {phase === "play" && (
          <span className="text-cyan-300 text-lg font-semibold">
            Kattints sorrendben:{" "}
            <span className="text-white font-bold text-xl">{nextExpected}</span>
          </span>
        )}
        {phase === "showCorrect" && (
          <span className="text-red-400 text-lg font-semibold">
            ❌ Hibás! Íme a helyes sorrend...
          </span>
        )}
        {phase === "correct" && (
          <span className="text-green-400 text-lg font-semibold">
            ✅ Szint teljesítve!
          </span>
        )}
      </div>

      {/* Game area */}
      {phase !== "gameOver" ? (
        <div
          ref={gameAreaRef}
          className="relative w-[90vw] max-w-[700px] h-[60vh] max-h-[500px] bg-gray-900 rounded-2xl border-2 border-gray-700 shadow-2xl shadow-purple-900/20 overflow-hidden"
        >
          {/* Memorize progress bar */}
          {phase === "memorize" && (
            <div className="absolute top-0 left-0 h-1 bg-yellow-400 animate-shrink-bar" />
          )}

          {circles.map((circle) => {
            const isClicked = clicked.has(circle.id);
            return (
              <button
                key={circle.id}
                onClick={() => handleCircleClick(circle)}
                disabled={phase !== "play" || isClicked}
                className={`absolute flex items-center justify-center rounded-full border-2 
                  text-lg font-bold transition-all duration-300 cursor-pointer
                  ${
                    isClicked
                      ? "bg-green-500/40 border-green-400 scale-90"
                      : phase === "play"
                        ? "bg-gray-800 border-cyan-500 hover:bg-cyan-900/40 hover:scale-110"
                        : showNumbers
                          ? "bg-purple-700/60 border-purple-400"
                          : "bg-gray-800 border-gray-600"
                  }`}
                style={{
                  left: circle.x - CIRCLE_RADIUS,
                  top: circle.y - CIRCLE_RADIUS,
                  width: CIRCLE_RADIUS * 2,
                  height: CIRCLE_RADIUS * 2,
                }}
              >
                {showNumbers || isClicked ? (
                  <span
                    className={`${
                      isClicked ? "text-green-300" : "text-white"
                    } text-xl font-bold`}
                  >
                    {circle.number}
                  </span>
                ) : (
                  <span className="text-gray-600 text-xl">?</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Game Over screen */
        <div className="flex flex-col items-center justify-center gap-6 bg-gray-900 rounded-2xl border-2 border-red-700 p-12 shadow-2xl shadow-red-900/30">
          <h2 className="text-5xl font-bold text-red-400">Game Over</h2>
          <p className="text-xl text-gray-300">
            Legjobb szint:{" "}
            <span className="text-cyan-400 font-bold text-3xl">
              {bestLevel}
            </span>
          </p>
          <p className="text-gray-400">
            ({bestLevel + 2} kör sikeresen teljesítve)
          </p>
          <button
            onClick={handleNewGame}
            className="mt-4 px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full text-xl font-bold hover:from-purple-500 hover:to-cyan-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            🔄 Új játék
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-gray-600 text-sm z-10">
        Téri-vizuális memória fejlesztő játék
      </div>
    </div>
  );
}
