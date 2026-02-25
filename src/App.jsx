import { useState, useEffect, useRef, useCallback } from "react";

// ── Audio beep using Web Audio API ──
function useBeep() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };
  const beep = useCallback((freq = 880, duation = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, []);
  const finalBeep = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = "square";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }, []);
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
function PhaseEditor({ title, icon, exercises, setExercises, showRest, restTime, setRestTime, color }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2 style={{ ...s.phaseTitle, color }}>{title}</h2>
      </div>

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
            <span style={s.durationLabel}>Duur:</span>
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
          <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Rusttijd tussen oefeningen:</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {REST_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setRestTime(t)}
                style={{
                  ...s.restChip,
                  background: restTime === t ? color : "#1a1a2e",
                  color: restTime === t ? "#0d0d1a" : "#888",
                }}
              >
                {t < 60 ? `${t}s` : `${Math.floor(t / 60)}m${t % 60 ? t % 60 + "s" : ""}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Active Timer Screen ──
function ActiveSession({ plan, onFinish }) {
  const { beep, finalBeep } = useBeep();
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
    addPhase(plan.workout, "Workout", plan.restTime);
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
    <div style={{ ...s.container, background: isRest ? "#0a0a18" : "#0d0d1a" }}>
      <style>{globalCSS}</style>

      {/* Top bar */}
      <div style={s.activeTopBar}>
        <button onClick={handleStop} style={s.stopBtn}>
          ✕ Stop
        </button>
        <div style={s.phasePill}>
          <span style={{ color: phaseColor, fontWeight: 700 }}>{current.phase}</span>
        </div>
        <span style={s.elapsedSmall}>{formatTime(totalElapsed)}</span>
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
              background: i < currentIdx ? phaseColor : i === currentIdx ? phaseColor + "80" : "#1a1a2e",
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
                <circle cx="110" cy="110" r="98" fill="none" stroke="#1a1a2e" strokeWidth="6" />
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
                  color: remaining <= 3 ? "#FF6B6B" : "#f0f0f0",
                  animation: remaining <= 3 && remaining > 0 ? "pulse 0.5s ease infinite" : "none",
                }}>
                  {formatTime(remaining)}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                Volgende oefening
              </p>
              <p style={{ color: "#f0f0f0", fontSize: 22, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                {current.nextName || "—"}
              </p>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
              Oefening {currentExIdx} / {totalExercises}
            </p>
            <h1 style={s.activeExName}>{current.name}</h1>
            <div style={s.bigTimerWrap}>
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="98" fill="none" stroke="#1a1a2e" strokeWidth="6" />
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
                  color: remaining <= 3 ? "#FF6B6B" : "#f0f0f0",
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
            ⏮ Vorige
          </button>
          <button onClick={skipCurrent} style={s.skipBtn}>
            Volgende ⏭
          </button>
        </div>
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

// ── Main App ──
export default function WorkoutApp() {
  const [screen, setScreen] = useState("home");
  const [workouts, setWorkouts] = useState([]);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(null);

  // ── Supabase helpers ──
  const getSupabase = () => {
    try {
      // Dynamic import won't work in artifact preview, so we check if it's available
      if (window.__supabase) return window.__supabase;
      return null;
    } catch { return null; }
  };

  // Load workouts from Supabase on mount
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { supabase } = await import('./supabase.js');
      window.__supabase = supabase;
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = data.map(row => ({
        id: row.id,
        name: row.name,
        warmup: row.warmup || [],
        workout: row.workout || [],
        cooldown: row.cooldown || [],
        restTime: row.rest_time || 60,
      }));
      setWorkouts(mapped);
    } catch (err) {
      console.log('Supabase not available, using local state:', err.message);
      setDbError('Kon geen verbinding maken met de database. Workouts worden lokaal bewaard.');
    }
    setLoading(false);
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
        rest_time: workout.restTime,
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
      workout: [{ name: "", duration: 45 }],
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
      cooldown: w.cooldown.map(e => ({ ...e })),
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
    const saved = await saveToSupabase(w, isUpdate);
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

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);  const [lastCompletedId, setLastCompletedId] = useState(() => localStorage.getItem('lastCompletedId'));
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
    const exCount = w.workout.filter((e) => e.name.trim()).length;
    const restTotal = exCount > 1 ? (exCount - 1) * w.restTime : 0;
    return d(w.warmup) + d(w.workout) + restTotal + d(w.cooldown);
  };

  if (screen === "active" && activeWorkout) {
    return (
      <ActiveSession
        plan={activeWorkout}
        onFinish={() => { setScreen("home"); setActiveWorkout(null); }}
      />
    );
  }

  return (
    <div style={s.container}>
      <style>{globalCSS}</style>

      {/* ── HOME ── */}
      {screen === "home" && (
        <div style={{ animation: "fadeIn 0.3s ease", minHeight: "100vh" }}>
          <div style={s.header}>
            <div>
              <h1 style={s.logo}>LIFT<span style={{ color: "#FF6B6B" }}>.</span></h1>
  
            </div>
            {saving && <span style={{ fontSize: 12, color: "#4ECDC4", alignSelf: "center", fontWeight: 600 }}>Opslaan...</span>}
          </div>

          {dbError && (
            <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "#FF6B6B15", border: "1px solid #FF6B6B30", borderRadius: 10, fontSize: 12, color: "#FF6B6B" }}>
              {dbError}
            </div>
          )}

          <button onClick={createNewWorkout} style={s.startBtn}>
            <span style={{ fontSize: 22 }}>＋</span>
            <span>Nieuwe Workout</span>
          </button>

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
                        Workout · {w.workout.filter((e) => e.name.trim()).length}
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
                    <button onClick={() => editWorkout(i)} style={s.editBtn}>
                      ✎ Bewerk
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
              icon="🔥"
              color="#F7DC6F"
              exercises={editingWorkout.warmup}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, warmup: ex })}
              showRest={false}
            />

            <PhaseEditor
              title="Workout"
              icon="💪"
              color="#FF6B6B"
              exercises={editingWorkout.workout}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, workout: ex })}
              showRest={true}
              restTime={editingWorkout.restTime}
              setRestTime={(t) => setEditingWorkout({ ...editingWorkout, restTime: t })}
            />

            <PhaseEditor
              title="Cool Down"
              icon="❄️"
              color="#4ECDC4"
              exercises={editingWorkout.cooldown}
              setExercises={(ex) => setEditingWorkout({ ...editingWorkout, cooldown: ex })}
              showRest={false}
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
    </div>
  );
}

// ── Styles ──
const s = {
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
