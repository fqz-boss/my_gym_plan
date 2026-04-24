/**
 * 按动作名解析图标路径；风格统一的本地 SVG，未知时走 default
 * 支持默认计划全名 + 用户改名后的关键词回退
 */

const DIR = '/images/exercises';

const EXACT = {
  平板杠铃卧推: 'bench-barbell',
  上斜哑铃卧推: 'incline-dumbbell',
  坐姿哑铃肩推: 'shoulder-press',
  双杠臂屈伸: 'dip',
  绳索侧平举: 'lateral-raise',
  绳索面拉: 'face-pull',
  正握绳索下压: 'pushdown',
  传统硬拉: 'deadlift',
  宽握高位下拉: 'pulldown',
  俯身杠铃划船: 'barbell-row',
  宽握坐姿绳索划船: 'cable-row',
  '辅助/自重引体向上': 'pullup',
  哑铃锤式弯举: 'hammer-curl',
  牧师凳杠铃弯举: 'preacher-curl',
  杠铃颈后深蹲: 'squat',
  /** 繁体 / 手误常见写法，防 EXACT 未命中时落到错误关键词上 */
  槓鈴頸後深蹲: 'squat',
  杠鈴頸后深蹲: 'squat',
  杠鈴頸後深蹲: 'squat',
  槓鈴頸后深蹲: 'squat',
  保加利亚单腿蹲: 'bulgarian-split',
  坐姿腿屈伸: 'leg-extension',
  俯卧腿弯举: 'leg-curl',
  站姿提踵: 'calf-raise',
  核心收尾: 'core',
};

/** [regex, key] 自前向后匹配，越具体的规则越靠前 */
const KEYWORD_RULES = [
  [/保加利亚|分腿蹲|单腿(?!机)|弓步蹲?/, 'bulgarian-split'],
  /** 杠/槓 + 铃/鈴，且带「颈/頸+后/後」的蹲（在「上斜」等前匹配） */
  [/(?:[杠槓][铃鈴]).*(?:[颈頸](?:[后後]))/, 'squat'],
  [/上斜.*(推|举)|上斜.*哑铃|哑铃.*上斜/, 'incline-dumbbell'],
  [/平板.*卧|平板.*推|杠铃.*卧|卧推|仰卧.*推/, 'bench-barbell'],
  [/坐.*推肩|肩推|推肩(?!面)|坐姿.*推/, 'shoulder-press'],
  [/双杠|臂屈伸|屈臂撑/, 'dip'],
  [/侧平举/, 'lateral-raise'],
  [/面拉/, 'face-pull'],
  [/下压|三头.*压/, 'pushdown'],
  [/硬拉|相扑拉/, 'deadlift'],
  [/高位下|宽握下|拉背.*下|下拉(?!体)/, 'pulldown'],
  [/俯身.*划|杠铃.*划|杠铃行/, 'barbell-row'],
  [/坐姿.*划|宽握坐.*划|缆.*划|器械.*划/, 'cable-row'],
  [/引体|窄握(?!下)/, 'pullup'],
  [/锤式|对握弯/, 'hammer-curl'],
  [/牧师|托臂|斜托/, 'preacher-curl'],
  [/深蹲|哈克|腿举(?!伸)/, 'squat'],
  [/腿屈伸|伸膝|踢腿$/, 'leg-extension'],
  [/俯卧腿|腘绳|腿弯举|勾腿/, 'leg-curl'],
  [/提踵|踮脚/, 'calf-raise'],
  [/核心|平板撑|举腿|卷腹|悬垂(?!下)/, 'core'],
];

function exerciseIconKey(name) {
  let s = String(name || '');
  s = s.replace(/[\u200b-\u200d\ufeff\u00a0]/g, '');
  s = s.replace(/\s+/g, '').trim();
  if (typeof s.normalize === 'function') s = s.normalize('NFC');
  if (!s) return 'default';
  if (EXACT[s]) return EXACT[s];
  for (let i = 0; i < KEYWORD_RULES.length; i += 1) {
    const re = KEYWORD_RULES[i][0];
    const key = KEYWORD_RULES[i][1];
    if (re.test(s)) return key;
  }
  return 'default';
}

function exerciseIconPath(name) {
  return `${DIR}/${exerciseIconKey(name)}.svg`;
}

/** 为计划对象每一动作挂上 icon 字段 */
function addIconsToPlan(plan) {
  if (!plan) return plan;
  const out = { ...plan };
  ['push', 'pull', 'leg'].forEach((d) => {
    const day = plan[d];
    if (!day || !day.exercises) {
      out[d] = day;
      return;
    }
    out[d] = {
      ...day,
      exercises: day.exercises.map((ex) => ({
        ...ex,
        icon: exerciseIconPath(ex.name),
      })),
    };
  });
  return out;
}

module.exports = {
  exerciseIconPath,
  exerciseIconKey,
  addIconsToPlan,
};
