import { useState, useEffect, FormEvent } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Analytics } from "@vercel/analytics/react";

// --- Types ---

type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

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

const DAYS: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const COLORS = [
  "bg-slate-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

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
  const [classes, setClasses] = useState<ClassSession[]>(() => {
    const saved = localStorage.getItem("timetable_classes");
    return saved ? JSON.parse(saved) : [];
  });

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClass, setNewClass] = useState<Omit<ClassSession, "id">>({
    subject: "",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:30",
    location: "",
    instructor: "",
    color: "bg-indigo-500",
  });

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem("timetable_classes", JSON.stringify(classes));
  }, [classes]);

  const resetForm = () => {
    setNewClass({
      subject: "",
      day: "Monday",
      startTime: "09:00",
      endTime: "10:30",
      location: "",
      instructor: "",
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
          c.id === editingId ? { ...newClass, id: editingId } : c,
        ),
      );
    } else {
      const id = crypto.randomUUID();
      setClasses([...classes, { ...newClass, id }]);
    }

    resetForm();
  };

  const handleEditClass = (c: ClassSession) => {
    setNewClass({
      subject: c.subject,
      day: c.day,
      startTime: c.startTime,
      endTime: c.endTime,
      location: c.location,
      instructor: c.instructor,
      color: c.color,
    });
    setEditingId(c.id);
    setIsAddingMode(true);
  };

  const removeClass = (id: string) => {
    if (confirm("Are you sure you want to remove this class?")) {
      setClasses(classes.filter((c) => c.id !== id));
    }
  };

  const startHour = 8; // 8 AM
  const endHour = 20; // 8 PM

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Analytics />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ClassFlow</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Academic Timetable
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-full hover:bg-neutral-100 transition-colors text-neutral-600"
            title="Print Timetable"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => setIsAddingMode(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} />
            <span>Add Class</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        {/* Statistics/Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Info size={22} />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">
                Total Classes
              </p>
              <p className="text-2xl font-bold">{classes.length}</p>
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div
          id="timetable-to-print"
          className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none"
        >
          <div className="overflow-x-auto print:overflow-visible">
            <div className="min-w-[1000px] grid grid-cols-[80px_repeat(5,1fr)] print:min-w-0">
              {/* Top Row: Days */}
              <div className="border-b border-r border-neutral-100 bg-neutral-50/50"></div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-4 text-center border-b border-neutral-100 font-bold text-sm tracking-wide bg-neutral-50/50 text-neutral-600"
                >
                  {day}
                </div>
              ))}

              {/* Day Columns */}
              <div className="border-r border-neutral-100 relative h-[840px]">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full text-right pr-3 font-mono text-[10px] text-neutral-400 font-medium"
                    style={{ top: `${(hour - startHour) * 60 + 10}px` }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {DAYS.map((day) => (
                <div
                  key={day}
                  className="relative h-[840px] border-r last:border-r-0 border-neutral-100 bg-grid-pattern"
                >
                  {/* Grid Lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full h-[1px] bg-neutral-50"
                      style={{ top: `${(hour - startHour) * 60}px` }}
                    />
                  ))}

                  {/* Classes for this day */}
                  <AnimatePresence>
                    {classes
                      .filter((c) => c.day === day)
                      .map((c) => {
                        const startMin = timeToMinutes(c.startTime);
                        const endMin = timeToMinutes(c.endTime);
                        const top = minutesToPosition(startMin, startHour);
                        const height = endMin - startMin;

                        return (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.02, zIndex: 10 }}
                            className={`absolute left-1 right-1 rounded-lg p-3 ${c.color} text-white shadow-lg shadow-black/10 flex flex-col gap-1 overflow-hidden group cursor-pointer`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              zIndex: 1,
                            }}
                            onClick={() => handleEditClass(c)}
                          >
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-xs truncate leading-tight pr-4">
                                {c.subject}
                              </h3>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClass(c);
                                  }}
                                  className="p-1 hover:bg-white/20 rounded"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeClass(c.id);
                                  }}
                                  className="p-1 hover:bg-white/20 rounded"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-auto">
                              <div className="flex items-center gap-1 text-[10px] opacity-90 font-medium">
                                <Clock size={10} />
                                <span>
                                  {c.startTime} - {c.endTime}
                                </span>
                              </div>
                              {c.location && (
                                <div className="flex items-center gap-1 text-[10px] opacity-90 font-medium">
                                  <MapPin size={10} />
                                  <span className="truncate">{c.location}</span>
                                </div>
                              )}
                              {c.instructor && (
                                <div className="flex items-center gap-1 text-[10px] opacity-90 font-medium">
                                  <User size={10} />
                                  <span className="truncate">
                                    {c.instructor}
                                  </span>
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
        </div>
      </main>

      {/* Add Class Form Modal */}
      <AnimatePresence>
        {isAddingMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white">
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Session" : "Add New Session"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSaveClass}
                className="p-8 space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Subject Name
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Advanced Mathematics"
                      className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                      value={newClass.subject}
                      onChange={(e) =>
                        setNewClass({ ...newClass, subject: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        Day
                      </label>
                      <select
                        className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                        value={newClass.day}
                        onChange={(e) =>
                          setNewClass({
                            ...newClass,
                            day: e.target.value as Day,
                          })
                        }
                      >
                        {DAYS.map((day) => (
                          <option
                            key={day}
                            value={day}
                          >
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {COLORS.slice(0, 10).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewClass({ ...newClass, color })}
                            className={`w-6 h-6 rounded-full ${color} transition-transform ${newClass.color === color ? "scale-125 ring-2 ring-offset-2 ring-indigo-500" : "hover:scale-110"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        Start Time
                      </label>
                      <input
                        required
                        type="time"
                        className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 transition-all outline-none"
                        value={newClass.startTime}
                        onChange={(e) =>
                          setNewClass({
                            ...newClass,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        End Time
                      </label>
                      <input
                        required
                        type="time"
                        className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 transition-all outline-none"
                        value={newClass.endTime}
                        onChange={(e) =>
                          setNewClass({ ...newClass, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        Section
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Section A"
                        className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 transition-all outline-none"
                        value={newClass.location}
                        onChange={(e) =>
                          setNewClass({ ...newClass, location: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        Instructor
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Smith"
                        className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:border-indigo-500 transition-all outline-none"
                        value={newClass.instructor}
                        onChange={(e) =>
                          setNewClass({
                            ...newClass,
                            instructor: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                  >
                    {editingId ? "Update Session" : "Save Session"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-12 px-6 text-center text-neutral-400 text-sm font-medium">
        <p>&copy; 2026 ClassFlow Timetable. Designed for efficiency.</p>
      </footer>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          /* Hide EVERYTHING by default */
          body * {
            visibility: hidden;
          }
          /* Only show the timetable and its children */
          #timetable-to-print, #timetable-to-print * {
            visibility: visible;
          }
          #timetable-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 1cm !important;
            border: none !important;
            display: block !important;
          }
          .min-w-[1000px] {
            min-width: 100% !important;
            width: 100% !important;
            height: calc(100vh - 2cm) !important;
            display: grid !important;
            grid-template-columns: 60px repeat(5, 1fr) !important;
          }
          .h-[840px] {
            height: 100% !important;
          }
          /* Ensure colors print */
          .bg-neutral-50\\/50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
          }
          [class*="bg-"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
