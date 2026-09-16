// Nymbis financial year runs 1 September - 31 August.
export const FY_START_MONTH = 9;

const MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function monthShortName(calMonth) {
  return MONTH_SHORT[calMonth];
}

// FY label such as "2025/26" for a given calendar year/month (month is 1-12).
export function fyLabel(year, month) {
  if (month >= FY_START_MONTH) {
    return `${year}/${pad2((year + 1) % 100)}`;
  }
  return `${year - 1}/${pad2(year % 100)}`;
}

export function fyLabelForKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return fyLabel(y, m);
}

// Calendar month order for a financial year: [9,10,11,12,1,2,3,4,5,6,7,8]
export function fyMonthOrder() {
  const order = [];
  for (let i = 0; i < 12; i++) {
    order.push(((FY_START_MONTH - 1 + i) % 12) + 1);
  }
  return order;
}

// All "YYYY-MM" month keys belonging to a given FY label, in FY order (Sep first).
export function monthKeysForFY(fyLabelStr) {
  const startYear = parseInt(fyLabelStr.split("/")[0], 10);
  return fyMonthOrder().map((m) => {
    const year = m >= FY_START_MONTH ? startYear : startYear + 1;
    return `${year}-${pad2(m)}`;
  });
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function currentFYLabel(date = new Date()) {
  return fyLabel(date.getFullYear(), date.getMonth() + 1);
}

export function nextFYLabel(fyLabelStr) {
  const startYear = parseInt(fyLabelStr.split("/")[0], 10);
  return `${startYear + 1}/${pad2((startYear + 2) % 100)}`;
}

export function monthKeyLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${monthShortName(m)} ${y}`;
}
