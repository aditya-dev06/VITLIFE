export const SLOT_MAPPING = {
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

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TIMESLOTS = [
  { label: '08:30 - 10:00', slotIndex: 0 },
  { label: '10:05 - 11:35', slotIndex: 1 },
  { label: '11:40 - 13:10', slotIndex: 2 },
  { label: 'Lunch Break', isLunch: true },
  { label: '13:15 - 14:45', slotIndex: 3 },
  { label: '14:50 - 16:20', slotIndex: 4 },
  { label: '16:25 - 17:55', slotIndex: 5 },
  { label: '18:00 - 19:30', slotIndex: 6 }
];

// Fast slot math pre-calculations (computed ONCE at module load)
export const NON_LUNCH_TIMESLOTS = TIMESLOTS.filter(t => !t.isLunch);
export const GRID_SLOT_MAP = Array.from({ length: 6 }, (_, dayIdx) => {
  const dayNumber = dayIdx + 1;
  return NON_LUNCH_TIMESLOTS.map((slotObj) => {
    const startTime = slotObj.label.split(' - ')[0];
    const foundSlot = Object.keys(SLOT_MAPPING).find(key => {
      const m = SLOT_MAPPING[key];
      return m.day === dayNumber && m.start === startTime;
    });
    return foundSlot || null;
  });
});
