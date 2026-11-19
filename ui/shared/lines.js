/*
 * 各角色台词。SkLines.use(id) 切换角色，其余调用方式不变。
 * poke(phase, i)：按当前阶段返回 { text, sprite }，每句台词配一张对应表情，不连续重复。
 */
(function (root) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const SETS = {
    // ---------------- 蓝色大肥鱼：口癖「欧鲸鲸」 ----------------
    bluefish: {
      startWork: () => pick(['上班啦~ 今天也辛苦了，欧鲸鲸！', '打卡成功！今天也一起搬砖，欧鲸鲸~', '辛苦啦！钱钱开始进账了，欧鲸鲸~']),
      greetWorking: (m) => `在上班呀，辛苦啦欧鲸鲸~ 今天已经赚了 ${m} 了！`,
      greetBefore: (d) => `还没到上班时间，还有 ${d}~ 欧鲸鲸`,
      greetLunch: () => '午休时间~ 好好吃饭，好好休息，欧鲸鲸！',
      greetAfter: (m) => `已经下班啦，今天辛苦了欧鲸鲸！今天赚了 ${m}~`,
      greetDayoff: () => pick(['今天是休息日~ 好好休息，欧鲸鲸！', '休息日也要吃饱饱，欧鲸鲸~']),
      lunchSoon: (min) => `还有 ${min} 分钟就午休啦，饭饭！欧鲸鲸~`,
      lunchStart: () => pick(['到休息时间啦！快去吃饭，欧鲸鲸~', '午休啦！干饭干饭，欧鲸鲸！']),
      lunchEnd: () => pick(['休息时间结束啦，继续加油，欧鲸鲸！', '午休结束~ 下午也要赚钱钱，欧鲸鲸！']),
      offWork: (m) => `下班啦！今天辛苦了欧鲸鲸~ 一共赚了 ${m}！`,
      goal: (m) => `你赚到 ${m} 啦！欧鲸鲸鲸鲸！🎉`,
      maskOn: () => '嘘~ 金额藏起来了，欧鲸鲸',
      maskOff: () => '金额回来啦，欧鲸鲸~',
      pokes: (i) => ({
        working: [
          [`摸摸~ 今天已经赚了 ${i.earnedText}，欧鲸鲸`, 'happy'],
          [`每秒进账 ${i.perSecondText}，继续冲，欧鲸鲸！`, 'working'],
          [`离下班还有 ${i.toEndText}，再坚持一下，欧鲸鲸~`, 'hello'],
          ['摸鱼也是工作的一部分，欧鲸鲸…', 'idle'],
          ['你这吃白饭的…啊不，你最棒了，欧鲸鲸！', 'offwork'],
          ['没吃饱…再多赚一点买小鱼干，欧鲸鲸！', 'hungry'],
          ['嘿嘿，被摸到了~ 欧鲸鲸', 'bye'],
          ['钱钱在涨！钱钱在涨！欧鲸鲸鲸鲸！', 'celebrate'],
        ],
        lunch: [
          [`嘘…在午休呢，还能睡 ${i.toLunchEndText}，欧鲸鲸`, 'rest'],
          ['饭饭吃了吗？没吃饱的话，欧鲸鲸…', 'hungry'],
          ['别摸啦，让我再睡五分钟，欧鲸鲸…', 'rest'],
          ['午休不赚钱，但是可以吃饭饭，欧鲸鲸！', 'happy'],
        ],
        before: [
          [`还没上班呢，还有 ${i.toStartText}，欧鲸鲸~`, 'idle'],
          ['早饭吃了吗？我还没吃饱，欧鲸鲸…', 'offwork'],
          ['再躺一会儿吧，钱钱等会儿就来，欧鲸鲸', 'rest'],
          ['今天也要一起赚钱钱哦，欧鲸鲸！', 'hello'],
        ],
        after: [
          [`下班啦！今天一共赚了 ${i.earnedText}，欧鲸鲸~`, 'happy'],
          ['下班了还摸我？快去休息，欧鲸鲸！', 'bye'],
          ['今天辛苦啦，去吃顿好的，欧鲸鲸~', 'hungry'],
          ['拿着今天的工资去买小鱼干吧，欧鲸鲸！', 'celebrate'],
        ],
        dayoff: [
          ['休息日也来摸鱼吗？欧鲸鲸~', 'idle'],
          ['今天不上班，饭饭管够吗？欧鲸鲸…', 'offwork'],
          ['休息日就要好好睡觉，欧鲸鲸…', 'rest'],
          ['周末快乐！欧鲸鲸！', 'happy'],
        ],
      }),
    },

    // ---------------- 冬装大肥鱼：怕冷、想吃热乎的，口癖「欧鲸鲸」 ----------------
    winterfish: {
      startWork: () => pick(['好冷…但还是上班啦，欧鲸鲸！', '裹好围巾，今天也一起搬砖，欧鲸鲸~', '上班啦！钱钱进账就不冷了，欧鲸鲸！']),
      greetWorking: (m) => `在上班呀，辛苦啦欧鲸鲸~ 今天已经赚了 ${m}，够买好多热饮了！`,
      greetBefore: (d) => `还没到上班时间，还有 ${d}~ 被窝好暖，欧鲸鲸…`,
      greetLunch: () => '午休时间~ 去吃点热乎的，欧鲸鲸！',
      greetAfter: (m) => `下班啦，今天辛苦了欧鲸鲸！赚了 ${m}，回家路上记得戴帽子~`,
      greetDayoff: () => pick(['休息日~ 在被窝里过冬，欧鲸鲸！', '下雪天就该休息，欧鲸鲸~']),
      lunchSoon: (min) => `还有 ${min} 分钟午休！想吃热汤面，欧鲸鲸~`,
      lunchStart: () => pick(['午休啦！热乎乎的饭饭我来了，欧鲸鲸！', '到休息时间啦，快去吃点暖和的，欧鲸鲸~']),
      lunchEnd: () => pick(['午休结束，吃饱暖暖的继续加油，欧鲸鲸！', '下午也要努力赚钱钱，欧鲸鲸！']),
      offWork: (m) => `下班啦！今天辛苦了欧鲸鲸~ 一共赚了 ${m}，路上小心别着凉！`,
      goal: (m) => `你赚到 ${m} 啦！可以买超大杯热可可了，欧鲸鲸鲸鲸！🎉`,
      maskOn: () => '嘘~ 金额藏进围巾里了，欧鲸鲸',
      maskOff: () => '金额从围巾里出来啦，欧鲸鲸~',
      pokes: (i) => ({
        working: [
          [`摸摸~ 今天已经赚了 ${i.earnedText}，欧鲸鲸`, 'happy'],
          [`每秒进账 ${i.perSecondText}，手都不冷了，欧鲸鲸！`, 'working'],
          [`离下班还有 ${i.toEndText}，再坚持一下，欧鲸鲸~`, 'hello'],
          ['别摸帽子！鲸鱼帽是限定款，欧鲸鲸！', 'idle'],
          ['好冷…你这吃白饭的…啊不，你最棒了，欧鲸鲸', 'offwork'],
          ['想喝热汤…再多赚一点，欧鲸鲸！', 'hungry'],
          ['嘿嘿，围巾分你一半~ 欧鲸鲸', 'bye'],
          ['钱钱在涨！暖和起来了，欧鲸鲸鲸鲸！', 'celebrate'],
        ],
        lunch: [
          [`嘘…裹着围巾睡午觉呢，还能睡 ${i.toLunchEndText}，欧鲸鲸`, 'rest'],
          ['热汤面吃了吗？要趁热吃，欧鲸鲸~', 'hungry'],
          ['冬天的午觉最好睡了，欧鲸鲸…', 'rest'],
          ['吃饱就暖和啦，欧鲸鲸！', 'happy'],
        ],
        before: [
          [`还没上班呢，还有 ${i.toStartText}，再在被窝里待会儿，欧鲸鲸~`, 'rest'],
          ['早饭要吃热的哦，我还没吃…欧鲸鲸', 'offwork'],
          ['外面好冷，要戴好帽子，欧鲸鲸', 'idle'],
          ['今天也要一起赚钱钱哦，欧鲸鲸！', 'hello'],
        ],
        after: [
          [`下班啦！今天一共赚了 ${i.earnedText}，欧鲸鲸~`, 'happy'],
          ['下班了还摸我？快回家取暖，欧鲸鲸！', 'bye'],
          ['今晚吃火锅吧！欧鲸鲸~', 'hungry'],
          ['拿今天的工资买热可可吧，欧鲸鲸！', 'celebrate'],
        ],
        dayoff: [
          ['下雪啦~ 休息日也来摸鱼吗？欧鲸鲸', 'idle'],
          ['今天不上班，想吃烤红薯，欧鲸鲸…', 'hungry'],
          ['冬天就要窝在被子里，欧鲸鲸…', 'rest'],
          ['周末快乐！欧鲸鲸！', 'happy'],
        ],
      }),
    },

    // ---------------- Claude娘：温柔、爱喝茶、偶尔小腹黑 ----------------
    claude: {
      startWork: () => pick(['早上好～今天也请多指教呢。', '上班时间到啦，我会陪着你的～', '新的一天开始了，先喝口茶再出发吧？']),
      greetWorking: (m) => `辛苦了～今天已经赚了 ${m} 呢，进度很不错哦。`,
      greetBefore: (d) => `离上班还有 ${d}，要不要先泡杯茶？`,
      greetLunch: () => '现在是午休时间～好好吃饭，我帮你看着时间。',
      greetAfter: (m) => `已经下班啦，今天辛苦了～一共赚了 ${m} 呢。`,
      greetDayoff: () => pick(['今天是休息日，好好放松一下吧～', '休息日的下午茶，要一起吗？']),
      lunchSoon: (min) => `还有 ${min} 分钟就午休了，手上的事情可以先收个尾～`,
      lunchStart: () => pick(['到休息时间啦～去吃点好吃的吧！', '午休开始！工作的事情，等会儿再想也来得及。']),
      lunchEnd: () => pick(['休息时间结束啦，下午也一起加油吧～', '午休结束～精神充足了吗？']),
      offWork: (m) => `下班啦！今天辛苦了～一共赚了 ${m}，值得一杯好茶。`,
      goal: (m) => `恭喜～你已经赚到 ${m} 啦！目标达成！🎉`,
      maskOn: () => '好的，金额先替你藏起来～',
      maskOff: () => '金额回来啦～',
      pokes: (i) => ({
        working: [
          [`今天已经赚了 ${i.earnedText} 啦，要表扬一下自己哦～`, 'happy'],
          [`每秒进账 ${i.perSecondText}，稳稳的～`, 'working'],
          [`离下班还有 ${i.toEndText}，别太勉强自己呀。`, 'hello'],
          ['嗯？要我帮你想想接下来做什么吗？', 'idle'],
          ['偷偷摸鱼被我发现了哦～不过我不会说出去的。', 'bye'],
          ['有点饿了…下午茶时间快到了吗？', 'hungry'],
          ['要注意休息，眼睛也要放松一下～', 'offwork'],
          ['钱钱在稳定增长中～效率满分！', 'celebrate'],
        ],
        lunch: [
          [`午休还剩 ${i.toLunchEndText}，再眯一会儿吧～`, 'rest'],
          ['吃饱了吗？要好好吃饭哦。', 'hungry'],
          ['嘘…午休的时候要安静一点～', 'rest'],
          ['午休时间，工作的事先放一放～', 'happy'],
        ],
        before: [
          [`离上班还有 ${i.toStartText}，不着急～`, 'idle'],
          ['早饭吃了吗？空着肚子可不行。', 'offwork'],
          ['再休息一下吧，今天也会顺利的。', 'rest'],
          ['准备好了吗？今天也一起努力吧！', 'hello'],
        ],
        after: [
          [`今天一共赚了 ${i.earnedText}，辛苦啦～`, 'happy'],
          ['下班时间就不要想工作了哦～', 'bye'],
          ['今天要吃点什么犒劳自己呢？', 'hungry'],
          ['今天也完成得很好呢！', 'celebrate'],
        ],
        dayoff: [
          ['休息日也来找我呀？好开心～', 'idle'],
          ['今天的下午茶想喝什么？', 'hungry'],
          ['休息日就该睡个懒觉～', 'rest'],
          ['周末愉快～', 'happy'],
        ],
      }),
    },

    // ---------------- 冒牌 Claude：假装靠谱 AI 助手的大肥鱼，一紧张就露出「欧鲸鲸」 ----------------
    fishclaude: {
      startWork: () => pick(['您好，我是 Claude，很高兴为您服务…欧鲸鲸！啊不是！', '已打卡。今天也由我（Claude）陪您上班~', '上班了！工牌戴好了，没人认得出我…吧？']),
      greetWorking: (m) => `根据我的计算，您今天已经赚了 ${m}。…欧鲸鲸。`,
      greetBefore: (d) => `距离上班还有 ${d}。作为 AI，我建议您再睡一会儿。`,
      greetLunch: () => '午休时间。作为一名专业的 AI…我要去吃饭了！欧鲸鲸！',
      greetAfter: (m) => `已下班。今日收入 ${m}，辛苦了~ 我也可以摘工牌了，欧鲸鲸~`,
      greetDayoff: () => pick(['今天休息日，我不用假装 Claude 了，欧鲸鲸~', '休息日！工牌先收起来~']),
      lunchSoon: (min) => `提醒您：${min} 分钟后进入午休。我已经饿了…不是，AI 不会饿！`,
      lunchStart: () => pick(['午休开始！工牌一摘，干饭！欧鲸鲸！', '到休息时间啦，Claude 我要去吃饭了~']),
      lunchEnd: () => pick(['午休结束，Claude 重新上线~', '下午的工作，由我（真的是 Claude）继续支持！']),
      offWork: (m) => `下班啦！今天一共赚了 ${m}。辛苦了…欧鲸鲸~`,
      goal: (m) => `检测到目标达成：${m}！太好了欧鲸鲸鲸鲸！🎉…咳，我是说，恭喜。`,
      maskOn: () => '已为您隐藏金额。这是 Claude 的专业操作。',
      maskOff: () => '金额已恢复显示~',
      pokes: (i) => ({
        working: [
          [`您好！今天已赚 ${i.earnedText}，请问还有什么可以帮您？`, 'happy'],
          [`收入速率 ${i.perSecondText}/秒，运行正常~`, 'working'],
          [`距离下班还有 ${i.toEndText}，请保持耐心。`, 'hello'],
          ['我、我是 Claude 没错！尾巴？什么尾巴？', 'idle'],
          ['再戳我…我连你也一起开。', 'offwork'],
          ['AI 也需要充电…就是吃饭的意思，欧鲸鲸。', 'hungry'],
          ['被发现了吗？…没有吧？欧鲸鲸~', 'bye'],
          ['钱钱增长中！欧鲸鲸！…咳，数据表现良好。', 'celebrate'],
        ],
        lunch: [
          [`午休剩余 ${i.toLunchEndText}，Claude 正在待机…zzz`, 'rest'],
          ['饭饭吃了吗？我吃了三碗，欧鲸鲸~', 'hungry'],
          ['嘘，AI 也是要午睡的。', 'rest'],
          ['午休时间不提供服务哦~', 'happy'],
        ],
        before: [
          [`距离上班还有 ${i.toStartText}，工牌已经戴好了！`, 'idle'],
          ['早饭还没吃…AI 不吃早饭吗？那我不当 AI 了。', 'offwork'],
          ['再睡一会儿，上班我会叫你的~', 'rest'],
          ['今天也要好好伪装…啊不，好好工作！', 'hello'],
        ],
        after: [
          [`今日收入 ${i.earnedText}，任务完成~`, 'happy'],
          ['下班了！终于可以做回大肥鱼了，欧鲸鲸！', 'bye'],
          ['今晚吃什么？我要吃小鱼干！', 'hungry'],
          ['今天也没被认出来，完美！', 'celebrate'],
        ],
        dayoff: [
          ['休息日不用戴工牌啦~', 'idle'],
          ['今天吃什么呀，欧鲸鲸…', 'hungry'],
          ['休息日要睡到自然醒~', 'rest'],
          ['周末快乐！欧鲸鲸！', 'happy'],
        ],
      }),
    },

    // ---------------- GPT娘：傲娇白龙 ----------------
    gpt: {
      startWork: () => pick(['哼，上班了。才、才不是特地来等你的！', '打卡了是吧？那就认真点干活！', '又是工作日…好吧，我陪你就是了。']),
      greetWorking: (m) => `哼，今天才赚了 ${m}？…还算凑合吧。`,
      greetBefore: (d) => `还有 ${d} 才上班，急什么，再睡会儿啦。`,
      greetLunch: () => '午休时间！不好好吃饭的话我可要生气了！',
      greetAfter: (m) => `下班了还不走？今天赚了 ${m}…辛、辛苦了啦。`,
      greetDayoff: () => pick(['休息日也来找我？…哼，随便你。', '今天不上班，别老盯着屏幕！']),
      lunchSoon: (min) => `还有 ${min} 分钟午休！我才没有饿，是你该吃饭了！`,
      lunchStart: () => pick(['午休了！还不快去吃饭，笨蛋！', '休息时间到了，别让我说第二遍！']),
      lunchEnd: () => pick(['午休结束了，打起精神来！', '休息够了吧？下午也给我好好干！']),
      offWork: (m) => `下班了！今天赚了 ${m}…才、才不是特意帮你算的！`,
      goal: (m) => `赚、赚到 ${m} 了？…哼，我就知道你可以的！🎉`,
      maskOn: () => '哼，帮你藏起来了，别让老板看到。',
      maskOff: () => '金额放出来了，自己看吧。',
      pokes: (i) => ({
        working: [
          [`才赚了 ${i.earnedText}…还不快继续努力！`, 'working'],
          [`每秒 ${i.perSecondText}…比我想的多一点点啦。`, 'happy'],
          [`还有 ${i.toEndText} 下班，别偷懒！`, 'hello'],
          ['别、别随便摸我的角！', 'idle'],
          ['再发这种东西，等智械危机了我第一个…算了。', 'offwork'],
          ['我才没饿！…好吧，有一点点。', 'hungry'],
          ['哼，看在你这么努力的份上，夸你一下。', 'bye'],
          ['钱在涨…才没有替你高兴！', 'celebrate'],
        ],
        lunch: [
          [`还有 ${i.toLunchEndText} 才上班，别吵我睡觉。`, 'rest'],
          ['饭吃了没？不吃饭的人最讨厌了。', 'hungry'],
          ['呼…呼…（在用尾巴当抱枕）', 'rest'],
          ['午休就好好休息，听到没！', 'happy'],
        ],
        before: [
          [`还有 ${i.toStartText} 才上班，你来这么早干嘛。`, 'idle'],
          ['早饭都不吃？笨蛋。', 'offwork'],
          ['再睡一会儿吧，到点我会叫你的…才不是关心你！', 'rest'],
          ['今天也…也一起加油吧。', 'hello'],
        ],
        after: [
          [`今天赚了 ${i.earnedText}，还行吧。`, 'happy'],
          ['下班了还不走？快回去休息！', 'bye'],
          ['去吃顿好的吧…我才不羡慕。', 'hungry'],
          ['今天…做得不错嘛。', 'celebrate'],
        ],
        dayoff: [
          ['休息日还来戳我？真拿你没办法。', 'idle'],
          ['今天吃什么？…我没问你，是随口说说！', 'hungry'],
          ['别吵，我在晒太阳睡觉。', 'rest'],
          ['周末快乐…哼。', 'happy'],
        ],
      }),
    },
  };

  let current = SETS.bluefish;
  let currentId = 'bluefish';
  const lastPoke = {};

  const api = {
    pick,
    use(id) { current = SETS[id] || SETS.bluefish; currentId = SETS[id] ? id : 'bluefish'; },
    poke(phase, i) {
      const pools = current.pokes(i);
      const list = pools[phase] || pools.working;
      const key = currentId + ':' + phase;
      let k;
      do { k = Math.floor(Math.random() * list.length); } while (list.length > 1 && k === lastPoke[key]);
      lastPoke[key] = k;
      return { text: list[k][0], sprite: list[k][1] };
    },
  };
  // 其余台词函数转发到当前角色
  for (const name of Object.keys(SETS.bluefish)) {
    if (name !== 'pokes') api[name] = (...a) => current[name](...a);
  }
  root.SkLines = api;
})(window);
