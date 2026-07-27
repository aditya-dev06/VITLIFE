import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SLOT_MAPPING,
  DAYS,
  TIMESLOTS,
  GRID_SLOT_MAP
} from '../utils/timetableConstants';
import './TimetablePage.css';

export default function TimetablePage({ user, onUpdateTimetable, syncStatus = 'synced' }) {
  // 0ms state initialization
  const [timetable, setTimetable] = useState(() => user?.timetable || []);
  const [pastedText, setPastedText] = useState('');
  const [mobileDayTab, setMobileDayTab] = useState(1); // 1 = Monday
  const [showReupload, setShowReupload] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }

  // Sync state with user prop changes synchronously
  const prevUserTimetableRef = useRef(user?.timetable);
  if (user?.timetable !== prevUserTimetableRef.current) {
    prevUserTimetableRef.current = user?.timetable;
    setTimetable(user?.timetable || []);
  }

  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Manual Add Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newType, setNewType] = useState('LT');
  const [newRoom, setNewRoom] = useState('');

  // O(1) timetable hashtable lookup map
  const timetableMap = useMemo(() => {
    const map = Object.create(null);
    for (let i = 0; i < timetable.length; i++) {
      const item = timetable[i];
      if (item && item.slot) {
        map[item.slot] = item;
      }
    }
    return map;
  }, [timetable]);

  // Fast O(1) cell lookup helper using pre-computed GRID_SLOT_MAP & timetableMap
  const getCellClass = useCallback((dayIdx, slotIdx) => {
    const slotCode = GRID_SLOT_MAP[dayIdx]?.[slotIdx];
    if (!slotCode) return null;
    return {
      slotCode,
      classEntry: timetableMap[slotCode] || null
    };
  }, [timetableMap]);

  // Fast memoized mobile day view computation
  const mobileDayClasses = useMemo(() => {
    const result = [];
    for (let i = 0; i < timetable.length; i++) {
      const c = timetable[i];
      const slotInfo = SLOT_MAPPING[c.slot];
      if (slotInfo && slotInfo.day === mobileDayTab) {
        result.push({ ...c, start: slotInfo.start, end: slotInfo.end });
      }
    }
    return result.sort((a, b) => a.start.localeCompare(b.start));
  }, [timetable, mobileDayTab]);

  const parseOcrText = useCallback((text) => {
    let normalized = text.toUpperCase();

    // Normalize course codes (e.g. MAT2OO2 -> MAT-2002)
    normalized = normalized.replace(/\b([A-Z]{3,4})[\s-]*([0-9OIL|I!ZSSBB]{4})\b/g, (match, code, digits) => {
      let normDigits = '';
      for (let i = 0; i < digits.length; i++) {
        const char = digits[i];
        if ('0O'.includes(char)) normDigits += '0';
        else if ('1IL!|'.includes(char) || char === 'l') normDigits += '1';
        else if ('2Z'.includes(char)) normDigits += '2';
        else if ('3'.includes(char)) normDigits += '3';
        else if ('4'.includes(char)) normDigits += '4';
        else if ('5S'.includes(char)) normDigits += '5';
        else if ('6'.includes(char)) normDigits += '6';
        else if ('7'.includes(char)) normDigits += '7';
        else if ('8B'.includes(char)) normDigits += '8';
        else if ('9'.includes(char)) normDigits += '9';
        else normDigits += char;
      }
      return `${code}-${normDigits}`;
    });

    // Normalize slot codes
    normalized = normalized.replace(/\b([A-F])([0-9OIL|I!Z])([0-9OIL|I!ZEAH])\b/g, (match, letter, d1, d2) => {
      let normD1 = d1;
      let normD2 = d2;
      
      if ('1IL!|'.includes(normD1) || normD1 === 'l') normD1 = '1';
      else if ('2Z'.includes(normD1)) normD1 = '2';
      else return match;
      
      if ('1IL!|'.includes(normD2) || normD2 === 'l') normD2 = '1';
      else if ('2Z'.includes(normD2)) normD2 = '2';
      else if ('3E'.includes(normD2)) normD2 = '3';
      else if ('4AH'.includes(normD2)) normD2 = '4';
      else return match;
      
      return letter + normD1 + normD2;
    });

    const pattern = /\b([A-F][12][1-4])[\s-]*([A-Z]{3,4})[\s-]*(\d{4})(?:[\s-]*(LTP|LT|LP|L|P|T))?(?:[\s-]*([A-Z]{2,4})[\s-]*(\d{1,4}))?/g;
    
    const parsedEntries = [];
    let match;
    
    while ((match = pattern.exec(normalized)) !== null) {
      const slot = match[1];
      const courseCode = `${match[2]}${match[3]}`;
      const type = match[4] || 'LT';
      const room = match[5] && match[6] ? `${match[5]}-${match[6]}` : '';
      
      parsedEntries.push({ slot, courseCode, type, room });
    }
    
    // Proximity matching fallback
    if (parsedEntries.length === 0) {
      const slotPattern = /\b([A-F][12][1-4])\b/g;
      const slotsFound = [];
      let sm;
      while ((sm = slotPattern.exec(normalized)) !== null) {
        slotsFound.push({ slot: sm[1], index: sm.index });
      }
      
      const coursePattern = /\b([A-Z]{3,4})-(\d{4})\b/g;
      const coursesFound = [];
      let cm;
      while ((cm = coursePattern.exec(normalized)) !== null) {
        coursesFound.push({ code: `${cm[1]}${cm[2]}`, index: cm.index });
      }
      
      slotsFound.forEach(s => {
        let nearestCourse = null;
        let minDist = 100;
        
        coursesFound.forEach(c => {
          const dist = Math.abs(s.index - c.index);
          if (dist < minDist) {
            minDist = dist;
            nearestCourse = c;
          }
        });
        
        if (nearestCourse && minDist < 65) {
          const searchWindow = normalized.substring(
            Math.max(0, Math.min(s.index, nearestCourse.index) - 10), 
            Math.min(normalized.length, Math.max(s.index, nearestCourse.index) + 40)
          );
          const roomMatch = /([A-Z]{2,4})[\s-]*(\d{1,4})/.exec(searchWindow);
          const room = roomMatch ? `${roomMatch[1]}-${roomMatch[2]}` : '';
          
          parsedEntries.push({
            slot: s.slot,
            courseCode: nearestCourse.code,
            type: 'LT',
            room: room || 'AB-101'
          });
        }
      });
    }

    if (parsedEntries.length > 0) {
      const uniqueMap = Object.create(null);
      parsedEntries.forEach(entry => {
        uniqueMap[entry.slot] = entry;
      });
      
      const finalTimetable = Object.values(uniqueMap);
      setTimetable(finalTimetable);
      onUpdateTimetable(finalTimetable);
      showToast(`🎉 ${finalTimetable.length} slots loaded! Click "Save Timetable" to sync.`);
    } else {
      showToast("Couldn't recognise any class slots. Paste the full VTOP page text (Ctrl+A → Ctrl+C).", 'error');
    }
  }, [onUpdateTimetable, showToast]);

  const handleTextParseSubmit = (e) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    parseOcrText(pastedText);
    setPastedText('');
    setShowReupload(false);
  };

  const handleSave = () => {
    onUpdateTimetable(timetable);
    showToast('💾 Timetable saved! Will sync to cloud when online.');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your entire timetable?')) {
      setTimetable([]);
      onUpdateTimetable([]);
      showToast('Timetable cleared.');
    }
  };

  const handleDeleteClass = useCallback((slot) => {
    const filtered = timetable.filter(c => c.slot !== slot);
    setTimetable(filtered);
    onUpdateTimetable(filtered);
  }, [timetable, onUpdateTimetable]);

  const handleOpenAddModal = (slot) => {
    setNewSlot(slot);
    setNewCourseCode('');
    setNewType('LT');
    setNewRoom('');
    setShowAddModal(true);
  };

  const handleAddClassSubmit = (e) => {
    e.preventDefault();
    if (!newSlot || !newCourseCode.trim()) return;

    const entry = {
      slot: newSlot,
      courseCode: newCourseCode.trim().toUpperCase(),
      type: newType,
      room: newRoom.trim().toUpperCase() || 'AB-101'
    };

    // Immutable update
    const updated = [...timetable.filter(c => c.slot !== newSlot), entry];
    
    setTimetable(updated);
    onUpdateTimetable(updated);
    setShowAddModal(false);
  };

  // Sync status label config
  const syncConfig = {
    synced:  { icon: '☁️', label: 'Synced to cloud',   cls: 'sync-pill--synced'  },
    syncing: { icon: '🔄', label: 'Syncing…',          cls: 'sync-pill--syncing' },
    pending: { icon: '⚠️', label: 'Saved locally — will sync when online', cls: 'sync-pill--pending' },
    offline: { icon: '📥', label: 'Offline — saved locally', cls: 'sync-pill--pending' },
  };
  const sc = syncConfig[syncStatus] || syncConfig.synced;

  return (
    <div className="timetable-page-container">
      {/* Toast notification */}
      {toast && (
        <div className={`tt-toast tt-toast--${toast.type}`}>{toast.msg}</div>
      )}

      <div className="section-header">
        <h1 className="section-title">Class Timetable &amp; Live Tracker</h1>
        <p className="section-subtitle">
          {timetable.length === 0
            ? 'Copy your timetable text from VTOP and paste it below. The system will automatically map your slots and track your live schedule.'
            : 'Your schedule is active and tracking live. All changes are saved offline-first and synced to the cloud when online.'}
        </p>
        {syncStatus !== 'synced' && (
          <div className={`sync-pill ${sc.cls}`}>
            <span className="sync-pill-icon">{sc.icon}</span>
            <span>{sc.label}</span>
          </div>
        )}
      </div>

      {timetable.length === 0 && (
        <div className="timetable-tools-grid timetable-single-col">
          <div className="glass-panel tool-card tool-card-wide">
            <h3>📋 How to Copy Your Timetable from VTOP</h3>
            <div className="vtop-guide-layout">
              <div className="vtop-guide-image-wrap">
                <div className="vtop-guide-img-container">
                  <picture>
                    <source srcSet="/vtop-timetable-guide.webp" type="image/webp" />
                    <img
                      src="/vtop-timetable-guide.png"
                      alt="Your VTOP timetable – select all text from this page"
                      className="vtop-guide-img"
                      width="1024"
                      height="219"
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <span className="vtop-img-badge">← Your timetable looks like this</span>
                </div>
                <p className="vtop-guide-steps-title">Steps to copy</p>
                <div className="vtop-guide-steps">
                  <div className="guide-step">
                    <span className="guide-step-num">1</span>
                    <span>Go to <strong>VTOP → Academics → Time Table</strong></span>
                  </div>
                  <div className="guide-step">
                    <span className="guide-step-num">2</span>
                    <span>Press <kbd>Ctrl + A</kbd> to select all text on the page</span>
                  </div>
                  <div className="guide-step">
                    <span className="guide-step-num">3</span>
                    <span>Press <kbd>Ctrl + C</kbd> to copy the selected text</span>
                  </div>
                  <div className="guide-step">
                    <span className="guide-step-num">4</span>
                    <span>Paste it in the box below and click <strong>Parse</strong></span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleTextParseSubmit} className="vtop-paste-form">
                <label className="paste-label">📥 Paste VTOP Timetable Text Here</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste the copied text from VTOP here...\nExample: A11-MAT2002-LT-AB-127-FS B11-CHY1005-LTP-AB-531-FS C11-CSE2001-LTP-LC-207-FS...`}
                  required
                  className="timetable-textarea"
                />
                <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }}>🔍 Parse &amp; Load Timetable</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {timetable.length > 0 && (
        <div className="reupload-strip glass-panel">
          <span className="reupload-strip-label">✅ Timetable loaded — {timetable.length} slots active</span>
          <button
            type="button"
            className="btn-secondary reupload-btn"
            onClick={() => setShowReupload(v => !v)}
          >
            {showReupload ? '✕ Cancel' : '🔄 Re-upload Timetable'}
          </button>
        </div>
      )}

      {timetable.length > 0 && showReupload && (
        <div className="glass-panel tool-card reupload-form-panel">
          <form onSubmit={handleTextParseSubmit} className="vtop-paste-form">
            <label className="paste-label">📥 Paste Updated VTOP Timetable Text</label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Paste the copied text from VTOP here...\nExample: A11-MAT2002-LT-AB-127-FS B11-CHY1005-LTP-AB-531-FS...`}
              required
              className="timetable-textarea"
            />
            <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }}>🔍 Parse &amp; Update Timetable</button>
          </form>
        </div>
      )}

      <div className="timetable-actions-bar">
        <button type="button" className="btn-secondary" onClick={handleClear} disabled={timetable.length === 0}>
          🗑️ Clear Schedule
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          💾 Save Timetable
        </button>
      </div>

      <div className="glass-panel grid-view-panel desktop-only">
        <h3>📅 Weekly Schedule Grid</h3>
        <div className="table-responsive-container">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th>Day</th>
                {TIMESLOTS.map((timeslot, idx) => (
                  <th key={idx} className={timeslot.isLunch ? 'lunch-column-header' : ''}>
                    {timeslot.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((dayName, dayIdx) => (
                <tr key={dayIdx}>
                  <td className="day-name-cell">{dayName.substring(0, 3).toUpperCase()}</td>
                  {(() => {
                    let normalSlotCount = 0;
                    return TIMESLOTS.map((timeslot, slotIdx) => {
                      if (timeslot.isLunch) {
                        return <td key={slotIdx} className="lunch-cell">LUNCH BREAK</td>;
                      }
                      
                      const cellInfo = getCellClass(dayIdx, normalSlotCount);
                      normalSlotCount++;
                      
                      if (!cellInfo) {
                        return <td key={slotIdx} className="empty-cell">-</td>;
                      }

                      const { slotCode, classEntry } = cellInfo;

                      if (classEntry) {
                        return (
                          <td key={slotIdx} className="class-cell active">
                            <div className="class-cell-content">
                              <span className="cell-slot">{slotCode}</span>
                              <strong className="cell-course">{classEntry.courseCode}</strong>
                              <span className="cell-room">{classEntry.room}</span>
                              <span className="cell-type">{classEntry.type}</span>
                              <button 
                                type="button"
                                className="delete-class-btn" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteClass(slotCode); }}
                                title="Remove Class"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td 
                          key={slotIdx} 
                          className="class-cell empty"
                          onClick={() => handleOpenAddModal(slotCode)}
                          title={`Click to add class in slot ${slotCode}`}
                        >
                          <div className="add-class-placeholder">
                            <span>{slotCode}</span>
                            <span className="add-plus">+ Add</span>
                          </div>
                        </td>
                      );
                    });
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel mobile-only mobile-view-panel">
        <h3>📅 Daily Classes</h3>
        
        <div className="mobile-day-selector">
          {DAYS.map((dayName, dayIdx) => (
            <button
              type="button"
              key={dayIdx}
              className={`day-tab-btn ${mobileDayTab === dayIdx + 1 ? 'active' : ''}`}
              onClick={() => setMobileDayTab(dayIdx + 1)}
            >
              {dayName.substring(0, 3)}
            </button>
          ))}
        </div>

        <div className="mobile-classes-list">
          {mobileDayClasses.length === 0 ? (
            <div className="empty-state mobile-empty">
              <span style={{ fontSize: '2.5rem' }}>🌴</span>
              <p>No classes scheduled for this day!</p>
            </div>
          ) : (
            mobileDayClasses.map((c, idx) => (
              <div key={idx} className="mobile-class-card glass-panel">
                <div className="mobile-card-left">
                  <span className="mobile-class-time">🕒 {c.start} - {c.end}</span>
                  <strong className="mobile-class-course">{c.courseCode} ({c.type})</strong>
                  <span className="mobile-class-room">📍 Room: {c.room}</span>
                </div>
                <div className="mobile-card-right">
                  <span className="mobile-class-slot">{c.slot}</span>
                  <button 
                    type="button"
                    className="mobile-delete-btn" 
                    onClick={() => handleDeleteClass(c.slot)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-content" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-class-heading"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="add-class-heading">➕ Add Class for Slot {newSlot}</h2>
            <form onSubmit={handleAddClassSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="new-course-code">Course Code</label>
                <input 
                  id="new-course-code"
                  type="text" 
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="e.g. MAT2002"
                  required
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-room-number">Classroom/Room Number</label>
                <input 
                  id="new-room-number"
                  type="text" 
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="e.g. AB-127"
                  maxLength={12}
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-class-type">Class Type</label>
                <select id="new-class-type" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="LT">Lecture (Theory)</option>
                  <option value="LTP">Lecture + Tutorial + Practical</option>
                  <option value="LP">Lab Practical</option>
                  <option value="T">Tutorial</option>
                </select>
              </div>

              <div className="modal-buttons" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

