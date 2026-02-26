import { useState, useEffect, useRef, useCallback } from "react";

// ── Audio beep using Web Audio API ──
function useBeep(beepType, finalBeepType) {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };
  const BP = { classic:[880,"square",0.3,0.15], soft:[660,"sine",0.2,0.2], sharp:[1200,"sawtooth",0.25,0.1], low:[440,"triangle",0.35,0.2], double:[988,"square",0.25,0.08] };
  const FP = { classic:[1200,"square",0.4,0.4], gentle:[880,"sine",0.3,0.5], alarm:[1500,"sawtooth",0.35,0.3], deep:[330,"triangle",0.45,0.5], triple:[1100,"square",0.3,0.12] };
  const playTone = (ctx, f, t, g, d, delay) => { const o=ctx.createOscillator(),gn=ctx.createGain();o.connect(gn);gn.connect(ctx.destination);o.frequency.value=f;o.type=t;gn.gain.setValueAtTime(g,ctx.currentTime+(delay||0));gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(delay||0)+d);o.start(ctx.currentTime+(delay||0));o.stop(ctx.currentTime+(delay||0)+d); };
  const beep = useCallback(() => {
    try {
      const ctx = getCtx();
      const p = BP[beepType] || BP.classic;
      if (beepType === 'double') { playTone(ctx,p[0],p[1],p[2],p[3],0); playTone(ctx,p[0],p[1],p[2],p[3],0.12); }
      else { playTone(ctx,p[0],p[1],p[2],p[3]); }
    } catch (e) {}
  }, [beepType]);
  const finalBeep = useCallback(() => {
    try {
      const ctx = getCtx();
      const p = FP[finalBeepType] || FP.classic;
      if (finalBeepType === 'triple') { [0,0.15,0.3].forEach(d => playTone(ctx,p[0],p[1],p[2],p[3],d)); }
      else { playTone(ctx,p[0],p[1],p[2],p[3]); }
    } catch (e) {}
  }, [finalBeepType]);
  return { beep, finalBeep };
}

// ── Helper ──
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const REST_OPTIONS = [30, 45, 60, 90, 120, 180];

// ── Phase Editor (used for warm-up, workout exercises, cool-down) ──
function PhaseEditor({ title, exercises, setExercises, showRest, restTime, setRestTime, sets, setSets, color, collapsible, collapsed, onToggleCollapse, sectionDuration }) {
  const addExercise = () => {
    setExercises([...exercises, { name: "", duration: 60 }]);
  };
  const update = (i, field, val) => {
    const copy = [...exercises];
    copy[i] = { ...copy[i], [field]: val };
    setExercises(copy);
  };
  const remove = (i) => {
    setExercises(exercises.filter((_, idx) => idx !== i));
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    const copy = [...exercises];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setExercises(copy);
  };

  return (
    <div style={s.phaseBlock}>
      <div onClick={collapsible ? onToggleCollapse : undefined} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: collapsed ? 0 : 16, cursor: collapsible ? "pointer" : "default" }}>
        <h2 style={{ ...s.phaseTitle, color, flex: 1 }}>{title}</h2>
        {sectionDuration !== undefined && <span style={{ fontSize: 12, color: "#666", fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{sectionDuration}</span>}
        {collapsible && <span style={{ color: "#555", fontSize: 18, transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>}
      </div>

      {!collapsed && (<>
      {exercises.map((ex, i) => (
        <div key={i} style={s.exerciseRow}>
          <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
            <span style={s.exNumber}>{i + 1}</span>
            <input
              type="text"
              placeholder="Oefening naam..."
              value={ex.name}
              onChange={(e) => update(i, "name", e.target.value)}
              style={s.nameInput}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <button onClick={() => update(i, "duration", Math.max(10, ex.duration - 10))} style={s.smallBtn}>−10</button>
            <button onClick={() => update(i, "duration", Math.max(5, ex.duration - 5))} style={s.smallBtn}>−5</button>
            <span style={s.durationValue}>{formatTime(ex.duration)}</span>
            <button onClick={() => update(i, "duration", ex.duration + 5)} style={s.smallBtn}>+5</button>
            <button onClick={() => update(i, "duration", ex.duration + 10)} style={s.smallBtn}>+10</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => move(i, -1)} style={s.iconBtn} disabled={i === 0}>↑</button>
            <button onClick={() => move(i, 1)} style={s.iconBtn} disabled={i === exercises.length - 1}>↓</button>
            <button onClick={() => remove(i)} style={{ ...s.iconBtn, color: "#FF6B6B" }}>✕</button>
          </div>
        </div>
      ))}

      <button onClick={addExercise} style={{ ...s.addBtn, borderColor: color + "40", color }}>
        ＋ Oefening toevoegen
      </button>

      {showRest && (
        <div style={s.restConfig}>
          <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Aantal sets:</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, marginBottom: 16 }}>
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setSets(n)} style={{ ...s.restChip, background: sets === n ? color : "#1a1a2e", color: sets === n ? "#0d0d1a" : "#888" }}>
                {n}x
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Rusttijd tussen oefeningen:</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {REST_OPTIONS.map((t) => (
              <button key={t} onClick={() => setRestTime(t)} style={{ ...s.restChip, background: restTime === t ? color : "#1a1a2e", color: restTime === t ? "#0d0d1a" : "#888" }}>
                {t < 60 ? t + "s" : Math.floor(t / 60) + "m" + (t % 60 ? t % 60 + "s" : "")}
              </button>
            ))}
          </div>
        </div>
      )}
      </>)}

    </div>
  );
}

// ── Active Timer Screen ──
function ActiveSession({ plan, onFinish, onSaveHistory }) {
  const { beep, finalBeep } = useBeep(localStorage.getItem('beepType') || 'classic', localStorage.getItem('finalBeepType') || 'classic');
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef(null);
  const elapsedRef = useRef(null);
  const lastBeepRef = useRef(null);

  useEffect(() => {
    const q = [];
    const addPhase = (exercises, phase, restTime) => {
      const valid = exercises.filter(e => e.name.trim());
      valid.forEach((ex, i) => {
        q.push({ type: "exercise", name: ex.name, duration: ex.duration, phase });
        if (restTime && i < valid.length - 1) {
          const nextEx = valid[i + 1];
          q.push({
            type: "rest",
            name: "Rust",
            duration: restTime,
            phase,
            nextName: nextEx ? nextEx.name : "",
          });
        }
      });
    };
    addPhase(plan.warmup, "Warm-up", 0);
    const sets = plan.sets || 1;    for (let si = 0; si < sets; si++) {      if (si > 0) {        const firstEx = plan.workout.filter(e => e.name.trim())[0];        q.push({ type: "rest", name: "Set rust", duration: plan.restTime || 60, phase: "Workout", nextName: firstEx ? firstEx.name : "" });      }      addPhase(plan.workout, sets > 1 ? "Workout · Set " + (si+1) + "/" + sets : "Workout", plan.restTime);    }
    addPhase(plan.cooldown, "Cool Down", 0);
    setQueue(q);
    if (q.length > 0) {
      setRemaining(q[0].duration);
    }
  }, [plan]);

  const advanceToNext = useCallback(() => {
    clearInterval(intervalRef.current);
    setCurrentIdx(prev => {
      const nextIdx = prev + 1;
      if (nextIdx < queue.length) {
        setRemaining(queue[nextIdx].duration);
        lastBeepRef.current = null;
        return nextIdx;
      } else {
        setIsRunning(false);
        setFinished(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        return prev;
      }
    });
  }, [queue]);

  // Main timer
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = r - 1;
          if (next > 0 && next <= 3 && lastBeepRef.current !== next) {
            lastBeepRef.current = next;
            beep();
          }
          if (next === 0) {
            finalBeep();
            setTimeout(() => advanceToNext(), 500);
          }
          return Math.max(0, next);
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, remaining, currentIdx, advanceToNext, beep, finalBeep]);

  // Total elapsed counter
  useEffect(() => {
    if (isRunning) {
      elapsedRef.current = setInterval(() => setTotalElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(elapsedRef.current);
  }, [isRunning]);

  // Save history when workout finishes
  useEffect(() => {
    if (finished && onSaveHistory) {
      const exercisesTotal = queue.filter(q => q.type === "exercise").length;
      onSaveHistory(exercisesTotal, exercisesTotal, totalElapsed, plan.id, plan.name);
    }
  }, [finished]);

  const adjustTime = (delta) => {
    setRemaining((r) => Math.max(1, r + delta));
    setQueue((q) => {
      const copy = [...q];
      if (copy[currentIdx]) {
        copy[currentIdx] = { ...copy[currentIdx], duration: Math.max(1, copy[currentIdx].duration + delta) };
      }
      return copy;
    });
  };

  const skipCurrent = () => {
    clearInterval(intervalRef.current);
    advanceToNext();
  };

  const goToPrevious = () => {
    if (currentIdx <= 0) return;
    clearInterval(intervalRef.current);
    const prevIdx = currentIdx - 1;
    setCurrentIdx(prevIdx);
    setRemaining(queue[prevIdx].duration);
    lastBeepRef.current = null;
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    clearInterval(elapsedRef.current);
    setIsRunning(false);
    onFinish();
  };

  const handleFinish = () => {
    clearInterval(intervalRef.current);
    clearInterval(elapsedRef.current);
    setIsRunning(false);
    const exercisesCompleted = queue.slice(0, currentIdx + 1).filter(q => q.type === "exercise").length;
    const exercisesTotal = queue.filter(q => q.type === "exercise").length;
    if (onSaveHistory) onSaveHistory(exercisesCompleted, exercisesTotal, totalElapsed, plan.id, plan.name);
    onFinish();
  };

  const current = queue[currentIdx];
  if (!current && !finished) {
    return (
      <div style={s.container}>
        <style>{globalCSS}</style>
        <div style={{ ...s.centerScreen, animation: "fadeIn 0.3s ease" }}>
          <p style={{ color: "#888", fontSize: 16 }}>Geen oefeningen gevonden. Voeg eerst oefeningen toe.</p>
          <button onClick={onFinish} style={{ ...s.primaryBtn, marginTop: 24 }}>Terug</button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={s.container}>
        <style>{globalCSS}</style>
        <div style={{ ...s.centerScreen, animation: "fadeIn 0.4s ease" }}>
          <span style={{ fontSize: 64, marginBottom: 16 }}>🎉</span>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, color: "#4ECDC4", marginBottom: 8 }}>Klaar!</h1>
          <p style={{ color: "#888", fontSize: 15, marginBottom: 4 }}>Totale tijd</p>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, color: "#f0f0f0", marginBottom: 32 }}>
            {formatTime(totalElapsed)}
          </p>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 32 }}>
            {queue.filter((q) => q.type === "exercise").length} oefeningen voltooid
          </p>
          <button onClick={onFinish} style={s.primaryBtn}>Terug naar overzicht</button>
        </div>
      </div>
    );
  }

  const progress = current.duration > 0 ? ((current.duration - remaining) / current.duration) * 100 : 0;
  const isRest = current.type === "rest";
  const phaseColor = current.phase === "Warm-up" ? "#F7DC6F" : current.phase === "Workout" ? "#FF6B6B" : "#4ECDC4";
  const exercisesInQueue = queue.filter((q) => q.type === "exercise");
  const currentExIdx = queue.slice(0, currentIdx + 1).filter((q) => q.type === "exercise").length;
  const totalExercises = exercisesInQueue.length;

  return (
    <div style={{ ...s.container, background: isRest ? (_currentTheme === 'light' ? '#eeeef2' : '#0a0a18') : (_currentTheme === 'light' ? '#f5f5f7' : '#0d0d1a') }}>
      <style>{globalCSS}</style>

      {/* Top bar */}
      <div style={s.activeTopBar}>
        <button onClick={handleStop} style={s.stopBtn}>
          ✕ Stop
        </button>
        <div style={s.phasePill}>
          <span style={{ color: phaseColor, fontWeight: 700 }}>{current.phase}</span>
          <span style={{ color: "#555", fontSize: 11, marginLeft: 6 }}>{formatTime(totalElapsed)}</span>
        </div>
        <button onClick={handleFinish} style={{ ...s.stopBtn, color: "#4ECDC4", borderColor: "#4ECDC440", background: "none" }}>
          ✓ Klaar
        </button>
      </div>

      {/* Progress bar */}
      <div style={s.dotsRow}>
        {queue.map((item, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < currentIdx ? phaseColor : i === currentIdx ? phaseColor + "80" : (_currentTheme === "light" ? "#d0d0d8" : "#1a1a2e"),
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div style={s.activeContent}>
        {isRest ? (
          <>
            <p style={{ color: "#555", fontSize: 13, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
              Rust
            </p>
            <div style={s.bigTimerWrap}>
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="98" fill="none" stroke={_currentTheme === "light" ? "#d0d0d8" : "#1a1a2e"} strokeWidth="6" />
                <circle
                  cx="110" cy="110" r="98"
                  fill="none"
                  stroke={remaining <= 3 ? "#FF6B6B" : "#4ECDC4"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 98}`}
                  strokeDashoffset={`${2 * Math.PI * 98 * (1 - progress / 100)}`}
                  transform="rotate(-90 110 110)"
                  style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s" }}
                />
              </svg>
              <div style={s.timerCenter}>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 52,
                  fontWeight: 700,
                  color: remaining <= 3 ? "#FF6B6B" : (_currentTheme === "light" ? "#1a1a2e" : "#f0f0f0"),
                  animation: remaining <= 3 && remaining > 0 ? "pulse 0.5s ease infinite" : "none",
                }}>
                  {formatTime(remaining)}
                </span>
              </div>
            </div>
            <h1 style={{ ...s.activeExName, marginTop: 24, marginBottom: 0 }}>{current.nextName || "—"}</h1>
          </>
        ) : (
          <>
            <p style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
              Oefening {currentExIdx} / {totalExercises}
            </p>
            <h1 style={s.activeExName}>{current.name}</h1>
            <div style={s.bigTimerWrap}>
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="98" fill="none" stroke={_currentTheme === "light" ? "#d0d0d8" : "#1a1a2e"} strokeWidth="6" />
                <circle
                  cx="110" cy="110" r="98"
                  fill="none"
                  stroke={remaining <= 3 ? "#FF6B6B" : phaseColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 98}`}
                  strokeDashoffset={`${2 * Math.PI * 98 * (1 - progress / 100)}`}
                  transform="rotate(-90 110 110)"
                  style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s" }}
                />
              </svg>
              <div style={s.timerCenter}>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 52,
                  fontWeight: 700,
                  color: remaining <= 3 ? "#FF6B6B" : (_currentTheme === "light" ? "#1a1a2e" : "#f0f0f0"),
                  animation: remaining <= 3 && remaining > 0 ? "pulse 0.5s ease infinite" : "none",
                }}>
                  {formatTime(remaining)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Time adjust buttons */}
        <div style={s.adjustRow}>
          <button onClick={() => adjustTime(-10)} style={s.adjustBtn}>−10s</button>
          <button onClick={() => adjustTime(-5)} style={s.adjustBtn}>−5s</button>
          {!isRunning ? (
            <button onClick={() => setIsRunning(true)} style={s.playBtn}>▶</button>
          ) : (
            <button onClick={() => { setIsRunning(false); clearInterval(intervalRef.current); }} style={s.pauseBtn}>⏸</button>
          )}
          <button onClick={() => adjustTime(5)} style={s.adjustBtn}>+5s</button>
          <button onClick={() => adjustTime(10)} style={s.adjustBtn}>+10s</button>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={goToPrevious} style={{ ...s.skipBtn, opacity: currentIdx === 0 ? 0.3 : 1 }} disabled={currentIdx === 0}>
            Vorige
          </button>
          <button onClick={skipCurrent} style={s.skipBtn}>
            Volgende
          </button>
        </div>
        {current.phase === "Warm-up" && (
          <span
            onClick={() => {
              const firstNonWarmup = queue.findIndex(item => item.phase !== "Warm-up");
              if (firstNonWarmup !== -1) { setCurrentIdx(firstNonWarmup); setRemaining(queue[firstNonWarmup].duration); }
            }}
            style={{ display: "block", textAlign: "center", marginTop: 16, color: "#555", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}
          >
            skip warmup
          </span>
        )}
        {/* Next up */}
        {(() => {
          const upcoming = [queue[currentIdx + 1], queue[currentIdx + 2], queue[currentIdx + 3]].filter(Boolean);
          if (upcoming.length === 0) return null;
          return (
            <div style={{ marginTop: 28, width: "100%" }}>
              <p style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Next up</p>
              {upcoming.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, opacity: i === 0 ? 0.85 : 0.5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.type === "rest" ? "#6ec6ff" : "#a78bfa", flexShrink: 0 }} />
                  <span style={{ color: "#999", fontSize: 15, fontWeight: i === 0 ? 600 : 400 }}>{item.name}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type="number"] { -moz-appearance: textfield; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  ::-webkit-scrollbar { width: 0; }
`;

// ── Login Screen ──
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { supabase } = await import('./supabase.js');
      let result;
      if (isRegister) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      if (result.data?.user) {
        onLogin(result.data.user);
      } else if (isRegister) {
        setError("Account aangemaakt! Probeer nu in te loggen.");
        setIsRegister(false);
      }
    } catch (err) {
      setError(err.message || "Er is een fout opgetreden");
    }
    setLoading(false);
  };

  const th = localStorage.getItem('liftTheme') || 'dark';
  const isDark = th !== 'light';
  return (
    <div style={{ ..._darkS.container, background: isDark ? "#0d0d1a" : "#f5f5f7" }}>
      <style>{globalCSS}</style>
      <div style={_darkS.centerScreen}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 42, fontWeight: 700, color: isDark ? "#f0f0f0" : "#1a1a2e", letterSpacing: -1, marginBottom: 4 }}>
          LIFT<span style={{ color: "#FF6B6B" }}>.</span>
        </h1>
        <p style={{ color: "#555", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 48 }}>WORKOUT TRACKER</p>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "14px 16px", background: isDark ? "#13132a" : "#ffffff", border: isDark ? "1px solid #1a1a35" : "1px solid #d0d0d8", borderRadius: 12, color: isDark ? "#f0f0f0" : "#1a1a2e", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "14px 16px", background: isDark ? "#13132a" : "#ffffff", border: isDark ? "1px solid #1a1a35" : "1px solid #d0d0d8", borderRadius: 12, color: isDark ? "#f0f0f0" : "#1a1a2e", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
            />
          </div>
          {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #4ECDC4, #3ab8b0)", color: "#0d0d1a", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}
          >
            {loading ? "..." : (isRegister ? "Registreren" : "Inloggen")}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            {isRegister ? "Al een account? Inloggen" : "Nieuw account aanmaken"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main App ──
export default function WorkoutApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [workouts, setWorkouts] = useState([]);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warmupCollapsed, setWarmupCollapsed] = useState(true);
  const [cooldownCollapsed, setCooldownCollapsed] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('liftTheme') || 'dark');
  const [beepType, setBeepType] = useState(() => localStorage.getItem('beepType') || 'classic');
  const [finalBeepType, setFinalBeepType] = useState(() => localStorage.getItem('finalBeepType') || 'classic');

  // ── Supabase helpers ──
  const getSupabase = () => {
    try {
      // Dynamic import won't work in artifact preview, so we check if it's available
      if (window.__supabase) return window.__supabase;
      return null;
    } catch { return null; }
  };

  // Initialize auth and load data
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { supabase } = await import('./supabase.js');
        window.__supabase = supabase;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          window.__userId = session.user.id;
        }
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            setUser(session.user);
            window.__userId = session.user.id;
          } else {
            setUser(null);
            window.__userId = null;
          }
        });
      } catch (err) {
        console.log('Auth init failed:', err.message);
      }
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadSettings();
      loadHistory();
    }
  }, [user ? user.id : null]);

  const loadWorkouts = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { supabase } = await import('./supabase.js');
      window.__supabase = supabase;
      const uid = window.__userId;
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = data.map(row => ({
        id: row.id,
        name: row.name,
        warmup: row.warmup || [],
        workout: row.workout || [],
        cooldown: row.cooldown || [],
        restTime: row.rest_time || 60, sets: row.sets || parseInt(localStorage.getItem('sets_' + row.id)) || 1,
      }));
      setWorkouts(mapped);
    } catch (err) {
      console.log('Supabase not available, using local state:', err.message);
      setDbError('Kon geen verbinding maken met de database. Workouts worden lokaal bewaard.');
    }
    setLoading(false);
  };

    const loadSettings = async () => {
          try {
                  const { supabase } = await import('./supabase.js');
                  const uid = window.__userId;
      let { data, error } = await supabase.from('settings').select('*').eq('auth_user_id', uid).single();
      if (error && error.code === 'PGRST116') {
        await supabase.from('settings').insert({ auth_user_id: uid, theme: 'dark', beep_type: 'classic', final_beep_type: 'classic' });
        const result = await supabase.from('settings').select('*').eq('auth_user_id', uid).single();
        data = result.data;
        error = result.error;
      }
                  if (error) throw error;
                  if (data) {
                            setTheme(data.theme || 'dark');
                            setBeepType(data.beep_type || 'classic');
                            setFinalBeepType(data.final_beep_type || 'classic');
                            localStorage.setItem('liftTheme', data.theme || 'dark');
                            localStorage.setItem('beepType', data.beep_type || 'classic');
                            localStorage.setItem('finalBeepType', data.final_beep_type || 'classic');
                  }
          } catch (err) {
                  console.log('Settings load failed, using localStorage:', err.message);
          }
    };

    const saveSettings = async (updates) => {
          try {
                  const { supabase } = await import('./supabase.js');
                  const uid = window.__userId;
      await supabase.from('settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('auth_user_id', uid);
          } catch (err) {
                  console.log('Settings save failed:', err.message);
          }
    };

  const loadHistory = async () => {
    try {
      const { supabase } = await import('./supabase.js');
      const uid = window.__userId;
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', uid)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.log('History load failed:', err.message);
    }
  };

  const saveHistory = async (exercisesCompleted, exercisesTotal, durationSeconds, workoutId, workoutName) => {
    try {
      const { supabase } = await import('./supabase.js');
      const uid = window.__userId;
      await supabase.from('workout_history').insert({
        workout_id: workoutId || null,
        workout_name: workoutName || 'Onbekend',
        exercises_completed: exercisesCompleted,
        exercises_total: exercisesTotal,
        duration_seconds: durationSeconds,
        user_id: uid,
      });
      await loadHistory();
    } catch (err) {
      console.log('History save failed:', err.message);
    }
  };

  const saveToSupabase = async (workout, isUpdate = false) => {
    setSaving(true);
    try {
      const { supabase } = await import('./supabase.js');
      const row = {
        name: workout.name,
        warmup: workout.warmup,
        workout: workout.workout,
        cooldown: workout.cooldown,
        rest_time: workout.restTime, sets: workout.sets || 1,
        updated_at: new Date().toISOString(),
      };
      if (isUpdate && workout.id) {
        const { error } = await supabase
          .from('workouts')
          .update(row)
          .eq('id', workout.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workouts')
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        workout.id = data.id;
      }
    } catch (err) {
      console.log('Save failed, keeping local:', err.message);
    }
    setSaving(false);
    return workout;
  };

  const deleteFromSupabase = async (id) => {
    try {
      const { supabase } = await import('./supabase.js');
      await supabase.from('workouts').delete().eq('id', id);
    } catch (err) {
      console.log('Delete failed:', err.message);
    }
  };

  const createNewWorkout = () => {
    setEditingWorkout({
      name: "",
      warmup: [{ name: "", duration: 60 }],
      workout: [{ name: "", duration: 45 }], sets: 1,
      cooldown: [{ name: "", duration: 60 }],
      restTime: 60,
    });
    setEditingIdx(null);
    setScreen("edit");
  };

  const editWorkout = (idx) => {
    const w = workouts[idx];
    setEditingWorkout({
      ...w,
      warmup: w.warmup.map(e => ({ ...e })),
      workout: w.workout.map(e => ({ ...e })),
      cooldown: w.cooldown.map(e => ({ ...e })), sets: w.sets || 1,
    });
    setEditingIdx(idx);
    setScreen("edit");
  };

  const saveWorkout = async () => {
    const isUpdate = editingIdx !== null;
    const w = {
      ...editingWorkout,
      name: editingWorkout.name.trim() || `Workout ${workouts.length + 1}`,
      id: editingWorkout.id || undefined,
    };
    const saved = await saveToSupabase(w, isUpdate); if (saved.id) localStorage.setItem('sets_' + saved.id, String(saved.sets || 1));
    if (isUpdate) {
      setWorkouts((wk) => wk.map((item, i) => (i === editingIdx ? saved : item)));
    } else {
      setWorkouts((wk) => [saved, ...wk]);
    }
    return saved;
  };

  const handleSave = async () => {
    await saveWorkout();
    setScreen("home");
    setEditingWorkout(null);
  };

  const handleSaveAndStart = async () => {
    const w = await saveWorkout();
    setActiveWorkout(w);
    setScreen("active");
    setEditingWorkout(null);
  };

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  const [history, setHistory] = useState([]);  const [lastCompletedId, setLastCompletedId] = useState(() => localStorage.getItem('lastCompletedId'));
  const deleteWorkout = (idx) => {
    if (confirmDeleteIdx === idx) {
      const w = workouts[idx];
      deleteFromSupabase(w.id);
      setWorkouts((wk) => wk.filter((_, i) => i !== idx));
      setConfirmDeleteIdx(null);
    } else {
      setConfirmDeleteIdx(idx);
      setTimeout(() => setConfirmDeleteIdx(null), 3000);
    }
  };

  const startWorkout = (idx) => {
    setActiveWorkout({ ...workouts[idx] });
    setScreen("active");
  };

  const totalDuration = (w) => {
    const d = (arr) => arr.reduce((a, e) => a + (e.name.trim() ? e.duration : 0), 0);
    const numSets = w.sets || 1; const exCount = w.workout.filter((e) => e.name.trim()).length;
    const restTotal = exCount > 1 ? (exCount - 1) * w.restTime : 0;
    const restWithinSet = exCount > 1 ? (exCount - 1) * w.restTime : 0; const workoutTotal = (d(w.workout) + restWithinSet) * numSets + (numSets > 1 ? (numSets - 1) * w.restTime : 0); return d(w.warmup) + workoutTotal + d(w.cooldown);
  };

  const handleLogout = async () => {
    try {
      const { supabase } = await import('./supabase.js');
      await supabase.auth.signOut();
      setUser(null);
      setWorkouts([]);
      setHistory([]);
      setScreen("home");
    } catch (err) {
      console.log('Logout failed:', err.message);
    }
  };

  if (authLoading) {
    return (
      <div style={_darkS.container}>
        <style>{globalCSS}</style>
        <div style={_darkS.centerScreen}>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 42, fontWeight: 700, color: "#f0f0f0", letterSpacing: -1 }}>LIFT<span style={{ color: "#FF6B6B" }}>.</span></h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={(u) => { setUser(u); window.__userId = u.id; }} />;
  }

  if (screen === "active" && activeWorkout) {
    return (
      <ActiveSession
        plan={activeWorkout}
        onFinish={() => { setScreen("home"); setActiveWorkout(null); }}
        onSaveHistory={saveHistory}
      />
    );
  }

  return (
    <div style={s.container}>
      <style>{globalCSS}</style>

      {/* ── HOME ── */}
      {screen === "home" && (
        <div style={{ animation: "fadeIn 0.3s ease", minHeight: "100vh" }}>
          <div style={{ ...s.header, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h1 style={s.logo}>LIFT<span style={{ color: "#FF6B6B" }}>.</span></h1>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {saving && <span style={{ fontSize: 12, color: "#4ECDC4", fontWeight: 600 }}>Opslaan...</span>}
                                            <button onClick={() => setScreen("history")} style={{ ...s.newWorkoutBtn, fontSize: 18, letterSpacing: 1 }}>≡</button>
                                            <button onClick={() => setScreen("settings")} style={s.newWorkoutBtn}>⚙</button>
              <button onClick={createNewWorkout} style={s.newWorkoutBtn}>+</button>
                                    </div>
                    </div>
          
          {dbError && (
            <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "#FF6B6B15", border: "1px solid #FF6B6B30", borderRadius: 10, fontSize: 12, color: "#FF6B6B" }}>
              {dbError}
            </div>
          )}


          <div style={{ padding: "0 20px" }}>
            <h2 style={s.sectionTitle}>Mijn workouts</h2>
            {loading ? (
              <div style={s.emptyState}>
                <p style={{ color: "#555", fontSize: 14 }}>Workouts laden...</p>
              </div>
            ) : workouts.length === 0 ? (
              <div style={s.emptyState}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>🏋️</span>
                <p style={{ color: "#555", fontSize: 14 }}>Nog geen workouts. Maak je eerste aan!</p>
              </div>
            ) : (
              workouts.map((w, i) => (
                <div key={w.id} style={{ ...s.workoutCard, animation: "slideUp 0.3s ease forwards", animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={s.workoutCardName}>{w.name}</h3>
                      <p style={s.workoutCardMeta}>
                        ≈ {formatTime(totalDuration(w))} totaal
                      </p>
                      {String(w.id) === String(lastCompletedId) && (
                                        <span style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>last completed</span>
                                        )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 14 }}>
                    {w.warmup.filter((e) => e.name.trim()).length > 0 && (
                      <span style={{ ...s.phaseChip, background: "#F7DC6F18", color: "#F7DC6F" }}>
                        Warm-up · {w.warmup.filter((e) => e.name.trim()).length}
                      </span>
                    )}
                    {w.workout.filter((e) => e.name.trim()).length > 0 && (
                      <span style={{ ...s.phaseChip, background: "#FF6B6B18", color: "#FF6B6B" }}>
                        Workout · {w.workout.filter((e) => e.name.trim()).length}{(w.sets || 1) > 1 ? ` · ${w.sets}x` : ''}
                      </span>
                    )}
                    {w.cooldown.filter((e) => e.name.trim()).length > 0 && (
                      <span style={{ ...s.phaseChip, background: "#4ECDC418", color: "#4ECDC4" }}>
                        Cool Down · {w.cooldown.filter((e) => e.name.trim()).length}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startWorkout(i)} style={s.goBtn}>
                      Start
                    </button>
                    <button onClick={() => editWorkout(i)} style={{ ...s.editBtn, flex: "unset", padding: "10px 14px" }}>
                      ✎
                    </button>
                    <button onClick={() => deleteWorkout(i)} style={{ ...s.deleteBtn, color: confirmDeleteIdx === i ? "#FF6B6B" : "#FF6B6B50", borderColor: confirmDeleteIdx === i ? "#FF6B6B" : "#222240" }}>
                      {confirmDeleteIdx === i ? "Zeker?" : "✕"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ height: 40 }} />
        </div>
      )}

      {/* ── EDIT WORKOUT ── */}
      {screen === "edit" && editingWorkout && (
        <div style={{ animation: "fadeIn 0.3s ease", minHeight: "100vh" }}>
          <div style={s.editTopBar}>
            <button onClick={() => { setScreen("home"); setEditingWorkout(null); }} style={s.cancelBtn}>
              ← Terug
            </button>
            <button onClick={handleSave} style={s.saveBtn}>
              Opslaan ✓
            </button>
          </div>

          <div style={{ padding: "0 20px" }}>
            <input
              type="text"
              placeholder="Workout naam..."
              value={editingWorkout.name}
              onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
              style={s.workoutNameInput}
            />

            <PhaseEditor
              title="Warm-up"
              color="#F7DC6F"
              exercises={editingWorkout.warmup}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, warmup: ex })}
              showRest={false}
              collapsible={true}
              collapsed={warmupCollapsed}
              onToggleCollapse={() => setWarmupCollapsed(!warmupCollapsed)}
            sectionDuration={formatTime(editingWorkout.warmup.reduce((a,e) => a + (e.name.trim() ? e.duration : 0), 0))}
            />

            <PhaseEditor
              title="Workout"
              color="#FF6B6B"
              exercises={editingWorkout.workout}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, workout: ex })}
              showRest={true}
              restTime={editingWorkout.restTime}
              setRestTime={(t) => setEditingWorkout({ ...editingWorkout, restTime: t })}            sets={editingWorkout.sets || 1}            setSets={(n) => setEditingWorkout({ ...editingWorkout, sets: n })}
            sectionDuration={formatTime((() => { const d = editingWorkout.workout.reduce((a,e) => a + (e.name.trim() ? e.duration : 0), 0); const ns = editingWorkout.sets || 1; const ec = editingWorkout.workout.filter(e => e.name.trim()).length; const r = ec > 1 ? (ec-1)*editingWorkout.restTime : 0; return (d+r)*ns + (ns>1?(ns-1)*editingWorkout.restTime:0); })())}
            />

            <PhaseEditor
              title="Cool Down"
              color="#4ECDC4"
              exercises={editingWorkout.cooldown}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, cooldown: ex })}
              showRest={false}
              collapsible={true}
              collapsed={cooldownCollapsed}
              onToggleCollapse={() => setCooldownCollapsed(!cooldownCollapsed)}
            sectionDuration={formatTime(editingWorkout.cooldown.reduce((a,e) => a + (e.name.trim() ? e.duration : 0), 0))}
            />

            {/* Summary */}
            <div style={s.summaryCard}>
              <h3 style={{ fontSize: 14, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>Samenvatting</h3>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div style={{ textAlign: "center" }}>
                  <span style={s.summaryVal}>
                    {editingWorkout.warmup.filter((e) => e.name.trim()).length +
                      editingWorkout.workout.filter((e) => e.name.trim()).length +
                      editingWorkout.cooldown.filter((e) => e.name.trim()).length}
                  </span>
                  <span style={s.summaryLabel}>Oefeningen</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={s.summaryVal}>{formatTime(totalDuration(editingWorkout))}</span>
                  <span style={s.summaryLabel}>Geschatte duur</span>
                </div>
              </div>
            </div>

            {(editingWorkout.warmup.some((e) => e.name.trim()) ||
              editingWorkout.workout.some((e) => e.name.trim()) ||
              editingWorkout.cooldown.some((e) => e.name.trim())) && (
              <button
                onClick={handleSaveAndStart}
                style={{ ...s.startBtn, marginLeft: 0, marginBottom: 32, width: "100%", boxShadow: "0 8px 32px #4ECDC430", background: "linear-gradient(135deg, #4ECDC4, #3ab8b0)" }}
              >
                ▶ Opslaan & Starten
              </button>
            )}

            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

    {/* ── HISTORY ── */}
    {screen === "history" && (
      <div style={{ animation: "fadeIn 0.3s ease", minHeight: "100vh" }}>
        <div style={s.editTopBar}>
          <button onClick={() => setScreen("home")} style={s.cancelBtn}>← Terug</button>
          <h2 style={{ color: _currentTheme === 'light' ? "#1a1a2e" : "#f0f0f0", fontSize: 16, fontWeight: 700 }}>Geschiedenis</h2>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: "0 20px" }}>
          {history.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 48, marginBottom: 12 }}>📝</span>
              <p style={{ color: "#555", fontSize: 14 }}>Nog geen workouts voltooid.</p>
            </div>
          ) : (
            history.map((item, i) => {
              const pct = item.exercises_total > 0
                ? Math.round((item.exercises_completed / item.exercises_total) * 100)
                : 100;
              const date = new Date(item.completed_at);
              const dateStr = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={item.id} style={{ ...s.workoutCard, animation: "slideUp 0.3s ease forwards", animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={s.workoutCardName}>{item.workout_name}</h3>
                      <p style={s.workoutCardMeta}>{dateStr} · {timeStr}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: pct === 100 ? "#4ECDC4" : "#F7DC6F" }}>
                        {pct}%
                      </span>
                      <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>voltooid</p>
                    </div>
                  </div>
                  {item.duration_seconds > 0 && (
                    <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                      ⏱ {formatTime(item.duration_seconds)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
    )}

    {/* ── SETTINGS ── */}
    {screen === "settings" && (
      <div style={{ animation: "fadeIn 0.3s ease", minHeight: "100vh" }}>
        <div style={s.editTopBar}>
          <button onClick={() => setScreen("home")} style={s.cancelBtn}>← Terug</button>
          <h2 style={{ color: _currentTheme === 'light' ? "#1a1a2e" : "#f0f0f0", fontSize: 16, fontWeight: 700 }}>Instellingen</h2>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: "0 20px" }}>
          <h3 style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 12, marginTop: 8 }}>Uiterlijk</h3>
          <div style={s.phaseBlock}>
            <div style={{ display: "flex", gap: 8 }}>
              {[{id:"dark",label:"Dark"},{id:"light",label:"Light"}].map(opt => (
                <button key={opt.id} onClick={() => { setTheme(opt.id); localStorage.setItem('liftTheme', opt.id); saveSettings({ theme: opt.id }); window.location.reload(); }} style={{ flex: 1, padding: "14px", background: theme === opt.id ? (opt.id==='dark'?"#1a1a2e":"#ffffff") : (theme==='light'?"#f5f5f7":"#0d0d1a"), border: theme === opt.id ? "2px solid #4ECDC4" : (theme==='light'?"1px solid #d0d0d8":"1px solid #1a1a30"), borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                  <span style={{ color: theme === opt.id ? "#4ECDC4" : "#888", fontSize: 14, fontWeight: 700 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <h3 style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 12, marginTop: 24 }}>Geluid</h3>
          <div style={s.phaseBlock}>
            <p style={{ fontSize: 13, color: "#888", fontWeight: 600, marginBottom: 12 }}>Countdown (laatste 3s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[{id:"classic",label:"Classic",desc:"Korte square beep"},{id:"soft",label:"Soft",desc:"Zachte sine toon"},{id:"sharp",label:"Sharp",desc:"Scherpe sawtooth"},{id:"low",label:"Low",desc:"Lage triangle toon"},{id:"double",label:"Double",desc:"Dubbele snelle beep"}].map(opt => (
                <button key={opt.id} onClick={() => { setBeepType(opt.id); localStorage.setItem('beepType',opt.id); saveSettings({ beep_type: opt.id }); try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const bp={classic:[880,"square",0.3,0.15],soft:[660,"sine",0.2,0.2],sharp:[1200,"sawtooth",0.25,0.1],low:[440,"triangle",0.35,0.2],double:[988,"square",0.25,0.08]};const p=bp[opt.id];const t=(f,tp,g,d,dl)=>{const o=ctx.createOscillator(),gn=ctx.createGain();o.connect(gn);gn.connect(ctx.destination);o.frequency.value=f;o.type=tp;gn.gain.setValueAtTime(g,ctx.currentTime+(dl||0));gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(dl||0)+d);o.start(ctx.currentTime+(dl||0));o.stop(ctx.currentTime+(dl||0)+d);};if(opt.id==='double'){t(p[0],p[1],p[2],p[3],0);t(p[0],p[1],p[2],p[3],0.12);}else{t(p[0],p[1],p[2],p[3]);}}catch(e){} }} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:beepType===opt.id?(_currentTheme==='light'?"#e8f8f7":"#1a1a3a"):"transparent",border:beepType===opt.id?"1px solid #4ECDC4":"1px solid transparent",borderRadius:10,cursor:"pointer",textAlign:"left" }}>
                  <span style={{ width:18,height:18,borderRadius:"50%",border:beepType===opt.id?"2px solid #4ECDC4":"2px solid #444",background:beepType===opt.id?"#4ECDC4":"none",flexShrink:0 }} />
                  <div><span style={{ color:_currentTheme==='light'?"#1a1a2e":"#f0f0f0",fontSize:13,fontWeight:600 }}>{opt.label}</span><span style={{ color:"#888",fontSize:11,marginLeft:8 }}>{opt.desc}</span></div>
                </button>
              ))}
            </div>
            <div style={{ borderTop:_currentTheme==='light'?"1px solid #e0e0e5":"1px solid #1a1a35",marginTop:16,paddingTop:16 }}>
              <p style={{ fontSize:13,color:"#888",fontWeight:600,marginBottom:12 }}>Finale</p>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[{id:"classic",label:"Classic",desc:"Luide square toon"},{id:"gentle",label:"Gentle",desc:"Zachte langere toon"},{id:"alarm",label:"Alarm",desc:"Hoge sawtooth alert"},{id:"deep",label:"Deep",desc:"Diepe bass toon"},{id:"triple",label:"Triple",desc:"Drie snelle beeps"}].map(opt => (
                  <button key={opt.id} onClick={() => { setFinalBeepType(opt.id); localStorage.setItem('finalBeepType',opt.id); saveSettings({ final_beep_type: opt.id }); try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const fp={classic:[1200,"square",0.4,0.4],gentle:[880,"sine",0.3,0.5],alarm:[1500,"sawtooth",0.35,0.3],deep:[330,"triangle",0.45,0.5],triple:[1100,"square",0.3,0.12]};const p=fp[opt.id];const t=(f,tp,g,d,dl)=>{const o=ctx.createOscillator(),gn=ctx.createGain();o.connect(gn);gn.connect(ctx.destination);o.frequency.value=f;o.type=tp;gn.gain.setValueAtTime(g,ctx.currentTime+(dl||0));gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(dl||0)+d);o.start(ctx.currentTime+(dl||0));o.stop(ctx.currentTime+(dl||0)+d);};if(opt.id==='triple'){[0,0.15,0.3].forEach(d=>t(p[0],p[1],p[2],p[3],d));}else{t(p[0],p[1],p[2],p[3]);}}catch(e){} }} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:finalBeepType===opt.id?(_currentTheme==='light'?"#fff0f0":"#1a1a3a"):"transparent",border:finalBeepType===opt.id?"1px solid #FF6B6B":"1px solid transparent",borderRadius:10,cursor:"pointer",textAlign:"left" }}>
                    <span style={{ width:18,height:18,borderRadius:"50%",border:finalBeepType===opt.id?"2px solid #FF6B6B":"2px solid #444",background:finalBeepType===opt.id?"#FF6B6B":"none",flexShrink:0 }} />
                    <div><span style={{ color:_currentTheme==='light'?"#1a1a2e":"#f0f0f0",fontSize:13,fontWeight:600 }}>{opt.label}</span><span style={{ color:"#888",fontSize:11,marginLeft:8 }}>{opt.desc}</span></div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ paddingBottom: 8 }}>
            <button
              onClick={handleLogout}
              style={{ width: "100%", padding: "14px", background: "none", border: "1px solid #FF6B6B40", borderRadius: 12, color: "#FF6B6B", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              Uitloggen
            </button>
          </div>
          <div style={{ height: 40 }} />
        </div>
      </div>
    )}
    </div>
  );
}

// ── Styles ──
const lightOverrides = {
  container: { background: "#f5f5f7", color: "#1a1a2e" },
  logo: { color: "#1a1a2e" },
  workoutCard: { background: "#ffffff", border: "1px solid #e0e0e5" },
  workoutCardName: { color: "#1a1a2e" },
  workoutCardMeta: { color: "#888" },
  phaseBlock: { background: "#ffffff", border: "1px solid #e0e0e5" },
  exerciseRow: { background: "#f5f5f7", border: "1px solid #e8e8ec" },
  editTopBar: { background: "#f5f5f7" },
  nameInput: { color: "#1a1a2e", borderBottom: "1px solid #d0d0d8" },
  workoutNameInput: { color: "#1a1a2e" },
  smallBtn: { background: "#e8e8ec", border: "1px solid #d0d0d8", color: "#555" },
  iconBtn: { background: "#e8e8ec", border: "1px solid #d0d0d8", color: "#555" },
  restConfig: { borderTop: "1px solid #e0e0e5" },
  restChip: { border: "1px solid #d0d0d8" },
  summaryCard: { background: "#ffffff", border: "1px solid #e0e0e5" },
  editBtn: { background: "#e8e8ec", border: "1px solid #d0d0d8", color: "#555" },
  deleteBtn: { background: "#e8e8ec", border: "1px solid #d0d0d8" },
  exNumber: { background: "#e8e8ec", color: "#888" },
  durationValue: { color: "#1a1a2e" },
  cancelBtn: { color: "#555" },
  adjustBtn: { background: "#e8e8ec", border: "1px solid #d0d0d8", color: "#555" },
  skipBtn: { border: "1px solid #d0d0d8", color: "#888" },
  newWorkoutBtn: { color: "#555" },
  phasePill: { background: "#ffffff", border: "1px solid #e0e0e5" },
  stopBtn: { background: "#e8e8ec", border: "1px solid #FF6B6B40" },
  activeExName: { color: "#1a1a2e" },
};
const _darkS = {
  container: {
    width: "100%", maxWidth: 393,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#0d0d1a",
    fontFamily: "'DM Sans', sans-serif",
    color: "#f0f0f0",
    position: "relative",
  },
  header: {
    padding: "48px 24px 20px",
  },
  logo: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 36,
    fontWeight: 700,
    color: "#f0f0f0",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#555",
    fontSize: 13,
    marginTop: 2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  startBtn: {
    margin: "0 20px 28px",
    padding: "18px 24px",
    background: "linear-gradient(135deg, #FF6B6B, #ee5a5a)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.5,
    boxShadow: "0 8px 32px #FF6B6B30",
    width: "calc(100% - 40px)",
  },
  sectionTitle: {
    fontSize: 13,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: 600,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 20px",
    textAlign: "center",
  },
  workoutCard: {
    background: "#13132a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: "1px solid #1a1a35",
  },
  workoutCardName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f0f0f0",
  },
  workoutCardMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontFamily: "'Space Mono', monospace",
  },
  phaseChip: {
    fontSize: 11,
    padding: "3px 10px",
    borderRadius: 20,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  goBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #4ECDC4, #3ab8b0)",
    color: "#0d0d1a",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  editBtn: {
    flex: 1,
    background: "#1a1a2e",
    color: "#888",
    border: "1px solid #222240",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  deleteBtn: {
    background: "#1a1a2e",
    color: "#FF6B6B50",
    border: "1px solid #222240",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  editTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "48px 20px 16px",
    position: "sticky",
    top: 0,
    background: "#0d0d1a",
    zIndex: 10,
  },
  cancelBtn: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: "8px 0",
  },
  saveBtn: {
    background: "#4ECDC4",
    color: "#0d0d1a",
    border: "none",
    borderRadius: 10,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  workoutNameInput: {
    background: "none",
    border: "none",
    color: "#f0f0f0",
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
    outline: "none",
    marginBottom: 24,
    padding: "4px 0",
  },
  phaseBlock: {
    marginBottom: 28,
    padding: 16,
    background: "#13132a",
    borderRadius: 16,
    border: "1px solid #1a1a35",
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  exerciseRow: {
    background: "#0d0d1a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    border: "1px solid #1a1a30",
  },
  exNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    background: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#555",
    fontWeight: 700,
    flexShrink: 0,
  },
  nameInput: {
    flex: 1,
    background: "none",
    border: "none",
    borderBottom: "1px solid #222240",
    color: "#f0f0f0",
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    padding: "6px 2px",
    outline: "none",
    fontWeight: 600,
  },
  durationLabel: {
    fontSize: 12,
    color: "#555",
    fontWeight: 600,
  },
  durationValue: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 16,
    fontWeight: 700,
    color: "#f0f0f0",
    minWidth: 50,
    textAlign: "center",
  },
  smallBtn: {
    background: "#1a1a2e",
    border: "1px solid #222240",
    borderRadius: 8,
    color: "#888",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  iconBtn: {
    background: "#1a1a2e",
    border: "1px solid #222240",
    borderRadius: 8,
    color: "#555",
    fontSize: 14,
    padding: "4px 10px",
    cursor: "pointer",
  },
  addBtn: {
    width: "100%",
    background: "none",
    border: "1px dashed",
    borderRadius: 10,
    padding: "12px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    marginTop: 4,
  },
  restConfig: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #1a1a35",
  },
  restChip: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #222240",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  summaryCard: {
    background: "#13132a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    border: "1px solid #1a1a35",
  },
  summaryVal: {
    display: "block",
    fontFamily: "'Space Mono', monospace",
    fontSize: 24,
    fontWeight: 700,
    color: "#FF6B6B",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
    display: "block",
  },
  activeTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "48px 16px 8px",
  },
  stopBtn: {
    background: "#1a1a2e",
    border: "1px solid #FF6B6B30",
    color: "#FF6B6B",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  phasePill: {
    background: "#13132a",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    border: "1px solid #1a1a35",
  },
  elapsedSmall: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    color: "#555",
    fontWeight: 700,
  },
  dotsRow: {
    display: "flex",
    gap: 2,
    padding: "8px 16px",
  },
  activeContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 20px",
    animation: "fadeIn 0.3s ease",
  },
  activeExName: {
    fontSize: 26,
    fontWeight: 700,
    color: "#f0f0f0",
    marginBottom: 32,
    textAlign: "center",
    fontFamily: "'DM Sans', sans-serif",
  },
  bigTimerWrap: {
    position: "relative",
    width: 220,
    height: 220,
  },
  timerCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 32,
  },
  adjustBtn: {
    background: "#1a1a2e",
    border: "1px solid #222240",
    borderRadius: 12,
    color: "#888",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4ECDC4, #3ab8b0)",
    border: "none",
    color: "#0d0d1a",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 24px #4ECDC440",
  },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #FF6B6B, #ee5a5a)",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 24px #FF6B6B40",
  },
  skipBtn: {
    marginTop: 24,
    background: "none",
    border: "1px solid #222240",
    borderRadius: 12,
    color: "#666",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 24px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #4ECDC4, #3ab8b0)",
    color: "#0d0d1a",
    border: "none",
    borderRadius: 14,
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  newWorkoutBtn: {    background: "none",    border: "none",    color: "#888",    fontSize: 26,    fontWeight: 300,    cursor: "pointer",    padding: "4px 8px",    lineHeight: 1,  },  centerScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
};
const _currentTheme = localStorage.getItem('liftTheme') || 'dark';
const s = _currentTheme === 'light' ? Object.keys(lightOverrides).reduce((acc, key) => { acc[key] = { ..._darkS[key], ...lightOverrides[key] }; return acc; }, { ..._darkS }) : _darkS;
