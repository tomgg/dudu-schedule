const fs = require('fs');

// 课程表数据：[时间段, [周一,周二,周三,周四,周五,周六,周日]]
const schedule = [
  ['07:30-08:00', ['起床','起床','起床','起床','起床','起床','起床']],
  ['08:00-08:30', ['早饭','早饭','早饭','早饭','早饭','早饭','早饭']],
  ['08:30-09:00', ['洗漱','洗漱','洗漱','洗漱','洗漱','洗漱','洗漱']],
  ['09:00-09:30', ['伴鱼','伴鱼','伴鱼','伴鱼','伴鱼','Polly英语','伴鱼']],
  ['09:30-10:00', ['休息','休息','休息','休息','休息','休息','美术课']],
  ['10:00-10:30', ['动画片','动画片','动画片','动画片','动画片','伴鱼','美术课']],
  ['10:30-11:00', ['休息','休息','休息','休息','休息','休息','美术课']],
  ['11:00-11:30', ['绘本','绘本','绘本','绘本','绘本','动画片','美术课']],
  ['11:30-12:30', ['中饭','中饭','中饭','中饭','中饭','中饭','中饭']],
  ['12:30-14:30', ['午休','午休','午休','午休','午休','午休','午休']],
  ['14:30-15:30', ['下午茶','下午茶','下午茶','下午茶','下午茶','户外运动','钢琴课']],
  ['15:30-16:30', ['活动','练琴','活动','活动','活动','户外运动','休息']],
  ['16:30-17:30', ['活动','活动','篮球课','活动','篮球课','户外运动','跳绳']],
  ['17:30-18:30', ['晚饭','晚饭','晚饭','晚饭','晚饭','晚饭','晚饭']],
  ['18:30-19:00', ['散步','散步','散步','散步','散步','散步','散步']],
  ['19:00-19:30', ['活动','活动','活动','活动','活动','活动','活动']],
  ['19:30-20:00', ['休息','火花思维','休息','休息','休息','火花思维','动画片']],
  ['20:00-20:30', ['Polly英语','火花思维','Polly英语','休息','休息','火花思维','休息']],
  ['20:30-21:00', ['睡觉','睡觉','睡觉','睡觉','睡觉','睡觉','睡觉']],
];

// 合并相邻同名课程（如思维19:30-20:00 + 20:00-20:30 → 19:30-20:30）
// 先按天构建每天的时间线
const dayNames = ['周一','周二','周三','周四','周五','周六','周日'];
const rruleDays = ['MO','TU','WE','TH','FR','SA','SU'];

// 构建每天的合并课程表
const daySchedules = Array.from({length: 7}, () => []);
for (let d = 0; d < 7; d++) {
  for (const [timeStr, days] of schedule) {
    const name = days[d];
    const [start, end] = timeStr.split('-');
    const last = daySchedules[d][daySchedules[d].length - 1];
    if (last && last.name === name && last.end === start) {
      last.end = end;
    } else {
      daySchedules[d].push({ name, start, end });
    }
  }
}

// 按 (课程名+开始时间+结束时间) 分组，收集哪几天
const eventMap = new Map();
for (let d = 0; d < 7; d++) {
  for (const item of daySchedules[d]) {
    const key = `${item.name}|${item.start}|${item.end}`;
    if (!eventMap.has(key)) {
      eventMap.set(key, { name: item.name, start: item.start, end: item.end, days: [] });
    }
    eventMap.get(key).days.push(d);
  }
}

// 生成 ICS
// 起始日期：2026-07-06 周一
const baseDate = new Date(2026, 6, 6); // July 6, 2026 = Monday

function toICSTime(dayOffset, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '@dudu';
}

// 重要课程加提前5分钟提醒
const importantClasses = ['Polly英语','火花思维','钢琴课','篮球课','美术课','伴鱼','绘本','练琴','跳绳'];

let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DUDU//课程表//CN
CALSCALE:GREGORIAN
X-WR-CALNAME:DUDU课程表
X-WR-TIMEZONE:Asia/Shanghai
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
END:STANDARD
END:VTIMEZONE
`;

for (const [, ev] of eventMap) {
  const isImportant = importantClasses.some(c => ev.name.includes(c));
  // 用第一个出现的天作为 DTSTART
  const firstDay = ev.days[0];
  const dtstart = toICSTime(firstDay, ev.start);
  const dtend = toICSTime(firstDay, ev.end);
  const byDay = ev.days.map(d => rruleDays[d]).join(',');

  const emoji = {
    '起床': '⏰', '早饭': '🥛', '洗漱': '🪥', '伴鱼': '🐠', 'Polly英语': '🦜',
    '休息': '😌', '美术课': '🎨', '动画片': '📺', '绘本': '📚', '中饭': '🍚',
    '午休': '😴', '下午茶': '☕', '户外运动': '🛝', '钢琴课': '🎹', '活动': '🎠',
    '练琴': '🎹', '篮球课': '🏀', '跳绳': '🤸', '晚饭': '🍜', '散步': '🚶',
    '火花思维': '🧠', '睡觉': '😴',
  }[ev.name] || '📋';

  ics += `BEGIN:VEVENT
UID:${uid()}
DTSTART;TZID=Asia/Shanghai:${dtstart}
DTEND;TZID=Asia/Shanghai:${dtend}
RRULE:FREQ=WEEKLY;BYDAY=${byDay}
SUMMARY:${emoji} ${ev.name}
`;

  if (isImportant) {
    ics += `BEGIN:VALARM
TRIGGER:-PT5M
ACTION:DISPLAY
DESCRIPTION:${ev.name} 还有5分钟开始！
END:VALARM
`;
  }

  ics += `END:VEVENT
`;
}

ics += `END:VCALENDAR
`;

fs.writeFileSync('/Users/yunyi/Documents/DUDU/DUDU课程表.ics', ics, 'utf8');
console.log('Done! Events:', eventMap.size);

// 打印合并后的课程概览
for (const [, ev] of eventMap) {
  console.log(`${ev.start}-${ev.end} ${ev.name} [${ev.days.map(d=>dayNames[d]).join(',')}]`);
}
