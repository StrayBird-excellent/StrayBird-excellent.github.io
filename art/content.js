/* ═══════════════════════════════════════════════════════════════════
   content.js — 这幅画里所有的字。

   这里刻意不写“我是谁、我做过什么”的清单式简历。
   每一段都是一幅小画：从一个具体的意象出发，最后落在一个人身上。

   想改就改这里。改完不用动别的文件。
   ═══════════════════════════════════════════════════════════════════ */

const CONTENT = {

  /* ── 题签 ── */
  name: "无人来处",
  motto: "somewhere the wind forgets",

  /* ── 竖排的两列字。第一列大，第二列让它稍微退后一点 ── */
  hero: ["风又起时", "我仍在路上"],

  hint: "停留片刻，它会向你展开",

  /* ── 长卷的章节 ──
     每章: { num, en, title, paras[] }
     paras 里的 "verse" 会用斜体、居中、更轻的墨色排。 */
  chapters: [
    {
      num: "一",
      en: "the name",
      title: "名字是借来的",
      paras: [
        { t: "verse", v: "O troupe of little vagrants of the world, leave your footprints in my words." },
        { t: "p", v: "泰戈尔写过一群流浪的鸟，它们在他句子边上落了一阵，然后又飞走了。" },
        { t: "p", v: "我也借了一个名字，落在屏幕的这一角。它不属于我，就像那只鸟不属于那首诗——只是路过的时候，恰好被人看见了。" },
        { t: "p", v: "离群不是被赶出来，是自己选的航线。比起一群鸟整整齐齐地过冬，我更想知道风从哪一头开始变冷。" }
      ]
    },
    {
      num: "二",
      en: "the river and the garden",
      title: "把一条河读完，需要四年",
      paras: [
        { t: "verse", v: "满纸荒唐言，一把辛酸泪。" },
        { t: "p", v: "我花了很多时间去读大观园。不是为了做完一个项目，而是想确认一件事：那些古人如何在一个园子里把人的一生认得那么清楚。" },
        { t: "p", v: "于是一座可以走进去的园子被搭了出来。一砖一瓦都是算出来的，一个都不能错——错一寸，她就不是那个她了。" },
        { t: "p", v: "这是我最偏心的东西。因为它耗掉的时间，刚好是我最能专心的时候。" }
      ]
    },
    {
      num: "三",
      en: "the light",
      title: "光是最不能撒谎的东西",
      paras: [
        { t: "p", v: "莫奈画过三十多遍同一座教堂，只为等光在石头上换了一种说法。" },
        { t: "p", v: "我好像有点懂他。一件事物长什么样，不取决于它，取决于此刻落在它身上的那个时辰。" },
        { t: "p", v: "所以这个页面里的天会变。清晨、正午、黄昏、夜里——你什么时候来，看到的就是什么时候。" }
      ]
    },
    {
      num: "四",
      en: "the machines",
      title: "写过一些会呼吸的东西",
      paras: [
        { t: "p", v: "我做过一只能记住人的聊天机器人，也调过一台在自己电脑里慢慢思考的模型。前者让我想知道“持续”是什么，后者让我想知道“理解”从哪一步开始。" },
        { t: "p", v: "它们大多没有名字，也不一定活得很久。但写它们的那些夜晚，我确实觉得有什么东西正在形成。" }
      ],
      /* 可选：作品条目。hover 展开，点标题可外链 */
      works: [
        {
          name: "大观园 · 红楼梦交互视觉书", en: "red mansion · visual book",
          desc: "120 回全文、2,755 段稳定锚点、3D 园林与大观园的视觉书，共用一套叙事索引。",
          detail: "读《红楼梦》最难的地方在于：从“葬花”这个词，你回不到那一回、那一段。所以我为每一段建了稳定锚点，让意象、人物、器物和原文可以互相跳转。",
          tags: ["Three.js", "Blender", "Vite"],
          link: "https://github.com/StrayBird-excellent"
        },
        {
          name: "RealLife · 住在 QQ 里的数字生命", en: "a life in a chat window",
          desc: "跨重启保留名字、状态与记忆的持久化运行时；每一层记忆都可被审计。",
          detail: "它不是在扮演“有意识”，它只是确实记得昨天说过什么。边界和记忆同样重要——所以我给记忆分了五层，有权威、也有生命周期。",
          tags: ["FastAPI", "SQLAlchemy", "NapCat"],
          link: "https://github.com/StrayBird-excellent/RealLife-XiaoWei"
        },
        {
          name: "PeopleValue · 劳动智援", en: "rights, made walkable",
          desc: "把劳动仲裁里说不清的步骤，拆成评估、测算、文书与流程导航。",
          detail: "最难的不是有没有道理，是不知道从哪儿说起、证据够不够、赔多少。它不替你做判断，只是先把路画出来。",
          tags: ["React", "TypeScript", "LangChain"],
          link: "https://github.com/StrayBird-excellent/PeopleRight"
        }
      ]
    },
    {
      num: "五",
      en: "this drawing",
      title: "这幅画是写给自己的",
      paras: [
        { t: "p", v: "页面里的每一笔都是随机长出来的。你来的时候，山可能比昨天高一点，雨也许多一阵。" },
        { t: "p", v: "如果有一天它不动了，那大概是因为我也停了。" }
      ]
    },
    {
      num: "终",
      en: "leave a trace",
      title: "如果这些字碰巧像你",
      paras: [
        { t: "p", v: "读完就够了。若还想说点什么，下面留了几处门。" }
      ],
      traces: [
        { label: "Email", note: "3190547317@qq.com", href: "mailto:3190547317@qq.com" },
        { label: "GitHub", note: "/StrayBird-excellent", href: "https://github.com/StrayBird-excellent" },
        { label: "QQ", note: "3190547317", href: null }
      ]
    }
  ],

  /* ── 页脚与版权 ── */
  sealText: "鸟",
  footer: "Made in a quiet room. © " + new Date().getFullYear()
};
