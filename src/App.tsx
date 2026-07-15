import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  Calendar,
  Download,
  X,
  Info,
  User,
  LayoutDashboard,
  CalendarDays,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";
type View = "dashboard" | "classes" | "planner";

interface ClassSession {
  id: string;
  subject: string;
  day: Day;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  instructor: string;
  color: string;
}

interface PlannerEvent {
  id: string;
  title: string;
  day: Day;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: "Class" | "Study" | "Social" | "Work" | "Health" | "Other";
  color: string;
}

const CLASS_DAYS: Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const FULL_WEEK_DAYS: Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-slate-500",
];

const CATEGORIES = {
  Class: "bg-indigo-600",
  Study: "bg-indigo-400",
  Social: "bg-rose-500",
  Work: "bg-amber-500",
  Health: "bg-emerald-500",
  Other: "bg-slate-500",
};

// --- Utilities ---

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToPosition = (minutes: number, startHour: number) => {
  return minutes - startHour * 60;
};

// --- Components ---

export default function App() {
  const [view, setView] = useState<View>("dashboard");

  // Classes State
  const [classes, setClasses] = useState<ClassSession[]>(() => {
    const saved = localStorage.getItem("timetable_classes");
    return saved ? JSON.parse(saved) : [];
  });

  // Planner State
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>(() => {
    const saved = localStorage.getItem("planner_events");
    return saved ? JSON.parse(saved) : [];
  });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDay = FULL_WEEK_DAYS[(now.getDay() + 6) % 7];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const activeEvent = useMemo(() => {
    // Check classes first
    const activeClass = classes.find((c) => {
      if (c.day !== currentDay) return false;
      const start = timeToMinutes(c.startTime);
      const end = timeToMinutes(c.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });

    if (activeClass)
      return {
        id: activeClass.id,
        title: activeClass.subject,
        endTime: activeClass.endTime,
        type: "Class",
        color: activeClass.color,
      };

    // Then check planner
    const activePlanner = plannerEvents.find((p) => {
      if (p.day !== currentDay) return false;
      const start = timeToMinutes(p.startTime);
      const end = timeToMinutes(p.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });

    if (activePlanner)
      return {
        id: activePlanner.id,
        title: activePlanner.title,
        endTime: activePlanner.endTime,
        type: activePlanner.category,
        color: activePlanner.color,
      };

    return null;
  }, [classes, plannerEvents, currentDay, currentMinutes]);

  const nextEvent = useMemo(() => {
    const allEvents = [
      ...classes.map((c) => ({
        id: c.id,
        title: c.subject,
        day: c.day,
        startTime: c.startTime,
        type: "Class",
      })),
      ...plannerEvents.map((p) => ({
        id: p.id,
        title: p.title,
        day: p.day,
        startTime: p.startTime,
        type: p.category,
      })),
    ];

    if (allEvents.length === 0) return null;

    const dayIndices: Record<Day, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };
    const nowDayIdx = (now.getDay() + 6) % 7;

    const sorted = allEvents.sort((a, b) => {
      const aDayIdx = dayIndices[a.day];
      const bDayIdx = dayIndices[b.day];
      const aDist = (aDayIdx - nowDayIdx + 7) % 7;
      const bDist = (bDayIdx - nowDayIdx + 7) % 7;

      if (aDist !== bDist) return aDist - bDist;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    const next = sorted.find((e) => {
      const eDayIdx = dayIndices[e.day];
      if (eDayIdx !== nowDayIdx) return true;
      return timeToMinutes(e.startTime) > currentMinutes;
    });

    return next || sorted[0];
  }, [classes, plannerEvents, now, currentMinutes]);

  // Handle Notifications
  useEffect(() => {
    if (!activeEvent && nextEvent) {
      // If no event is active, but one is coming up, we might notify soon?
    }
  }, [activeEvent, nextEvent]);

  // Effect to trigger notification when active event changes/ends
  const prevActiveId = useRef<string | null>(null);
  useEffect(() => {
    if (
      prevActiveId.current !== null &&
      activeEvent?.id !== prevActiveId.current
    ) {
      if (Notification.permission === "granted" && nextEvent) {
        new Notification(`Next up: ${nextEvent.title}`, {
          body: `Starts at ${nextEvent.startTime}. Get ready!`,
          icon: "/favicon.ico",
        });
      }
    }
    prevActiveId.current = activeEvent?.id || null;
  }, [activeEvent, nextEvent]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You will be notified about your upcoming schedule.",
        });
      }
    }
  };

  const timeLeft = useMemo(() => {
    if (!activeEvent) return null;
    const end = timeToMinutes(activeEvent.endTime);

    // Calculate seconds remaining for more precision
    const endSeconds = end * 60;
    const nowSeconds =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const remainingSeconds = endSeconds - nowSeconds;

    if (remainingSeconds <= 0) return null;

    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;

    return {
      hours: h,
      minutes: m,
      seconds: s,
      formatted: `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`,
    };
  }, [activeEvent, now]);

  const weeklyActionStats = useMemo(() => {
    const stats: Record<
      string,
      { durationMinutes: number; color: string; count: number; type: string }
    > = {};

    // Process Planner Events
    plannerEvents.forEach((p) => {
      const start = timeToMinutes(p.startTime);
      const end = timeToMinutes(p.endTime);
      const duration = end - start;
      if (duration > 0) {
        const isClass = p.category === "Class" || p.category === "Study";
        const key = isClass ? "Class" : p.title.trim();
        const displayColor = isClass ? "bg-indigo-600" : p.color;
        const displayType = isClass ? "Class" : p.category;

        if (!stats[key]) {
          stats[key] = {
            durationMinutes: 0,
            color: displayColor,
            count: 0,
            type: displayType,
          };
        }
        stats[key].durationMinutes += duration;
        stats[key].count += 1;
      }
    });

    // Automatically add 6 hours of sleep per day for midnight to 6 AM (which is not in the scheduler)
    const autoSleepMinutes = 6 * 60 * 7; // 42 hours total
    const sleepKey = "Sleep";
    if (!stats[sleepKey]) {
      stats[sleepKey] = {
        durationMinutes: 0,
        color: "bg-emerald-500",
        count: 7,
        type: "Health",
      };
    }
    stats[sleepKey].durationMinutes += autoSleepMinutes;

    return Object.entries(stats)
      .map(([name, data]) => {
        const hours = data.durationMinutes / 60;
        return {
          name,
          hours: Math.round(hours * 10) / 10,
          minutes: data.durationMinutes,
          color: data.color,
          count: data.count,
          type: data.type,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);
  }, [plannerEvents]);

  const totalWeeklyMinutes = useMemo(() => {
    return weeklyActionStats.reduce((acc, curr) => acc + curr.minutes, 0);
  }, [weeklyActionStats]);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if (!("documentPictureInPicture" in window)) {
      alert(
        "Your browser doesn't support Document Picture-in-Picture. Try Chrome!",
      );
      return;
    }

    try {
      // @ts-ignore
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 240,
      });

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules]
            .map((rule) => rule.cssText)
            .join("");
          const style = document.createElement("style");
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement("link");
          if (styleSheet.href) {
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });

      // Fallback Tailwind if copy fails
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap";
      pip.document.head.appendChild(fontLink);

      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentDayInPlanner, setCurrentDayInPlanner] = useState<Day>("Monday");

  // Form State (Shared for simplicity or separate if needed)
  const [newClass, setNewClass] = useState<
    Omit<ClassSession, "id" | "day"> & { days: Day[] }
  >({
    subject: "",
    days: ["Monday"],
    startTime: "09:00",
    endTime: "10:30",
    location: "",
    instructor: "",
    color: "bg-indigo-500",
  });

  const [newPlannerEvent, setNewPlannerEvent] = useState<
    Omit<PlannerEvent, "id" | "day"> & { days: Day[] }
  >({
    title: "",
    days: ["Monday"],
    startTime: "08:00",
    endTime: "09:00",
    category: "Study",
    color: "bg-indigo-500",
  });

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem("timetable_classes", JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem("planner_events", JSON.stringify(plannerEvents));
  }, [plannerEvents]);

  const resetForm = () => {
    setNewClass({
      subject: "",
      days: ["Monday"],
      startTime: "09:00",
      endTime: "10:30",
      location: "",
      instructor: "",
      color: "bg-indigo-500",
    });
    setNewPlannerEvent({
      title: "",
      days: ["Monday"],
      startTime: "08:00",
      endTime: "09:00",
      category: "Study",
      color: "bg-indigo-500",
    });
    setEditingId(null);
    setIsAddingMode(false);
  };

  const handleSaveClass = (e: FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setClasses(
        classes.map((c) =>
          c.id === editingId
            ? { ...newClass, day: newClass.days[0], id: editingId }
            : c,
        ),
      );
    } else {
      const newEntries = newClass.days.map((day) => ({
        ...newClass,
        day,
        id: crypto.randomUUID(),
      }));
      setClasses([...classes, ...newEntries]);
    }
    resetForm();
  };

  const handleSavePlannerEvent = (e: FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPlannerEvents(
        plannerEvents.map((p) =>
          p.id === editingId
            ? {
                ...newPlannerEvent,
                day: newPlannerEvent.days[0],
                id: editingId,
              }
            : p,
        ),
      );
    } else {
      const newEntries = newPlannerEvent.days.map((day) => ({
        ...newPlannerEvent,
        day,
        id: crypto.randomUUID(),
      }));
      setPlannerEvents([...plannerEvents, ...newEntries]);
    }
    resetForm();
  };

  const handleEditClass = (c: ClassSession) => {
    setNewClass({
      subject: c.subject,
      days: [c.day],
      startTime: c.startTime,
      endTime: c.endTime,
      location: c.location,
      instructor: c.instructor,
      color: c.color,
    });
    setEditingId(c.id);
    setIsAddingMode(true);
  };

  const handleEditPlannerEvent = (p: PlannerEvent) => {
    setNewPlannerEvent({
      title: p.title,
      days: [p.day],
      startTime: p.startTime,
      endTime: p.endTime,
      category: p.category,
      color: p.color,
    });
    setEditingId(p.id);
    setIsAddingMode(true);
  };

  const removeClass = (id: string) => {
    if (confirm("Are you sure you want to remove this class?")) {
      setClasses(classes.filter((c) => c.id !== id));
    }
  };

  const removePlannerEvent = (id: string) => {
    if (confirm("Remove this event?")) {
      setPlannerEvents(plannerEvents.filter((p) => p.id !== id));
    }
  };

  const startHourClasses = 8;
  const endHourClasses = 20;
  const hoursClasses = Array.from(
    { length: endHourClasses - startHourClasses + 1 },
    (_, i) => startHourClasses + i,
  );

  const startHourPlanner = 6; // 6 AM
  const endHourPlanner = 24; // Midnight
  const hoursPlanner = Array.from(
    { length: endHourPlanner - startHourPlanner + 1 },
    (_, i) => startHourPlanner + i,
  );

  // Stats
  const classCount = classes.length;
  const plannerCount = plannerEvents.length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar / Navigation (Responsive) */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl border border-neutral-200 px-2 py-2 rounded-full shadow-2xl flex items-center gap-1 sm:bottom-auto sm:top-4 sm:left-4 sm:translate-x-0 sm:flex-col sm:w-16 sm:py-6 sm:h-[calc(100vh-2rem)] sm:justify-center print:hidden">
        <button
          onClick={() => setView("dashboard")}
          className={`p-3 rounded-full transition-all ${view === "dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-neutral-500 hover:bg-neutral-100"}`}
          title="Dashboard"
        >
          <LayoutDashboard size={24} />
        </button>
        <button
          onClick={() => setView("classes")}
          className={`p-3 rounded-full transition-all ${view === "classes" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-neutral-500 hover:bg-neutral-100"}`}
          title="Class Timetable"
        >
          <Calendar size={24} />
        </button>
        <button
          onClick={() => setView("planner")}
          className={`p-3 rounded-full transition-all ${view === "planner" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-neutral-500 hover:bg-neutral-100"}`}
          title="Weekly Planner"
        >
          <CalendarDays size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="sm:pl-24 pb-24 sm:pb-8">
        <header className="px-6 py-8 flex justify-between items-end max-w-[1600px] mx-auto print:hidden">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">
              {view === "dashboard" && "Student Hub"}
              {view === "classes" && "Class Schedule"}
              {view === "planner" && "Life Planner"}
            </h1>
            <p className="text-neutral-500 font-medium mt-1">
              {view === "dashboard" && "Welcome back! Here's your overview."}
              {view === "classes" && "Manage your academic lectures and labs."}
              {view === "planner" && "Plan your study, work, and social life."}
            </p>
          </div>
          <div className="flex gap-2">
            {view !== "dashboard" && (
              <button
                onClick={() => window.print()}
                className="p-3 bg-white border border-neutral-200 rounded-2xl text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm"
              >
                <Download size={20} />
              </button>
            )}
            <button
              onClick={() => setIsAddingMode(true)}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6">
          <AnimatePresence mode="wait">
            {view === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Academic Card */}
                <div
                  onClick={() => setView("classes")}
                  className="group relative bg-white border border-neutral-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 text-neutral-100 group-hover:text-indigo-50 transition-colors">
                    <Calendar
                      size={120}
                      strokeWidth={1}
                    />
                  </div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                      <Calendar size={28} />
                    </div>
                    <h2 className="text-3xl font-black mb-2">
                      Class Timetable
                    </h2>
                    <p className="text-neutral-500 max-w-xs mb-8">
                      View and manage your academic schedule across the week.
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                        {classCount} Sessions
                      </div>
                      <span className="text-indigo-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Schedule <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Planner Card */}
                <div
                  onClick={() => setView("planner")}
                  className="group relative bg-white border border-neutral-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 text-neutral-100 group-hover:text-emerald-50 transition-colors">
                    <CalendarDays
                      size={120}
                      strokeWidth={1}
                    />
                  </div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                      <CalendarDays size={28} />
                    </div>
                    <h2 className="text-3xl font-black mb-2">Life Planner</h2>
                    <p className="text-neutral-500 max-w-xs mb-8">
                      Detailed weekly overview covering study, social, and
                      personal goals.
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                        {plannerCount} Events
                      </div>
                      <span className="text-emerald-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Open Planner <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div
                    className={`col-span-1 sm:col-span-2 lg:col-span-1 p-8 rounded-[2.5rem] border transition-all flex flex-col justify-between relative overflow-hidden ${activeEvent ? `${activeEvent.color} text-white border-transparent shadow-xl` : "bg-white border-neutral-100 shadow-sm"}`}
                  >
                    {activeEvent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 0.1, scale: 1 }}
                        className="absolute -right-4 -bottom-4 text-white"
                      >
                        <Clock size={160} />
                      </motion.div>
                    )}
                    <div className="relative z-10">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${activeEvent ? "bg-white/20" : "bg-amber-50 text-amber-600"}`}
                      >
                        <Target size={20} />
                      </div>
                      <p
                        className={`text-xs font-bold uppercase tracking-widest ${activeEvent ? "text-white/60" : "text-neutral-400"}`}
                      >
                        {activeEvent
                          ? `Current: ${activeEvent.type}`
                          : "No Active Session"}
                      </p>

                      {activeEvent ? (
                        <div className="mt-2">
                          <h3 className="text-2xl font-black truncate">
                            {activeEvent.title}
                          </h3>
                          <div className="mt-4 flex flex-col">
                            <span className="text-4xl font-black tracking-tighter tabular-nums">
                              {timeLeft?.formatted}
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-widest mt-1 opacity-70">
                              Remaining
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-2xl font-black mt-1">High Focus</p>
                      )}
                    </div>
                  </div>

                  {/* Next Event Card */}
                  <div
                    onClick={() =>
                      setView(
                        nextEvent?.type === "Class" ? "classes" : "planner",
                      )
                    }
                    className="col-span-1 p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute -right-4 -bottom-4 text-indigo-100 group-hover:text-indigo-200/50 transition-colors">
                      <ArrowRight
                        size={120}
                        strokeWidth={1}
                      />
                    </div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                        <Plus size={20} />
                      </div>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                        Next Up
                      </p>
                      {nextEvent ? (
                        <div>
                          <h3 className="text-xl font-black text-neutral-900 truncate">
                            {nextEvent.title}
                          </h3>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              {nextEvent.startTime}
                            </div>
                            {nextEvent.day !== currentDay && (
                              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                {nextEvent.day}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xl font-black text-neutral-400">
                          All caught up!
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                      <Target size={20} />
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      Productivity
                    </p>
                    <p className="text-2xl font-black mt-1">High</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                    <div
                      className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 cursor-pointer hover:bg-indigo-100 transition-all"
                      onClick={requestNotificationPermission}
                    >
                      <Info size={20} />
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      Reminders
                    </p>
                    <p className="text-xl font-black mt-1">
                      {Notification.permission === "granted"
                        ? "Enabled"
                        : "Disabled"}
                    </p>
                    {Notification.permission !== "granted" && (
                      <button
                        onClick={requestNotificationPermission}
                        className="text-[10px] font-black text-indigo-600 uppercase mt-2 hover:underline"
                      >
                        Enable Alerts
                      </button>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                      <Clock size={20} />
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
                      Week Focus
                    </p>
                    <p className="text-2xl font-black mt-1">Academics</p>
                  </div>

                  {/* Weekly Actions Statistics Card */}
                  <div className="col-span-1 sm:col-span-3 bg-white border border-neutral-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} />
                          </div>
                          <h3 className="text-xl font-black text-neutral-900">
                            Weekly Time Distribution
                          </h3>
                        </div>
                        <p className="text-neutral-500 text-sm mt-1">
                          Real-time statistics based entirely on your weekly
                          life planner events.
                        </p>
                      </div>

                      {totalWeeklyMinutes > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center gap-3 shrink-0">
                          <div className="text-indigo-600">
                            <Clock size={24} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider leading-none block">
                              Total Scheduled
                            </span>
                            <span className="font-mono font-black text-lg text-indigo-600 leading-none">
                              {Math.round((totalWeeklyMinutes / 60) * 10) / 10}h
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-neutral-100" />

                    {weeklyActionStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-100 rounded-3xl p-6 bg-neutral-50/50">
                        <CalendarDays
                          className="text-neutral-300 mb-3"
                          size={40}
                        />
                        <h4 className="font-bold text-neutral-700">
                          No activities scheduled yet
                        </h4>
                        <p className="text-neutral-400 text-xs max-w-sm mt-1">
                          Add some lectures, labs, or planner events (like
                          Sleep, Study, Work) to see your weekly time breakdown!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 max-h-[320px] overflow-y-auto pr-2 no-scrollbar">
                        {weeklyActionStats.map((item) => {
                          const percentage =
                            totalWeeklyMinutes > 0
                              ? Math.round(
                                  (item.minutes / totalWeeklyMinutes) * 100,
                                )
                              : 0;
                          return (
                            <div
                              key={item.name}
                              className="flex flex-col gap-2 p-3 rounded-2xl hover:bg-neutral-50 transition-all border border-transparent hover:border-neutral-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-3 h-3 rounded-full ${item.color} shrink-0`}
                                  />
                                  <span
                                    className="font-bold text-sm text-neutral-800 truncate"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full uppercase font-black tracking-wider shrink-0">
                                    {item.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-sm font-black text-neutral-900">
                                    {item.hours}h
                                  </span>
                                  <span className="text-xs text-neutral-400 font-bold">
                                    ({percentage}%)
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{
                                    duration: 0.8,
                                    ease: "easeOut",
                                  }}
                                  className={`h-full ${item.color} rounded-full`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === "classes" && (
              <motion.div
                key="classes"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-2xl overflow-hidden print:shadow-none print:border-none"
                id="timetable-to-print"
              >
                <div className="overflow-x-auto print:overflow-visible">
                  <div className="min-w-[1000px] grid grid-cols-[80px_repeat(5,1fr)] print:min-w-0">
                    <div className="border-b border-r border-neutral-100 bg-neutral-50/50"></div>
                    {CLASS_DAYS.map((day) => (
                      <div
                        key={day}
                        className="py-5 text-center border-b border-neutral-100 font-black text-xs uppercase tracking-widest bg-neutral-50/50 text-neutral-400"
                      >
                        {day}
                      </div>
                    ))}

                    <div className="border-r border-neutral-100 relative h-[840px] bg-neutral-50/20">
                      {hoursClasses.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full text-right pr-4 font-mono text-[10px] text-neutral-300 font-bold"
                          style={{
                            top: `${(hour - startHourClasses) * 60 + 10}px`,
                          }}
                        >
                          {hour}:00
                        </div>
                      ))}
                      {/* Current Time Line */}
                      {currentMinutes / 60 >= startHourClasses &&
                        currentMinutes / 60 <= endHourClasses && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-indigo-500/30 z-20 pointer-events-none"
                            style={{
                              top: `${minutesToPosition(currentMinutes, startHourClasses)}px`,
                            }}
                          />
                        )}
                    </div>

                    {CLASS_DAYS.map((day) => (
                      <div
                        key={day}
                        className="relative h-[840px] border-r last:border-r-0 border-neutral-100 bg-grid-pattern"
                      >
                        {/* Day Column Time Indicator */}
                        {day === currentDay &&
                          currentMinutes / 60 >= startHourClasses &&
                          currentMinutes / 60 <= endHourClasses && (
                            <div
                              className="absolute left-0 right-0 border-t-2 border-indigo-500 z-30 pointer-events-none"
                              style={{
                                top: `${minutesToPosition(currentMinutes, startHourClasses)}px`,
                              }}
                            >
                              <div className="absolute -top-1.5 -left-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />
                            </div>
                          )}
                        {hoursClasses.map((hour) => (
                          <div
                            key={hour}
                            className="absolute w-full h-[1px] bg-neutral-50"
                            style={{
                              top: `${(hour - startHourClasses) * 60}px`,
                            }}
                          />
                        ))}

                        <AnimatePresence>
                          {classes
                            .filter((c) => c.day === day)
                            .map((c) => {
                              const startMin = timeToMinutes(c.startTime);
                              const endMin = timeToMinutes(c.endTime);
                              const top = minutesToPosition(
                                startMin,
                                startHourClasses,
                              );
                              const height = endMin - startMin;

                              return (
                                <motion.div
                                  key={c.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  whileHover={{ scale: 1.02, zIndex: 10 }}
                                  className={`absolute left-1.5 right-1.5 rounded-2xl p-4 ${c.color} text-white shadow-xl shadow-black/10 flex flex-col gap-1 overflow-hidden group cursor-pointer border border-white/10`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: 1,
                                  }}
                                  onClick={() => handleEditClass(c)}
                                >
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-xs leading-tight pr-4 drop-shadow-sm">
                                      {c.subject}
                                    </h3>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeClass(c.id);
                                        }}
                                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-md"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 mt-auto">
                                    {activeEvent?.id === c.id && timeLeft && (
                                      <div className="flex items-center gap-1.5 text-[10px] bg-white/20 w-fit px-2 py-0.5 rounded-md font-black animate-pulse mb-1">
                                        <Clock size={10} />
                                        <span>{timeLeft.formatted} left</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] bg-black/10 w-fit px-2 py-0.5 rounded-md font-bold">
                                      <Clock size={10} />
                                      <span>
                                        {c.startTime} - {c.endTime}
                                      </span>
                                    </div>
                                    {c.location && (
                                      <div className="flex items-center gap-1.5 text-[10px] opacity-80 font-medium truncate">
                                        <MapPin size={10} />
                                        <span>{c.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {view === "planner" && (
              <motion.div
                key="planner"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-2xl overflow-hidden print:shadow-none print:border-none"
              >
                <div className="overflow-x-auto print:overflow-visible">
                  <div className="min-w-[1400px] grid grid-cols-[80px_repeat(7,1fr)] print:min-w-0">
                    <div className="border-b border-r border-neutral-100 bg-neutral-50/50"></div>
                    {FULL_WEEK_DAYS.map((day) => (
                      <div
                        key={day}
                        className="py-5 text-center border-b border-neutral-100 font-black text-[10px] uppercase tracking-widest bg-neutral-50/50 text-neutral-400"
                      >
                        {day}
                      </div>
                    ))}

                    <div className="border-r border-neutral-100 relative h-[1080px] bg-neutral-50/20">
                      {hoursPlanner.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full text-right pr-4 font-mono text-[10px] text-neutral-300 font-bold"
                          style={{
                            top: `${(hour - startHourPlanner) * 60 + 10}px`,
                          }}
                        >
                          {hour === 24 ? "00" : hour}:00
                        </div>
                      ))}
                      {/* Current Time Line */}
                      {currentMinutes / 60 >= startHourPlanner &&
                        currentMinutes / 60 <= endHourPlanner && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-emerald-500/30 z-20 pointer-events-none"
                            style={{
                              top: `${minutesToPosition(currentMinutes, startHourPlanner)}px`,
                            }}
                          />
                        )}
                    </div>

                    {FULL_WEEK_DAYS.map((day) => (
                      <div
                        key={day}
                        className="relative h-[1080px] border-r last:border-r-0 border-neutral-100 bg-grid-pattern"
                      >
                        {/* Day Column Time Indicator */}
                        {day === currentDay &&
                          currentMinutes / 60 >= startHourPlanner &&
                          currentMinutes / 60 <= endHourPlanner && (
                            <div
                              className="absolute left-0 right-0 border-t-2 border-emerald-500 z-30 pointer-events-none"
                              style={{
                                top: `${minutesToPosition(currentMinutes, startHourPlanner)}px`,
                              }}
                            >
                              <div className="absolute -top-1.5 -left-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                            </div>
                          )}
                        {hoursPlanner.map((hour) => (
                          <div
                            key={hour}
                            className="absolute w-full h-[1px] bg-neutral-50"
                            style={{
                              top: `${(hour - startHourPlanner) * 60}px`,
                            }}
                          />
                        ))}

                        <AnimatePresence>
                          {plannerEvents
                            .filter((p) => p.day === day)
                            .map((p) => {
                              const startMin = timeToMinutes(p.startTime);
                              const endMin = timeToMinutes(p.endTime);
                              const top = minutesToPosition(
                                startMin,
                                startHourPlanner,
                              );
                              const height = endMin - startMin;

                              return (
                                <motion.div
                                  key={p.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  whileHover={{ scale: 1.02, zIndex: 10 }}
                                  className={`absolute left-1.5 right-1.5 rounded-xl p-3 ${p.color} text-white shadow-xl shadow-black/5 flex flex-col gap-0.5 overflow-hidden group cursor-pointer border border-white/10`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: 1,
                                  }}
                                  onClick={() => handleEditPlannerEvent(p)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black uppercase opacity-60 leading-none mb-1 tracking-tighter truncate">
                                        {p.category}
                                      </span>
                                      <h3 className="font-bold text-[11px] leading-tight truncate">
                                        {p.title}
                                      </h3>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removePlannerEvent(p.id);
                                      }}
                                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/20 rounded transition-all"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  {activeEvent?.id === p.id && timeLeft && (
                                    <div className="mt-1 flex items-center gap-1 text-[9px] font-black bg-white/20 w-fit px-2 py-0.5 rounded-md animate-pulse">
                                      <Clock size={8} />
                                      <span>{timeLeft.formatted} left</span>
                                    </div>
                                  )}
                                  {height > 40 && (
                                    <div className="mt-auto flex items-center gap-1 text-[9px] font-bold opacity-80">
                                      <Clock size={8} />
                                      <span>
                                        {p.startTime} - {p.endTime}
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Active Event Bar for Schedule Views */}
        <AnimatePresence>
          {view !== "dashboard" && activeEvent && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-white border border-neutral-200 pl-6 pr-4 py-3 rounded-[2rem] shadow-2xl flex items-center gap-6 sm:bottom-8"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 ${activeEvent.color} rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10`}
                >
                  <Clock size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Active now
                  </span>
                  <span className="font-bold text-sm truncate max-w-[150px]">
                    {activeEvent.title}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-neutral-100" />

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Remaining
                  </span>
                  <span className="font-mono font-black text-lg text-indigo-600 tabular-nums leading-none mt-0.5">
                    {timeLeft?.formatted}
                  </span>
                </div>

                <button
                  onClick={togglePiP}
                  className={`p-3 rounded-2xl transition-all ${pipWindow ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"}`}
                  title="Pop-out Player"
                >
                  <ExternalLink size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Picture in Picture Portal */}
        {pipWindow &&
          createPortal(
            <div
              className="h-full w-full flex flex-col bg-neutral-900 text-white font-sans overflow-hidden"
              style={{ fontFamily: '"Inter", sans-serif' }}
            >
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {activeEvent ? (
                  <>
                    <div
                      className={`w-12 h-12 ${activeEvent.color} rounded-xl flex items-center justify-center text-white shadow-2xl mb-3 border border-white/10`}
                    >
                      <Clock size={24} />
                    </div>
                    <div className="text-center px-4 w-full">
                      <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">
                        {activeEvent.type}
                      </span>
                      <h1 className="text-lg font-black mt-0.5 truncate leading-tight">
                        {activeEvent.title}
                      </h1>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                      <div className="text-4xl font-black tabular-nums tracking-tighter text-indigo-400 leading-none">
                        {timeLeft?.formatted || "00m 00s"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center opacity-40">
                    <Target
                      size={32}
                      className="mx-auto mb-2"
                    />
                    <p className="text-xs font-black uppercase tracking-widest">
                      Focus Mode
                    </p>
                  </div>
                )}
              </div>

              {/* Next Up Section in PiP */}
              {nextEvent && (
                <div className="bg-white/5 border-t border-white/10 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                      <Plus size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-black uppercase opacity-40 tracking-widest leading-none mb-0.5">
                        Next
                      </span>
                      <span className="text-[10px] font-bold truncate leading-tight">
                        {nextEvent.title}
                      </span>
                    </div>
                  </div>
                  <div className="bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">
                    {nextEvent.startTime}
                  </div>
                </div>
              )}

              <div className="absolute top-2 right-2 opacity-20">
                <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
              </div>
            </div>,
            pipWindow.document.body,
          )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddingMode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white">
                <h2 className="text-2xl font-black">
                  {view === "classes"
                    ? editingId
                      ? "Edit Class"
                      : "Add Class"
                    : editingId
                      ? "Edit Event"
                      : "New Plan"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-3 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={
                  view === "classes" ? handleSaveClass : handleSavePlannerEvent
                }
                className="p-8 space-y-6"
              >
                {view === "classes" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                        Subject Name
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none font-bold"
                        value={newClass.subject}
                        onChange={(e) =>
                          setNewClass({ ...newClass, subject: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                        Days {!editingId && "(Select multiple to repeat)"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CLASS_DAYS.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (editingId) {
                                setNewClass({ ...newClass, days: [day] });
                              } else {
                                const days = newClass.days.includes(day)
                                  ? newClass.days.filter((d) => d !== day)
                                  : [...newClass.days, day];
                                if (days.length > 0)
                                  setNewClass({ ...newClass, days });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${newClass.days.includes(day) ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-neutral-50 border-neutral-100 text-neutral-400"}`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                          Theme
                        </label>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                setNewClass({ ...newClass, color })
                              }
                              className={`w-6 h-6 rounded-full ${color} transition-transform ${newClass.color === color ? "scale-125 ring-2 ring-offset-2 ring-indigo-500" : "hover:scale-110"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-rows-2 gap-2">
                        <input
                          required
                          type="time"
                          className="bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold text-sm"
                          value={newClass.startTime}
                          onChange={(e) =>
                            setNewClass({
                              ...newClass,
                              startTime: e.target.value,
                            })
                          }
                        />
                        <input
                          required
                          type="time"
                          className="bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold text-sm"
                          value={newClass.endTime}
                          onChange={(e) =>
                            setNewClass({
                              ...newClass,
                              endTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Location (Optional)"
                      className="w-full bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold"
                      value={newClass.location}
                      onChange={(e) =>
                        setNewClass({ ...newClass, location: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                        Event Title
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none font-bold"
                        value={newPlannerEvent.title}
                        onChange={(e) =>
                          setNewPlannerEvent({
                            ...newPlannerEvent,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                        Days {!editingId && "(Select multiple to repeat)"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {FULL_WEEK_DAYS.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (editingId) {
                                setNewPlannerEvent({
                                  ...newPlannerEvent,
                                  days: [day],
                                });
                              } else {
                                const days = newPlannerEvent.days.includes(day)
                                  ? newPlannerEvent.days.filter(
                                      (d) => d !== day,
                                    )
                                  : [...newPlannerEvent.days, day];
                                if (days.length > 0)
                                  setNewPlannerEvent({
                                    ...newPlannerEvent,
                                    days,
                                  });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${newPlannerEvent.days.includes(day) ? "bg-emerald-600 border-emerald-600 text-white shadow-md" : "bg-neutral-50 border-neutral-100 text-neutral-400"}`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">
                          Category
                        </label>
                        <select
                          className="w-full bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold capitalize"
                          value={newPlannerEvent.category}
                          onChange={(e) => {
                            const cat = e.target
                              .value as keyof typeof CATEGORIES;
                            setNewPlannerEvent({
                              ...newPlannerEvent,
                              category: cat,
                              color: CATEGORIES[cat],
                            });
                          }}
                        >
                          {Object.keys(CATEGORIES).map((cat) => (
                            <option
                              key={cat}
                              value={cat}
                            >
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-rows-2 gap-2">
                        <input
                          required
                          type="time"
                          className="bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold text-sm"
                          value={newPlannerEvent.startTime}
                          onChange={(e) =>
                            setNewPlannerEvent({
                              ...newPlannerEvent,
                              startTime: e.target.value,
                            })
                          }
                        />
                        <input
                          required
                          type="time"
                          className="bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100 outline-none font-bold text-sm"
                          value={newPlannerEvent.endTime}
                          onChange={(e) =>
                            setNewPlannerEvent({
                              ...newPlannerEvent,
                              endTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full ${view === "classes" ? "bg-indigo-600" : "bg-emerald-600"} text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 text-lg mt-4`}
                >
                  {editingId ? "Update Entry" : "Save To Schedule"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media print {
          @page { size: landscape; margin: 0; }
          body * { visibility: hidden; }
          nav, header, footer, .day-switcher, .bg-blue-50, .shadow-2xl { display: none !important; }
          #timetable-to-print, #timetable-to-print * { visibility: visible; }
          #timetable-to-print { position: absolute; left: 0; top: 0; width: 100% !important; margin: 0 !important; padding: 1cm !important; border: none !important; display: block !important; }
          .min-w-[1000px] { min-width: 100% !important; width: 100% !important; height: auto !important; grid-template-columns: 60px repeat(5, 1fr) !important; }
          .h-[840px] { height: 750px !important; }
          .bg-neutral-50\\/50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
          [class*="bg-"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
