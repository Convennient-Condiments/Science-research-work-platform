const db = require('./db');

function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isoTime(d) { return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function addDays(base, days) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }
function startOfWeek(base) { const d = new Date(base); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }
function startOfMonth(base) { return new Date(base.getFullYear(), base.getMonth(), 1); }
function monthLabel(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`; }

const DEFAULT_SETTINGS = {
  theme: 'blue',
  sidebar_collapsed: false,
  command_enabled: true,
  sedentary_enabled: true,
  sedentary_minutes: 60,
  alarms: [
    { label: '上午工作时段开始', time: '09:00' },
    { label: '下午工作时段开始', time: '14:00' },
    { label: '晚间复盘提醒', time: '21:30' }
  ],
  backup_interval_days: 3,
  backup_path: '',
  last_backup_at: null,
  innovation_keywords: ['deep learning', 'time series', 'computer vision', 'bioacoustics'],
  innovation_journals: ['Journal A', 'Journal B', 'Journal C'],
  innovation_auto_refresh: true,
  innovation_weekday: 1,
  innovation_hour: 8,
  innovation_daily_count: 5,
  innovation_fields: ['biology', 'medicine', 'materials', 'cross'],
  career_current_year: '博一',
  zotero: { enabled: false, api_key: '', user_id: '', collections: [] },
  zotero_download_pdfs: true,
  overleaf: { enabled: false, project_name: '', last_sync_at: null, token: '' },
  thesis_progress_manual: null,
  extension_hooks: { notion: false, shimo: false, cloud_backup: false }
};

const CAREER_ITEMS = [
  ['postdoc', '博一', '完成全部学位课程，达到学分与培养方案要求'],
  ['postdoc', '博一', '确定研究方向，搭建方法与实验基础'],
  ['postdoc', '博一', '建立文献阅读与笔记习惯'],
  ['postdoc', '博二', '完成开题报告并通过审核'],
  ['postdoc', '博二', '产出第一篇小论文或综述'],
  ['postdoc', '博二', '备考语言成绩（按目标要求）'],
  ['postdoc', '博三', '冲刺核心成果论文'],
  ['postdoc', '博三', '参加国际会议并做报告'],
  ['postdoc', '博三', '拓展学术合作与人脉'],
  ['postdoc', '博四', '累计高水平论文成果'],
  ['postdoc', '博四', '准备并提交奖学金 / 岗位申请'],
  ['postdoc', '博四', '打磨简历、研究陈述与推荐信'],
  ['postdoc', '博五', '完成学位论文答辩'],
  ['postdoc', '博五', '确认去向并办理相关手续'],
  ['industry', '博一', '掌握行业核心工具栈与技能清单'],
  ['industry', '博一', '调研目标行业与代表性企业方向'],
  ['industry', '博一', '让研究课题贴近产业实际需求'],
  ['industry', '博二', '参与产学研合作项目，积累工程经验'],
  ['industry', '博二', '尝试申请发明专利或软件著作权'],
  ['industry', '博二', '整理可落地的技术成果与案例'],
  ['industry', '博三', '进入目标企业研发岗实习'],
  ['industry', '博三', '参加行业会议，建立行业人脉'],
  ['industry', '博三', '优化简历，突出技术落地能力'],
  ['industry', '博四', '锁定目标岗位，针对性准备项目经历'],
  ['industry', '博四', '积累可展示的产业化成果'],
  ['industry', '博四', '参加秋招提前批，锁定保底机会'],
  ['industry', '博五', '完成毕业答辩'],
  ['industry', '博五', '办理入职，衔接研发岗位'],
  ['faculty', '博一', '确定长期稳定的研究方向'],
  ['faculty', '博一', '学习教学规范与基金申报基础知识'],
  ['faculty', '博一', '协助授课或助教，积累教学经历'],
  ['faculty', '博二', '启动 2-3 条并行研究子课题'],
  ['faculty', '博二', '积累首篇一作论文成果'],
  ['faculty', '博二', '参与科研项目的申报与执行'],
  ['faculty', '博三', '形成个人研究特色与成果体系'],
  ['faculty', '博三', '申报研究生创新项目'],
  ['faculty', '博三', '指导低年级学生，积累团队经验'],
  ['faculty', '博四', '冲刺高水平论文与学术影响力'],
  ['faculty', '博四', '规划博士后履历与学术网络'],
  ['faculty', '博四', '学习各类基金申报书的撰写技巧'],
  ['faculty', '博五', '完成答辩，投递高校与科研岗位'],
  ['faculty', '博五', '入职后启动基金申报与课题立项'],
  ['xuandiao', '博一', '了解目标地区选调政策与岗位要求'],
  ['xuandiao', '博一', '争取学生干部等组织经历'],
  ['xuandiao', '博一', '建立时政学习与素材积累习惯'],
  ['xuandiao', '博二', '按要求完成组织发展流程'],
  ['xuandiao', '博二', '争取校级荣誉与评优'],
  ['xuandiao', '博二', '参与基层实践与调研活动'],
  ['xuandiao', '博三', '完成组织身份相关流程（如适用）'],
  ['xuandiao', '博三', '系统学习笔试面试课程'],
  ['xuandiao', '博三', '研究历年岗位与分数数据'],
  ['xuandiao', '博四', '全力备考，参加模考训练'],
  ['xuandiao', '博四', '梳理个人履历亮点'],
  ['xuandiao', '博四', '准备结构化面试素材'],
  ['xuandiao', '博五', '以应届身份报名定向选调'],
  ['xuandiao', '博五', '完成笔试、面试、政审与体检'],
  ['graduate', '博一', '按培养方案推进课程与学分'],
  ['graduate', '博一', '确定课题方向并开启预实验'],
  ['graduate', '博一', '开始积累学术报告次数'],
  ['graduate', '博二', '稳定研究方法，产出初步数据'],
  ['graduate', '博二', '累计完成过半学术报告'],
  ['graduate', '博二', '提前梳理开题框架与文献综述'],
  ['graduate', '博三', '按时完成开题答辩'],
  ['graduate', '博三', '全力冲刺第一篇一作论文'],
  ['graduate', '博三', '完成全部学术报告并通过中期考核'],
  ['graduate', '博四', '满足毕业成果要求'],
  ['graduate', '博四', '完成学位论文初稿'],
  ['graduate', '博四', '完成查重与格式校对'],
  ['graduate', '博五', '完成预答辩、盲审与正式答辩'],
  ['graduate', '博五', '办结毕业与学位手续'],
  ['fixed', '每学年', '每年 1 篇成果输出（论文 / 专利 / 项目）'],
  ['fixed', '每学期', '完成 1 次学术报告'],
  ['fixed', '每月', '复盘工时、文献、里程碑并更新规划'],
  ['fixed', '每月', '持续提升核心研究技能'],
  ['fixed', '每季度', '更新赛道关键节点并调整优先级']
];

const CAREER_INFO_ITEMS = [
  { track: 'postdoc', category: '海外机会', title: '海外博士后奖学金申请窗口（示例）', source: '示例来源', url: '', date: '每年 3-8 月', importance: '高', status: 'unread', note: '示例：提前准备研究计划与推荐信' },
  { track: 'postdoc', category: '海外机会', title: '目标地区科研岗位动态（示例）', source: '示例来源', url: '', date: '滚动开放', importance: '中', status: 'unread', note: '' },
  { track: 'industry', category: '企业招聘', title: '目标行业头部企业秋招提前批（示例）', source: '示例来源', url: '', date: '每年 8-10 月', importance: '高', status: 'unread', note: '可在应用内添加你关注的企业' },
  { track: 'industry', category: '企业招聘', title: '产学研合作项目申报（示例）', source: '示例来源', url: '', date: '按批次发布', importance: '中', status: 'unread', note: '' },
  { track: 'faculty', category: '基金申报', title: '青年类科研基金申报（示例）', source: '示例来源', url: '', date: '每年 3 月', importance: '高', status: 'unread', note: '' },
  { track: 'faculty', category: '高校招聘', title: '高校特聘 / 师资博后招聘（示例）', source: '示例来源', url: '', date: '滚动发布', importance: '中', status: 'unread', note: '' },
  { track: 'xuandiao', category: '选调公告', title: '定向选调生招录公告（示例）', source: '示例来源', url: '', date: '每年 10-11 月', importance: '高', status: 'unread', note: '可在应用内添加目标地区公告链接' },
  { track: 'xuandiao', category: '时政', title: '季度时政要点学习（示例）', source: '示例来源', url: '', date: '时政积累', importance: '高', status: 'unread', note: '建议自行添加常用时政来源' },
  { track: 'graduate', category: '毕业节点', title: '开题与中期考核时间线（示例）', source: '示例来源', url: '', date: '入学后按培养方案', importance: '高', status: 'unread', note: '' },
  { track: 'graduate', category: '毕业节点', title: '学位论文查重、盲审与答辩流程（示例）', source: '示例来源', url: '', date: '答辩前 3 个月', importance: '高', status: 'unread', note: '' }
];

const QUARTERLY_INFO_POOL = {
  postdoc: [
    { category: '海外机会', title: '博士后奖学金申请窗口提醒', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '在设置中添加你关注的奖学金官网' },
    { category: '海外机会', title: '目标课题组岗位与基金动态', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '学术会议', title: '本领域会议与征稿清单', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' }
  ],
  industry: [
    { category: '企业招聘', title: '目标企业季度招聘动态', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '政策支持', title: '所在地区产业扶持政策更新', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' },
    { category: '技术趋势', title: '行业技术趋势与落地案例', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' }
  ],
  faculty: [
    { category: '基金申报', title: '基金申报季度准备清单', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '高校招聘', title: '高校教职与师资博后招聘动态', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' },
    { category: '学术影响力', title: '审稿与学术服务机会', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' }
  ],
  xuandiao: [
    { category: '时政', title: '季度时政热词与政策文件梳理', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '选调公告', title: '目标地区选调考情与岗位复盘', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '时政', title: '科技与产业政策专题', source: '自定义来源', url: '', date: '季度精选', importance: '中', note: '' }
  ],
  graduate: [
    { category: '毕业节点', title: '培养环节季度自查清单', source: '自定义来源', url: '', date: '季度精选', importance: '高', note: '核对学分、报告、开题与中期进度' },
    { category: '毕业节点', title: '论文进度季度里程碑复盘', source: '工作台数据', url: '', date: '季度精选', importance: '高', note: '' },
    { category: '能力提升', title: '核心技能季度学习目标', source: '学习资源', url: '', date: '季度精选', importance: '中', note: '' }
  ]
};

const CAREER_LABS = [
  { name: 'Example Bioacoustics Lab', institution: 'Example University', country: '海外', direction: '示例：声学监测与深度学习', homepage: '', email: '', status: '跟踪中', priority: '高', traits: '示例：偏好有建模与野外调查复合背景的学生', papers: '', last_paper_date: '', note: '示例条目，可替换为你的目标课题组' },
  { name: 'Demo Sensing Group', institution: 'Demo Institute', country: '海外', direction: '示例：传感与信号处理', homepage: '', email: '', status: '关注中', priority: '中', traits: '示例：重视动手能力与代码质量', papers: '', last_paper_date: '', note: '' },
  { name: 'Sample Conservation Lab', institution: 'Sample College', country: '海外', direction: '示例：保护生态学', homepage: '', email: '', status: '关注中', priority: '中', traits: '示例：看重长期野外投入与数据分析能力', papers: '', last_paper_date: '', note: '' },
  { name: 'Placeholder ML Lab', institution: 'Placeholder Institute', country: '海外', direction: '示例：机器学习系统', homepage: '', email: '', status: '关注中', priority: '低', traits: '示例：偏好系统工程能力强的学生', papers: '', last_paper_date: '', note: '' }
];

const CAREER_BOOKS = [
  { module: '基础夯实', title: '示例：学科经典教材 A', author: '示例作者', priority: '必读', stage: '博一', purpose: '打牢学科基础概念体系' },
  { module: '基础夯实', title: '示例：学科经典教材 B', author: '示例作者', priority: '必读', stage: '博一', purpose: '理解核心方法与原理' },
  { module: '基础夯实', title: '深度学习（花书）', author: 'Goodfellow 等', priority: '必读', stage: '博一', purpose: '神经网络与表征学习理论基础' },
  { module: '基础夯实', title: '动手学深度学习', author: '李沐 等', priority: '必读', stage: '博一', purpose: 'PyTorch 实战入门' },
  { module: '基础夯实', title: '利用 Python 进行数据分析', author: 'Wes McKinney', priority: '必读', stage: '博一', purpose: '数据清洗与特征工程' },
  { module: 'AI建模工程', title: 'Graph Neural Networks: Foundations, Frontiers and Applications', author: 'Springer', priority: '必读', stage: '博一~博二', purpose: '图结构数据建模' },
  { module: 'AI建模工程', title: 'Deep Learning for Molecules and Materials', author: 'Andrew D. White', priority: '精读', stage: '博一~博二', purpose: '科学与材料领域的深度学习' },
  { module: 'AI建模工程', title: 'PyTorch 官方教程（在线）', author: 'PyTorch', priority: '必读', stage: '博一~博二', purpose: '工程落地与最新 API' },
  { module: '科研软实力', title: 'How to Write and Publish a Scientific Paper', author: 'Robert A. Day', priority: '必读', stage: '全周期', purpose: '论文写作与发表流程' },
  { module: '科研软实力', title: 'The Craft of Research', author: 'Booth 等', priority: '必读', stage: '全周期', purpose: '研究问题与论证逻辑' },
  { module: '科研软实力', title: 'The Unwritten Rules of PhD Research', author: 'Petre & Rugg', priority: '必读', stage: '博一~博五', purpose: '博士生存规则与节奏管理' },
  { module: '科研软实力', title: 'How to Get a PhD', author: 'Phillips & Pugh', priority: '精读', stage: '博一~博五', purpose: '学位管理与按期毕业策略' },
  { module: '科研软实力', title: 'Grant Application Writer\'s Handbook', author: 'Liane Reif-Lehrer', priority: '精读', stage: '博三起', purpose: '基金申请书撰写逻辑' },
  { module: '发展路线专项', title: 'The Professor Is In', author: 'Karen Kelsky', priority: '精读', stage: '博三~博四', purpose: '教职与博后申请' },
  { module: '发展路线专项', title: 'Advice for a Young Investigator', author: 'Santiago Ramón y Cajal', priority: '必读', stage: '博三', purpose: '青年研究者成长思维' },
  { module: '发展路线专项', title: 'English for Academic Research: Writing Exercises', author: 'Adrian Wallwork', priority: '精读', stage: '博三~博四', purpose: '学术英语写作与套磁' },
  { module: '发展路线专项', title: 'Patent Strategy for Researchers and Research Managers', author: 'H. Jackson Knight', priority: '精读', stage: '博二~博三', purpose: '专利布局与成果转化' },
  { module: '发展路线专项', title: '公务员考试通用教材（示例）', author: '示例出版社', priority: '必读', stage: '博三~博四', purpose: '公共部门赛道笔试备考' },
  { module: '文社科', title: '思考，快与慢', author: '丹尼尔·卡尼曼', priority: '精读', stage: '全周期', purpose: '决策偏见与思维质量' },
  { module: '文社科', title: '活出生命的意义', author: '维克多·弗兰克尔', priority: '必读', stage: '全周期', purpose: '心理韧性与意义感' },
  { module: '文社科', title: '被讨厌的勇气', author: '岸见一郎 / 古贺史健', priority: '精读', stage: '全周期', purpose: '压力管理与人际边界' },
  { module: '文社科', title: '原则', author: '雷·达利欧', priority: '精读', stage: '全周期', purpose: '决策系统与长期规划' },
  { module: '文社科', title: '穷查理宝典', author: '查理·芒格', priority: '补充', stage: '全周期', purpose: '多元思维模型' },
  { module: '文社科', title: '政治学通识', author: '包刚升', priority: '补充', stage: '全周期', purpose: '政治学基础框架' },
  { module: '文社科', title: '人类简史', author: '尤瓦尔·赫拉利', priority: '补充', stage: '全周期', purpose: '宏观视野与表达素材' }
];

const BOOK_PUSH_POOL = [
  { module: '文社科', title: '思考，快与慢', author: '丹尼尔·卡尼曼', priority: '精读', stage: '全周期', purpose: '半年精推：决策与判断' },
  { module: '文社科', title: '活出生命的意义', author: '维克多·弗兰克尔', priority: '必读', stage: '全周期', purpose: '半年精推：心理韧性' },
  { module: '文社科', title: '被讨厌的勇气', author: '岸见一郎 / 古贺史健', priority: '精读', stage: '全周期', purpose: '半年精推：课题压力与人际边界' },
  { module: '文社科', title: '原则', author: '雷·达利欧', priority: '精读', stage: '全周期', purpose: '半年精推：决策系统' },
  { module: '文社科', title: '穷查理宝典', author: '查理·芒格', priority: '补充', stage: '全周期', purpose: '半年精推：多元思维模型' },
  { module: '文社科', title: '政治学通识', author: '包刚升', priority: '补充', stage: '全周期', purpose: '半年精推：政治学基础' },
  { module: '文社科', title: '置身事内：中国政府与经济发展', author: '兰小欢', priority: '精读', stage: '全周期', purpose: '半年精推：政府与产业理解' },
  { module: '文社科', title: '人类简史', author: '尤瓦尔·赫拉利', priority: '补充', stage: '全周期', purpose: '半年精推：宏观视野' }
];

const CAREER_INSPIRATIONS = [
  { date: '', title: '示例：把注意力机制迁移到信号分拣', content: '这是一条示例灵感：能否把注意力机制用于声纹片段的分拣？先在小数据集上验证可行性。', tags: '示例,AI建模' },
  { date: '', title: '示例随笔：汇报的结构感', content: '示例随笔：汇报先给主线问题，再给数据，最后给下一步决策点，条理会更清楚。', tags: '示例,科研软实力' }
];

function ensureSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (!db.get('SELECT 1 FROM settings WHERE key = ?', [key])) {
      db.setSetting(key, value);
    }
  }
}

function ensureCareerSeed() {
  const count = db.get('SELECT COUNT(*) AS c FROM career_plans').c;
  if (count > 0) return;
  for (const [track, year, title] of CAREER_ITEMS) {
    db.insertRow('career_plans', { track, year, title, done: 0, note: '' });
  }
}

function ensureInfoCycles() {
  if (db.get('SELECT 1 FROM settings WHERE key = ?', ['info_cycles'])) return;
  const now = Date.now();
  const cycles = {};
  for (const track of Object.keys(QUARTERLY_INFO_POOL)) {
    cycles[track] = { lastPush: new Date().toISOString(), nextPush: new Date(now + 90 * 86400000).toISOString(), count: 0 };
  }
  db.setSetting('info_cycles', cycles);
}

function ensureBookCycles() {
  if (db.get('SELECT 1 FROM settings WHERE key = ?', ['book_cycles'])) return;
  const now = Date.now();
  db.setSetting('book_cycles', { lastPush: new Date().toISOString(), nextPush: new Date(now + 180 * 86400000).toISOString(), count: 0 });
}

function ensureCareerExtras() {
  ensureInfoCycles();
  ensureBookCycles();
  if (db.get('SELECT COUNT(*) AS c FROM career_infos').c === 0) {
    for (const item of CAREER_INFO_ITEMS) {
      db.insertRow('career_infos', { ...item, key_points: '', insight: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }
  if (db.get('SELECT COUNT(*) AS c FROM career_nodes').c === 0) {
    const years = ['博一', '博二', '博三', '博四', '博五'];
    for (const track of ['postdoc', 'industry', 'faculty', 'xuandiao', 'graduate']) {
      for (const year of years) {
        const items = CAREER_ITEMS.filter(x => x[0] === track && x[1] === year);
        const keyNodes = items.map(x => x[2]).join('；');
        const goal = `${year}阶段目标：${keyNodes.slice(0, 64)}${keyNodes.length > 64 ? '…' : ''}`;
        db.insertRow('career_nodes', { track, phase: year, goal, key_nodes: keyNodes, status: 'todo', review: '', gap: '', adjusted: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
    }
  }
  if (db.get('SELECT COUNT(*) AS c FROM career_labs').c === 0) {
    for (const lab of CAREER_LABS) {
      db.insertRow('career_labs', { ...lab, papers: lab.papers || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }
  if (db.get('SELECT COUNT(*) AS c FROM career_books').c === 0) {
    for (const book of CAREER_BOOKS) {
      db.insertRow('career_books', { ...book, status: '未读', review: '', started_at: '', finished_at: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }
  if (db.get('SELECT COUNT(*) AS c FROM career_inspirations').c === 0) {
    for (const item of CAREER_INSPIRATIONS) {
      db.insertRow('career_inspirations', { ...item, images: [], date: item.date || iso(new Date()), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }
}

function seed() {
  if (db.getSetting('seeded', null)) return;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = startOfWeek(today);
  const monthStart = startOfMonth(today);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    db.setSetting(key, value);
  }

  const clockCats = ['实验操作', '文献阅读', '论文写作', '数据分析', '组会汇报'];
  const hoursByDay = [6.5, 7.2, 5.8, 8.0, 7.5, 3.2, 2.0, 7.8, 6.9, 8.2, 7.0, 6.4, 8.6, 5.2];
  for (let i = 13; i >= 0; i--) {
    const day = addDays(today, -i);
    if (day.getDay() === 0) continue;
    let startH = 9;
    let total = hoursByDay[13 - i];
    while (total > 0.4) {
      const cat = clockCats[Math.floor(Math.random() * clockCats.length)];
      const dur = Math.min(2.2, Math.max(0.6, total * (0.4 + Math.random() * 0.4)));
      total -= dur;
      const started = new Date(day);
      started.setHours(startH, Math.floor(Math.random() * 50) + 5, 0, 0);
      const ended = new Date(started.getTime() + dur * 3600 * 1000);
      startH += 3;
      db.insertRow('clock_records', { started_at: isoTime(started), ended_at: isoTime(ended), category: cat, note: '示例工作记录', source: 'manual' });
    }
  }

  db.insertRow('leave_records', { date: iso(addDays(today, -2)), type: '事假', reason: '示例：上午外出，下午恢复工作', start_time: '08:00', end_time: '13:30' });

  const tasks = [
    { title: '示例：整理实验数据并绘图', detail: '示例任务详情', date: iso(today), due_date: iso(today), status: 'doing', priority: '高', category: '实验', plan_type: 'day' },
    { title: '示例：精读两篇领域文献', detail: '示例任务详情', date: iso(today), due_date: iso(today), status: 'todo', priority: '中', category: '文献', plan_type: 'day' },
    { title: '示例：撰写引言段落', detail: '示例任务详情', date: iso(addDays(today, 1)), due_date: iso(addDays(today, 1)), status: 'todo', priority: '高', category: '写作', plan_type: 'day' },
    { title: '示例：准备组会汇报', detail: '示例任务详情', date: iso(addDays(today, 2)), due_date: iso(addDays(today, 2)), status: 'todo', priority: '高', category: '汇报', plan_type: 'day' },
    { title: '示例：检查投稿系统状态', detail: '示例任务详情', date: iso(today), due_date: iso(today), status: 'done', priority: '中', category: '投稿', plan_type: 'day' },
    { title: '示例：补充实验方案设计', detail: '示例任务详情', date: iso(monday), due_date: iso(addDays(monday, 2)), status: 'done', priority: '高', category: '实验', plan_type: 'week' },
    { title: '示例：更新文献综述', detail: '示例任务详情', date: iso(monday), due_date: iso(addDays(monday, 4)), status: 'doing', priority: '中', category: '文献', plan_type: 'week' },
    { title: '示例：修改返修稿', detail: '示例任务详情', date: iso(addDays(monday, 3)), due_date: iso(addDays(monday, 6)), status: 'todo', priority: '高', category: '写作', plan_type: 'week' },
    { title: '示例：核心数据集清洗', detail: '示例任务详情', date: iso(monthStart), due_date: iso(addDays(monthStart, 10)), status: 'done', priority: '高', category: '数据', plan_type: 'month' },
    { title: '示例：论文第三章初稿', detail: '示例任务详情', date: iso(addDays(monthStart, 5)), due_date: iso(addDays(monthStart, 24)), status: 'todo', priority: '高', category: '写作', plan_type: 'month' },
    { title: '示例：投稿第二篇论文', detail: '示例任务详情', date: iso(addDays(monthStart, 8)), due_date: iso(addDays(monthStart, 18)), status: 'todo', priority: '中', category: '投稿', plan_type: 'month' }
  ];
  tasks.forEach(t => db.insertRow('tasks', t));

  const milestonePresets = [
    { name: '开题论证', weight: 10, start: -300, end: -260, status: 'done', achievements: '示例：完成开题并通过论证' },
    { name: '方法体系搭建', weight: 15, start: -240, end: -150, status: 'done', achievements: '示例：完成核心方法搭建' },
    { name: '数据集建设', weight: 20, start: -140, end: -40, status: 'done', achievements: '示例：完成数据采集与清洗' },
    { name: '小论文投稿', weight: 15, start: -80, end: -10, status: 'doing', achievements: '', problems: '示例：等待外审意见' },
    { name: '论文录用', weight: 10, start: 20, end: 80, status: 'todo', achievements: '' },
    { name: '大论文初稿', weight: 20, start: 10, end: 200, status: 'doing', achievements: '示例：方法章节进行中' },
    { name: '预答辩与盲审', weight: 12, start: 220, end: 280, status: 'todo', achievements: '' },
    { name: '答辩定稿', weight: 8, start: 290, end: 330, status: 'todo', achievements: '' }
  ];
  milestonePresets.forEach((m, i) => {
    db.insertRow('milestones', { name: m.name, stage: m.name, planned_start: iso(addDays(today, m.start)), planned_end: iso(addDays(today, m.end)), completed_at: m.status === 'done' ? iso(addDays(today, m.end - 5)) : '', status: m.status, achievements: m.achievements || '', attachments: '', problems: m.problems || '', next_tasks: m.status === 'done' ? '示例：推进下一阶段' : '', weight: m.weight, sort_order: i + 1 });
  });

  const notes = [
    { type: '实验突破', stage: '数据集建设', content: '示例：第三组实验指标重复性良好' },
    { type: '思路迭代', stage: '小论文投稿', content: '示例：将对比实验调整为机制验证框架' },
    { type: '数据异常', stage: '数据集建设', content: '示例：某批次数据漂移，与预处理时长相关' },
    { type: '版本节点', stage: '大论文初稿', content: '示例：方法章节新增 1200 字' }
  ];
  notes.forEach((n, i) => db.insertRow('progress_notes', { milestone_id: null, date: iso(addDays(today, -i * 2 - 1)), type: n.type, content: n.content, stage: n.stage, source: 'manual' }));

  db.insertRow('weekly_reviews', { week_start: iso(monday), week_end: iso(addDays(monday, 6)), title: `本周科研复盘（示例）`, status: 'draft', content: JSON.stringify({ done: '', notDone: '', harvest: '', questions: '', nextPlan: '', literatureHarvest: '' }) });
  db.insertRow('monthly_reviews', { month: monthLabel(today), title: `${monthLabel(today)} 月度总结复盘（示例）`, status: 'draft', content: JSON.stringify({ goals: '', milestones: '', stats: '', bottlenecks: '', resources: '', nextMonth: '' }) });

  const submissions = [
    { title: '示例论文一：方法改进与验证', journal: '示例期刊 A', zone: '示例分区', status: '外审阶段', submitted_at: iso(addDays(today, -35)), reviewer_opinions: '示例意见：需补充对比实验', notes: '等待第二轮意见' },
    { title: '示例论文二：数据驱动分析', journal: '示例期刊 B', zone: '示例分区', status: '返修修改', submitted_at: iso(addDays(today, -70)), reviewer_opinions: '示例意见：大修', notes: '' },
    { title: '示例综述论文', journal: '示例期刊 C', zone: '示例分区', status: '待投稿', submitted_at: '', reviewer_opinions: '', notes: '' },
    { title: '示例会议论文', journal: '示例会议', zone: '会议', status: '录用', submitted_at: iso(addDays(today, -120)), reviewer_opinions: '', published_at: iso(addDays(today, -30)), notes: '' }
  ];
  submissions.forEach(s => db.insertRow('submissions', s));

  const literature = [
    { title: '示例文献：深度学习方法综述', authors: '示例作者', year: '2025', journal: '示例期刊', doi: '', url: '', tags: '示例,综述', status: 'read', source: 'local' },
    { title: '示例文献：时序信号建模', authors: '示例作者', year: '2025', journal: '示例期刊', doi: '', url: '', tags: '示例,建模', status: 'read', source: 'local' },
    { title: '示例文献：注意力机制应用', authors: '示例作者', year: '2026', journal: '示例期刊', doi: '', url: '', tags: '示例,注意力', status: 'read', source: 'zotero' },
    { title: '示例文献：小样本学习', authors: '示例作者', year: '2025', journal: '示例期刊', doi: '', url: '', tags: '示例,小样本', status: 'unread', source: 'zotero' },
    { title: '示例文献：自动数据清洗框架', authors: '示例作者', year: '2026', journal: '示例期刊', doi: '', url: '', tags: '示例,数据', status: 'unread', source: 'innovation' },
    { title: '示例文献：模型可解释性', authors: '示例作者', year: '2025', journal: '示例期刊', doi: '', url: '', tags: '示例,可解释性', status: 'read', source: 'local' }
  ];
  literature.forEach((l, i) => {
    const row = db.insertRow('literature', { ...l, favorite: i % 3 === 0 ? 1 : 0, added_at: iso(addDays(today, -i * 2 - 1)), pdf_path: '' });
    if (row.status === 'read') {
      db.insertRow('literature_notes', { literature_id: row.id, title: `${l.title} 精读笔记`, content: '示例笔记：记录方法亮点与可借鉴之处。', tags: l.tags, source: 'local', synced_zotero: 0 });
    }
  });

  const innovations = [
    { title: '示例精选：自适应数据增强新范式', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：提出自适应增强策略，提升小样本表现。', innovation_type: '方法创新', keywords: '示例', field: 'cross', status: 'unread' },
    { title: '示例精选：轻量级实时推理框架', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：端侧实时推理，工程价值突出。', innovation_type: '方法创新', keywords: '示例', field: 'materials', status: 'unread' },
    { title: '示例精选：无监督表征新方法', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：无监督表征对齐策略。', innovation_type: '机理创新', keywords: '示例', field: 'biology', status: 'read' },
    { title: '示例精选：多模态融合诊断', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：多模态融合提升鲁棒性。', innovation_type: '突破性实验结果', keywords: '示例', field: 'medicine', status: 'unread' },
    { title: '示例精选：闭环自动化实验平台', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：实验-建模-决策闭环。', innovation_type: '方法创新', keywords: '示例', field: 'cross', status: 'read' },
    { title: '示例精选：可解释性评估新指标', journal: '示例期刊', doi: '', url: '', highlight: '示例亮点：提出可解释性量化指标。', innovation_type: '机理创新', keywords: '示例', field: 'materials', status: 'read' }
  ];
  innovations.forEach((x, i) => db.insertRow('innovation_literature', { ...x, favorite: i % 3 === 0 ? 1 : 0, week: iso(monday), added_at: iso(addDays(today, -(i + 1))), pdf_path: '', note_content: '' }));

  const comms = [
    { date: iso(addDays(today, -6)), type: '线上沟通', summary: '示例：确认下一步实验方案', action_items: '示例：整理方案初稿' },
    { date: iso(addDays(today, -13)), type: '周组会', summary: '示例：汇报阶段进展', action_items: '示例：补充对比实验' },
    { date: iso(addDays(today, -20)), type: '邮件沟通', summary: '示例：确认投稿目标期刊', action_items: '示例：完成格式校对' }
  ];
  comms.forEach(c => db.insertRow('advisor_communications', c));
  const questions = [
    { title: '示例问题：实验设计是否需要补充对照组？', detail: '示例详情', status: '待咨询' },
    { title: '示例问题：论文结构如何调整？', detail: '示例详情', status: '待咨询' },
    { title: '示例问题：设备机时如何申请？', detail: '示例详情', status: '待咨询' }
  ];
  questions.forEach(q => db.insertRow('advisor_questions', { ...q, imported_to_review: 0 }));

  const drafts = [
    { type: '周组会', title: '周组会汇报草稿模板', content: '## 本周进展\n\n## 核心数据\n\n## 存在的问题\n\n## 下周计划\n' },
    { type: '月度汇报', title: '月度汇报草稿模板', content: '## 本月目标完成情况\n\n## 关键进展\n\n## 量化产出\n\n## 瓶颈与需求\n\n## 下月计划\n' },
    { type: '阶段性课题汇报', title: '阶段性课题汇报草稿模板', content: '## 课题背景\n\n## 已完成工作\n\n## 阶段性成果\n\n## 下一步规划\n' }
  ];
  drafts.forEach(d => db.insertRow('report_drafts', { ...d, updated_at: iso(today) }));

  for (let i = 0; i < 7; i++) {
    const day = addDays(today, -i);
    db.insertRow('health_records', { date: iso(day), sleep_hours: 6.5 + (i % 3) * 0.5, mood: 3 + (i % 3), stress: 2 + (i % 4), energy: 3 + (i % 2), exercise_minutes: i === 2 ? 35 : i === 5 ? 45 : 0, exercise_type: i === 2 ? '慢跑' : i === 5 ? '力量训练' : '', notes: '' });
    if (i < 6) {
      db.insertRow('english_records', { date: iso(day), words: 20 + i * 5, minutes: 15 + i * 3, note: '示例学习记录' });
    }
    db.insertRow('habits', { date: iso(day), type: i % 2 === 0 ? '作息' : '运动', value: 'done', note: '' });
  }
  db.insertRow('exam_plans', { name: '示例考试 A', exam_date: iso(addDays(today, 60)), daily_goal: 25, status: '备考中' });
  db.insertRow('exam_plans', { name: '示例考试 B', exam_date: iso(addDays(today, 120)), daily_goal: 15, status: '备考中' });

  const achievements = [
    { key: 'first_clock', title: '首次打卡', description: '完成第一次科研打卡', unlocked_at: iso(addDays(today, -120)), icon: 'clock' },
    { key: 'streak_7', title: '连续七天专注', description: '连续 7 天保持有效打卡', unlocked_at: iso(addDays(today, -45)), icon: 'flame' },
    { key: 'milestone_3', title: '里程碑通关 x3', description: '累计完成 3 个关键里程碑', unlocked_at: iso(addDays(today, -60)), icon: 'flag' },
    { key: 'submission_1', title: '首篇投稿', description: '完成第一篇论文投稿', unlocked_at: iso(addDays(today, -35)), icon: 'send' },
    { key: 'literature_10', title: '文献达人', description: '精读文献累计 10 篇', unlocked_at: iso(addDays(today, -20)), icon: 'book' },
    { key: 'health_7', title: '健康生活', description: '连续一周记录作息健康', unlocked_at: iso(addDays(today, -7)), icon: 'heart' }
  ];
  achievements.forEach(a => db.insertRow('achievements', a));

  ensureCareerSeed();
  ensureCareerExtras();
  db.setSetting('seeded', '1');
}

module.exports = { seed, ensureSettings, ensureCareerSeed, ensureCareerExtras, QUARTERLY_INFO_POOL, BOOK_PUSH_POOL };
