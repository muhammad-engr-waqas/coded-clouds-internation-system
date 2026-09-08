export const toDateOnly = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
};

export const daysBetween = (from, to, excludeWeekends = false) => {
  const start = new Date(from);
  const end = new Date(to);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0 = Sun, 6 = Sat
    if (!excludeWeekends || (day !== 0 && day !== 6)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export const currentMonthStr = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'
