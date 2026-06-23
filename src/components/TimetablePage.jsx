import { useState, useEffect } from 'react';
import './TimetablePage.css';

const SLOT_MAPPING = {
  A11: { day: 1, start: '08:30', end: '10:00' },
  B11: { day: 1, start: '10:05', end: '11:35' },
  C11: { day: 1, start: '11:40', end: '13:10' },
  A21: { day: 1, start: '13:15', end: '14:45' },
  A14: { day: 1, start: '14:50', end: '16:20' },
  B21: { day: 1, start: '16:25', end: '17:55' },
  C21: { day: 1, start: '18:00', end: '19:30' },

  D11: { day: 2, start: '08:30', end: '10:00' },
  E11: { day: 2, start: '10:05', end: '11:35' },
  F11: { day: 2, start: '11:40', end: '13:10' },
  D21: { day: 2, start: '13:15', end: '14:45' },
  E14: { day: 2, start: '14:50', end: '16:20' },
  E21: { day: 2, start: '16:25', end: '17:55' },
  F21: { day: 2, start: '18:00', end: '19:30' },

  A12: { day: 3, start: '08:30', end: '10:00' },
  B12: { day: 3, start: '10:05', end: '11:35' },
  C12: { day: 3, start: '11:40', end: '13:10' },
  A22: { day: 3, start: '13:15', end: '14:45' },
  B14: { day: 3, start: '14:50', end: '16:20' },
  B22: { day: 3, start: '16:25', end: '17:55' },
  A24: { day: 3, start: '18:00', end: '19:30' },

  D12: { day: 4, start: '08:30', end: '10:00' },
  E12: { day: 4, start: '10:05', end: '11:35' },
  F12: { day: 4, start: '11:40', end: '13:10' },
  D22: { day: 4, start: '13:15', end: '14:45' },
  F14: { day: 4, start: '14:50', end: '16:20' },
  E22: { day: 4, start: '16:25', end: '17:55' },
  F22: { day: 4, start: '18:00', end: '19:30' },

  A13: { day: 5, start: '08:30', end: '10:00' },
  B13: { day: 5, start: '10:05', end: '11:35' },
  C13: { day: 5, start: '11:40', end: '13:10' },
  A23: { day: 5, start: '13:15', end: '14:45' },
  C14: { day: 5, start: '14:50', end: '16:20' },
  B23: { day: 5, start: '16:25', end: '17:55' },
  B24: { day: 5, start: '18:00', end: '19:30' },

  D13: { day: 6, start: '08:30', end: '10:00' },
  E13: { day: 6, start: '10:05', end: '11:35' },
  F13: { day: 6, start: '11:40', end: '13:10' },
  D23: { day: 6, start: '13:15', end: '14:45' },
  D14: { day: 6, start: '14:50', end: '16:20' },
  D24: { day: 6, start: '16:25', end: '17:55' },
  E23: { day: 6, start: '18:00', end: '19:30' }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMESLOTS = [
  { label: '08:30 - 10:00', slotIndex: 0 },
  { label: '10:05 - 11:35', slotIndex: 1 },
  { label: '11:40 - 13:10', slotIndex: 2 },
  { label: 'Lunch Break', isLunch: true },
  { label: '13:15 - 14:45', slotIndex: 3 },
  { label: '14:50 - 16:20', slotIndex: 4 },
  { label: '16:25 - 17:55', slotIndex: 5 },
  { label: '18:00 - 19:30', slotIndex: 6 }
];

export default function TimetablePage({ user, onUpdateTimetable, syncStatus = 'synced' }) {
  const [timetable, setTimetable] = useState(user.timetable || []);
  const [pastedText, setPastedText] = useState('');
  const [mobileDayTab, setMobileDayTab] = useState(1); // 1 = Monday
  const [showReupload, setShowReupload] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Manual Add Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newType, setNewType] = useState('LT');
  const [newRoom, setNewRoom] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimetable(user.timetable || []);
  }, [user.timetable]);



  const parseOcrText = (text) => {
    // 1. Convert to uppercase
    let normalized = text.toUpperCase();

    // 2. Normalize course codes: e.g. MAT2OO2 -> MAT-2002, CHYlOO5 -> CHY-1005, UHVOOO2 -> UHV-0002
    // We match 3-4 letters, followed by optional spaces/hyphens, followed by 4 characters of digits/lookalikes
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

    // 3. Normalize slot codes: e.g. All -> A11, Bll -> B11, E2l -> E21, F1A -> F14
    // We match slot letter [A-F], followed by two digits/lookalikes
    normalized = normalized.replace(/\b([A-F])([0-9OIL|I!Z])([0-9OIL|I!ZEAH])\b/g, (match, letter, d1, d2) => {
      let normD1 = d1;
      let normD2 = d2;
      
      if ('1IL!|'.includes(normD1) || normD1 === 'l') normD1 = '1';
      else if ('2Z'.includes(normD1)) normD1 = '2';
      else return match; // not a valid first slot digit, keep original
      
      if ('1IL!|'.includes(normD2) || normD2 === 'l') normD2 = '1';
      else if ('2Z'.includes(normD2)) normD2 = '2';
      else if ('3E'.includes(normD2)) normD2 = '3';
      else if ('4AH'.includes(normD2)) normD2 = '4';
      else return match; // not a valid second slot digit, keep original
      
      return letter + normD1 + normD2;
    });

    // 4. Pattern matching for complete entries like A11-MAT-2002-LT-AB-127-FS or A11-MAT-2002-LT-AB127
    const pattern = /\b([A-F][12][1-4])[\s-]*([A-Z]{3,4})[\s-]*(\d{4})(?:[\s-]*(LTP|LT|LP|L|P|T))?(?:[\s-]*([A-Z]{2,3})[\s-]*(\d{3}))?/g;
    
    const parsedEntries = [];
    let match;
    
    while ((match = pattern.exec(normalized)) !== null) {
      const slot = match[1];
      const courseCode = `${match[2]}${match[3]}`;
      const type = match[4] || 'LT';
      const room = match[5] && match[6] ? `${match[5]}-${match[6]}` : '';
      
      parsedEntries.push({ slot, courseCode, type, room });
    }
    
    // 5. Proximity matching fallback
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
          // Look for room number in a search window
          const searchWindow = normalized.substring(
            Math.max(0, Math.min(s.index, nearestCourse.index) - 10), 
            Math.min(normalized.length, Math.max(s.index, nearestCourse.index) + 40)
          );
          const roomMatch = /(AB|AR|LC|CR)[\s-]*\d{3}/.exec(searchWindow);
          const room = roomMatch ? roomMatch[0].replace(/\s/g, '-') : '';
          
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
      const uniqueMap = {};
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
  };

  const handleTextParseSubmit = (e) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    parseOcrText(pastedText);
    setPastedText('');
    setShowReupload(false); // auto-collapse re-upload panel after parse
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

  const handleDeleteClass = (slot) => {
    const filtered = timetable.filter(c => c.slot !== slot);
    setTimetable(filtered);
    onUpdateTimetable(filtered);
  };

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

    const updated = timetable.filter(c => c.slot !== newSlot);
    updated.push(entry);
    
    setTimetable(updated);
    onUpdateTimetable(updated);
    setShowAddModal(false);
  };

  // Helper to match day and timeslot to a cell in the grid
  const getCellClass = (dayIndex, slotIndex) => {
    // Find the slot code corresponding to this day and timeslot index
    const slotCode = Object.keys(SLOT_MAPPING).find(key => {
      const mapping = SLOT_MAPPING[key];
      // DAYS are Monday (1) to Saturday (6). slotIndex is 0 to 6 (skipping lunch)
      if (mapping.day === dayIndex + 1) {
        const timeslot = TIMESLOTS.filter(t => !t.isLunch)[slotIndex];
        return mapping.start === timeslot.label.split(' - ')[0];
      }
      return false;
    });

    if (!slotCode) return null;

    const classEntry = timetable.find(c => c.slot === slotCode);
    return {
      slotCode,
      classEntry
    };
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
        {/* Sync status pill — only show when not cleanly synced */}
        {syncStatus !== 'synced' && (
          <div className={`sync-pill ${sc.cls}`}>
            <span className="sync-pill-icon">{sc.icon}</span>
            <span>{sc.label}</span>
          </div>
        )}
      </div>

      {/* Subtitle adapts based on whether timetable exists */}

      {/* FIRST-TIME: Full guide + paste form (hidden once timetable loaded) */}
      {timetable.length === 0 && (
        <div className="timetable-tools-grid timetable-single-col">
          <div className="glass-panel tool-card tool-card-wide">
            <h3>📋 How to Copy Your Timetable from VTOP</h3>
            <div className="vtop-guide-layout">
              {/* Guide image */}
              <div className="vtop-guide-image-wrap">
                <div className="vtop-guide-img-container">
                  <img
                    src="/vtop-timetable-guide.png"
                    alt="Your VTOP timetable – select all text from this page"
                    className="vtop-guide-img"
                  />
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

              {/* Paste form */}
              <form onSubmit={handleTextParseSubmit} className="vtop-paste-form">
                <label className="paste-label">📥 Paste VTOP Timetable Text Here</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste the copied text from VTOP here...
Example: A11-MAT2002-LT-AB-127-FS B11-CHY1005-LTP-AB-531-FS C11-CSE2001-LTP-LC-207-FS...`}
                  required
                  className="timetable-textarea"
                />
                <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }}>🔍 Parse &amp; Load Timetable</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RETURNING USER: Compact re-upload strip (shown once timetable exists) */}
      {timetable.length > 0 && (
        <div className="reupload-strip glass-panel">
          <span className="reupload-strip-label">✅ Timetable loaded — {timetable.length} slots active</span>
          <button
            className="btn-secondary reupload-btn"
            onClick={() => setShowReupload(v => !v)}
          >
            {showReupload ? '✕ Cancel' : '🔄 Re-upload Timetable'}
          </button>
        </div>
      )}

      {/* Inline re-upload form (only visible when user clicks Re-upload) */}
      {timetable.length > 0 && showReupload && (
        <div className="glass-panel tool-card reupload-form-panel">
          <form onSubmit={handleTextParseSubmit} className="vtop-paste-form">
            <label className="paste-label">📥 Paste Updated VTOP Timetable Text</label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Paste the copied text from VTOP here...
Example: A11-MAT2002-LT-AB-127-FS B11-CHY1005-LTP-AB-531-FS...`}
              required
              className="timetable-textarea"
            />
            <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }}>🔍 Parse &amp; Update Timetable</button>
          </form>
        </div>
      )}

      {/* Control Buttons */}
      <div className="timetable-actions-bar">
        <button className="btn-secondary" onClick={handleClear} disabled={timetable.length === 0}>
          🗑️ Clear Schedule
        </button>
        <button className="btn-primary" onClick={handleSave}>
          💾 Save Timetable
        </button>
      </div>

      {/* Desktop Grid View */}
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

      {/* Mobile Day-by-Day View */}
      <div className="glass-panel mobile-only mobile-view-panel">
        <h3>📅 Daily Classes</h3>
        
        {/* Day switch bar */}
        <div className="mobile-day-selector">
          {DAYS.map((dayName, dayIdx) => (
            <button
              key={dayIdx}
              className={`day-tab-btn ${mobileDayTab === dayIdx + 1 ? 'active' : ''}`}
              onClick={() => setMobileDayTab(dayIdx + 1)}
            >
              {dayName.substring(0, 3)}
            </button>
          ))}
        </div>

        {/* Classes list for selected day */}
        <div className="mobile-classes-list">
          {(() => {
            const dayClasses = timetable
              .map(c => {
                const slotInfo = SLOT_MAPPING[c.slot];
                if (slotInfo && slotInfo.day === mobileDayTab) {
                  return { ...c, start: slotInfo.start, end: slotInfo.end };
                }
                return null;
              })
              .filter(Boolean)
              .sort((a, b) => a.start.localeCompare(b.start));

            if (dayClasses.length === 0) {
              return (
                <div className="empty-state mobile-empty">
                  <span style={{ fontSize: '2.5rem' }}>🌴</span>
                  <p>No classes scheduled for this day!</p>
                </div>
              );
            }

            return dayClasses.map((c, idx) => (
              <div key={idx} className="mobile-class-card glass-panel">
                <div className="mobile-card-left">
                  <span className="mobile-class-time">🕒 {c.start} - {c.end}</span>
                  <strong className="mobile-class-course">{c.courseCode} ({c.type})</strong>
                  <span className="mobile-class-room">📍 Room: {c.room}</span>
                </div>
                <div className="mobile-card-right">
                  <span className="mobile-class-slot">{c.slot}</span>
                  <button 
                    className="mobile-delete-btn" 
                    onClick={() => handleDeleteClass(c.slot)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Add Class Modal Form */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>➕ Add Class for Slot {newSlot}</h2>
            <form onSubmit={handleAddClassSubmit} className="modal-form">
              <div className="form-group">
                <label>Course Code</label>
                <input 
                  type="text" 
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="e.g. MAT2002"
                  required
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label>Classroom/Room Number</label>
                <input 
                  type="text" 
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="e.g. AB-127"
                  maxLength={12}
                />
              </div>

              <div className="form-group">
                <label>Class Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
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
