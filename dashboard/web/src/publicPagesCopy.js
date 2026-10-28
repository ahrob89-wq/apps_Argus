export const publicPagesCopy = {
  en: {
    navigation: 'Main navigation',
    language: 'Language',
    home: 'Home',
    features: {
      eyebrow: 'ARGUS CAPABILITIES',
      title: 'Practical protection, explained clearly.',
      intro: 'Argus combines event monitoring, risk signals, and carefully scoped actions. Here is what the current bot implementation does—and where it deliberately leaves the decision to server staff.',
      label: 'Protection layers',
      sections: [
        {
          icon: 'shield',
          title: 'Anti-Nuke activity containment',
          description: 'Argus watches Discord audit-log events for rapid channel or role changes, member removals, and webhook creation.',
          points: [
            'Configurable thresholds and time windows, with owner and trusted-user exemptions.',
            'Monitor mode records and alerts without applying containment; enforce mode can remove manageable roles, quarantine or time out an actor, and escalate repeat breaches to a ban.',
            'Actions respect Discord role hierarchy and permissions. Argus reports when it cannot safely complete an action.'
          ],
          tag: 'Configured by server owners'
        },
        {
          icon: 'pulse',
          title: 'Raid-wave detection and emergency lockdown',
          description: 'Join velocity is measured over short windows. A watch threshold records a warning; a stronger threshold with suspicious-account signals creates a critical security event.',
          points: [
            'Default detection thresholds are 5 joins in 30 seconds for a watch and 10 joins in 15 seconds with at least half flagged as suspicious for raid mode.',
            'Raid detection alerts staff; it does not automatically lock channels or ban new members.',
            'Staff can deliberately start an emergency lockdown. Argus journals channel permission changes, pauses invites, raises verification, and supports recovery.'
          ],
          tag: 'Alert first, staff stay in control'
        },
        {
          icon: 'user',
          title: 'New-member risk review',
          description: 'A join score uses limited account signals: account age, a missing custom avatar, username patterns, and Discord’s rejoin flag.',
          points: [
            'Higher-risk joins can be placed in a configurable observation window (48 hours by default).',
            'Staff receive a risk breakdown and review actions; risk signals are not proof of misconduct and do not automatically ban a member.',
            'Optional button verification can update configured member roles. Strict role removal is an explicit server setting and preserves protected roles.'
          ],
          tag: 'Signals guide review; they are not a verdict'
        },
        {
          icon: 'link',
          title: 'Malicious-link checks',
          description: 'Argus checks up to 10 HTTP/HTTPS links in new or edited guild messages against its local blacklist and cached threat feed.',
          points: [
            'When configured, Google Safe Browsing can provide an additional reputation verdict.',
            'A confirmed malicious verdict triggers an attempt to delete that message and notify the configured security-log channel.',
            'Unavailable or inconclusive checks do not trigger moderation. Query strings, fragments, and URL credentials are removed before external lookup.'
          ],
          tag: 'No action on uncertain results'
        },
        {
          icon: 'backup',
          title: 'Server-structure backups and recovery',
          description: 'Backups contain server structure—not a copy of conversations or a member roster.',
          points: [
            'Snapshots can include server settings, roles, categories, channels, and permission overwrites.',
            'A dry-run comparison shows what would be added, changed, or removed before restoration.',
            'Restoration and deletion are owner-controlled and use confirmation safeguards; destructive removal requires explicit consent.'
          ],
          tag: 'Structure only'
        }
      ],
      noteTitle: 'Capabilities depend on setup',
      note: 'Protection modules may be disabled or require configuration. Automatic actions also depend on Argus having the required Discord permissions and a suitable role position. Review the server settings and test changes before relying on them.'
    },
    setup: {
      eyebrow: 'GETTING STARTED',
      title: 'From invite to a ready server, step by step.',
      intro: 'Add Argus, let a server administrator provision its private security workspace, then verify permissions before enabling the protections you need.',
      stepsLabel: 'Choose a setup step',
      selectedStepLabel: 'STEP',
      copyCommand: 'Copy command',
      copied: 'Copied',
      copySuccess: 'Command copied. Paste it into a Discord server channel.',
      copyError: 'Could not copy automatically. Select the command and copy it manually.',
      openImage: 'View image',
      steps: [
        {
          icon: 'invite',
          title: 'Invite Argus to your server',
          description: 'Use the official Discord authorization link and choose the server where you have permission to add apps.',
          detail: 'Only invite the bot to servers you administer. Discord may ask you to review the requested access before confirming.'
        },
        {
          icon: 'permissions',
          title: 'Check permissions and role order',
          description: 'Place the Argus bot role above the member and staff roles it needs to manage.',
          detail: 'Core permissions include View Audit Log, Manage Roles, Manage Channels, Moderate Members, Send Messages, and Embed Links. Kick/Ban and Manage Server are needed for the corresponding containment and lockdown actions. Grant only what you plan to use. The screenshot shows the roles created by setup; move the Argus bot role above roles it must manage.',
          images: [
            {
              src: '/setup-guide/setup-roles.png',
              alt: 'Discord server role list showing Quarantined, Verified, Unverified, Member, and Argus Admin.',
              caption: 'Roles prepared by Argus setup'
            }
          ]
        },
        {
          icon: 'configure',
          title: 'Run /argus-setup',
          description: 'A server administrator runs this slash command once from the Discord server.',
          detail: 'Choose the Argus command in Discord’s slash-command menu and run it. Setup creates or links the private operations channels, prepares status roles and a separate verification area, and saves channel links in server settings. It also creates an Argus Admin role with Administrator permission, but does not assign it to anyone automatically. Review that role and Quarantined after setup.',
          command: '/argus-setup',
          images: [
            {
              src: '/setup-guide/setup-command.png',
              alt: 'Discord slash-command picker showing the /argus-setup command.',
              caption: 'Select /argus-setup from the Discord command menu'
            },
            {
              src: '/setup-guide/argus-channels.png',
              alt: 'Discord Argus System category showing its argus-logs, security-alerts, silent-tracking, and appeals-review channels.',
              caption: 'The private Argus operations channels'
            }
          ]
        },
        {
          icon: 'verify',
          title: 'Publish the verification panel if wanted',
          description: 'Setup prepares the verification channel and roles, but publishing the member-facing button is a separate step.',
          detail: 'Setup creates a separate SECURITY & VERIFICATION category with a #verify channel. Run /argus-verification panel to publish or update the bilingual button panel there. Button verification confirms a Discord interaction only; it does not establish a real-world identity.',
          command: '/argus-verification panel',
          images: [
            {
              src: '/setup-guide/verification-channel.png',
              alt: 'Discord channel list showing the SECURITY & VERIFICATION category and its verify channel.',
              caption: 'The separate verification channel'
            }
          ]
        },
        {
          icon: 'health',
          title: 'Review readiness and test carefully',
          description: 'Run /argus health to review configuration, permissions, and AutoMod rules.',
          detail: 'Review the health report for missing permissions and configuration issues. Start with monitoring and alerts; enable stronger actions intentionally. Raid detection alerts staff but does not automatically lock the server.',
          command: '/argus health'
        }
      ],
      needsTitle: 'Before you begin',
      needs: [
        'You need Administrator permission to run /argus-setup.',
        'Argus must be online and its slash commands must be available in the server.',
        'Database-backed features need the bot service and its database connection to be healthy.',
        'If setup reports permission or hierarchy errors, fix those in Discord and run /argus-setup again; it can find and repair existing Argus resources.'
      ],
      warningTitle: 'Give the bot only the access you need',
      warning: 'Some protections cannot work without their Discord permissions. Do not place the Argus role below roles it must manage. Setup creates a private operations area; review its visibility and channel permissions after provisioning.'
    },
    privacy: {
      eyebrow: 'DATA HANDLING',
      title: 'Security scanning without a message archive.',
      intro: 'Argus inspects message text in memory only to find HTTP/HTTPS links. It does not store the message body in its database. Some limited security metadata is retained so the bot can review incidents and suspicious joins.',
      promise: 'Message content is not written to Argus database records.',
      cards: [
        {
          icon: 'scan',
          title: 'What happens to message text',
          description: 'New messages and edits in servers are checked in-process when they contain a URL. The scanner extracts up to 10 links and discards the body after evaluation; there is no conversation-history feature.',
          points: [
            'URL credentials, query strings, and fragments are stripped before reputation lookup.',
            'A confirmed malicious-link event records the domain, detection source, category, action result, and relevant Discord event IDs—not the message body or full URL.',
            'A deletion attempt can fail if Discord permissions or message conditions prevent it; the audit event records the outcome.'
          ]
        },
        {
          icon: 'external',
          title: 'Optional external link reputation',
          description: 'Local checks run first. If Google Safe Browsing credentials are configured, the normalized URL (without credentials, query string, or fragment) may be sent to Google for a reputation check.',
          points: [
            'Discord CDN links are skipped by the external reputation lookup.',
            'Without provider credentials, the scanner operates with local sources; coverage is reduced.',
            'External providers process submitted URLs under their own terms and privacy practices.'
          ]
        },
        {
          icon: 'member',
          title: 'Member-risk records',
          description: 'When a join is flagged, the bot may store the server and user IDs, a risk score, signal reasons, status, and observation timestamps in order to support staff review.',
          points: [
            'The default observation window is 48 hours; server settings allow a duration from 12 to 168 hours.',
            'This window describes active observation; it does not mean every resolved database record is immediately deleted.',
            'Staff review and verification are configured per server. A risk score alone is not a finding of wrongdoing.'
          ]
        },
        {
          icon: 'database',
          title: 'Security logs, invites, and backups',
          description: 'Incident records may include actor/target Discord IDs, event summaries, security metadata, and (for link incidents) the domain and moderation outcome.',
          points: [
            'Security-event records are automatically purged after 90 days by default; the retention setting can be changed by server configuration.',
            'Invite attribution records are cleaned after 30 days.',
            'Backups persist server structure until deleted or removed by the configured backup-retention policy. They do not include chat messages, member rosters, or webhook secrets.'
          ]
        }
      ],
      noteTitle: 'Server administrators control the setup',
      note: 'Each Discord server chooses whether to enable protection, verification, external link checks, and relevant logging settings. Administrators should explain these controls to members and set access permissions for security logs and backups.'
    },
    footer: 'Argus · Discord server security',
    login: 'Sign in',
    dashboardButton: 'Open dashboard',
    featuresLink: 'Features',
    privacyLink: 'Privacy',
    setupLink: 'Setup guide'
  },
  ar: {
    navigation: 'التنقل الرئيسي',
    language: 'اللغة',
    home: 'الرئيسية',
    features: {
      eyebrow: 'قدرات ARGUS',
      title: 'حماية عملية، وشرح واضح لما يفعله البوت.',
      intro: 'يجمع Argus بين مراقبة الأحداث ومؤشرات الخطر وإجراءات محددة بعناية. هنا شرح لما يطبقه الكود حاليًا، وما يترك قراره عمدًا لمشرفي السيرفر.',
      label: 'طبقات الحماية',
      sections: [
        {
          icon: 'shield',
          title: 'احتواء تجاوزات Anti-Nuke',
          description: 'يراقب Argus أحداث سجل Discord للتغييرات السريعة على القنوات والرتب، وإزالة الأعضاء، وإنشاء Webhooks.',
          points: [
            'حدود وفترات زمنية قابلة للضبط، مع استثناء المالك والمستخدمين الموثوقين.',
            'وضع المراقبة يسجل ويرسل التنبيهات دون احتواء. وضع التنفيذ قد يزيل الرتب القابلة للإدارة، أو يطبق العزل والمهلة، وقد يصعّد التجاوزات المتكررة إلى الحظر.',
            'تراعي الإجراءات تسلسل الرتب وصلاحيات Discord. وينبه Argus المشرفين إذا تعذر تنفيذ إجراء بأمان.'
          ],
          tag: 'يُضبط من مالك السيرفر'
        },
        {
          icon: 'pulse',
          title: 'رصد الغارات والإغلاق الطارئ',
          description: 'يقيس سرعة انضمام الأعضاء خلال فترات قصيرة. يسجل حد المراقبة تحذيرًا، ويُنشئ الحد الأعلى مع مؤشرات الحسابات المشبوهة حدثًا أمنيًا حرجًا.',
          points: [
            'الإعدادات الافتراضية: مراقبة 5 انضمامات خلال 30 ثانية، ورصد الغارة عند 10 انضمامات خلال 15 ثانية إذا كان نصفها على الأقل مشبوهًا.',
            'رصد الغارة ينبه المشرفين؛ ولا يغلق القنوات أو يحظر الأعضاء الجدد تلقائيًا.',
            'يستطيع المشرفون بدء الإغلاق الطارئ عمدًا. يسجل Argus تغييرات صلاحيات القنوات، ويوقف الدعوات مؤقتًا، ويرفع مستوى التحقق ويدعم الاستعادة.'
          ],
          tag: 'تنبيه أولًا، والقرار للمشرف'
        },
        {
          icon: 'user',
          title: 'مراجعة مخاطر الأعضاء الجدد',
          description: 'تعتمد درجة الانضمام على مؤشرات محدودة: عمر الحساب، وغياب الصورة الشخصية المخصصة، وأنماط اسم المستخدم، وعلامة إعادة الانضمام من Discord.',
          points: [
            'قد يوضع العضو الأعلى خطورة في نافذة مراقبة قابلة للضبط (48 ساعة افتراضيًا).',
            'يتلقى المشرفون أسباب التقييم وخيارات للمراجعة؛ مؤشرات الخطر ليست دليلًا على المخالفة ولا تؤدي وحدها إلى حظر تلقائي.',
            'يمكن تفعيل التحقق بزر لتحديث رتب العضو المضبوطة. إزالة الرتب الصارمة إعداد اختياري، مع الحفاظ على الرتب المحمية.'
          ],
          tag: 'المؤشرات للمراجعة وليست حكمًا'
        },
        {
          icon: 'link',
          title: 'فحص الروابط الضارة',
          description: 'يفحص Argus حتى 10 روابط HTTP/HTTPS في الرسائل الجديدة أو المعدلة داخل السيرفر، بمقارنتها بالقائمة المحلية ومصادر التهديد المخزنة مؤقتًا.',
          points: [
            'يمكن إضافة فحص السمعة عبر Google Safe Browsing عند ضبط بيانات الخدمة.',
            'إذا تأكد أن الرابط ضار، يحاول حذف الرسالة ويرسل تنبيهًا إلى قناة السجل الأمني المضبوطة.',
            'النتائج غير المتاحة أو غير الحاسمة لا تؤدي إلى إجراء إشرافي. تُحذف بيانات الاعتماد ومعاملات الرابط والجزء بعد # قبل الفحص الخارجي.'
          ],
          tag: 'لا إجراء عند الشك'
        },
        {
          icon: 'backup',
          title: 'نسخ بنية السيرفر واستعادتها',
          description: 'تحتوي النسخ الاحتياطية على بنية السيرفر، لا نسخة من المحادثات أو قائمة الأعضاء.',
          points: [
            'قد تشمل اللقطة إعدادات السيرفر والرتب والفئات والقنوات وتجاوزات الصلاحيات.',
            'تعرض المقارنة التجريبية ما سيُضاف أو يُعدّل أو يُحذف قبل الاستعادة.',
            'الحذف والاستعادة تحت تحكم المالك مع وسائل تأكيد؛ ويتطلب الحذف التدميري موافقة صريحة.'
          ],
          tag: 'البنية فقط'
        }
      ],
      noteTitle: 'الحماية تعتمد على الإعداد',
      note: 'قد تكون بعض الوحدات معطلة أو بحاجة إلى إعداد. كما تعتمد الإجراءات الآلية على منح Argus صلاحيات Discord اللازمة ووضع رتبته في مكان مناسب. راجع الإعدادات واختبرها قبل الاعتماد عليها.'
    },
    setup: {
      eyebrow: 'ابدأ مع ARGUS',
      title: 'من دعوة البوت إلى جاهزية السيرفر، خطوة بخطوة.',
      intro: 'أضف Argus، ودع مسؤول السيرفر يجهّز مساحة الأمن الخاصة به، ثم تحقق من الصلاحيات قبل تفعيل الحماية التي تحتاجها.',
      stepsLabel: 'اختر خطوة من خطوات الإعداد',
      selectedStepLabel: 'الخطوة',
      copyCommand: 'انسخ الأمر',
      copied: 'تم النسخ',
      copySuccess: 'تم نسخ الأمر. الصقه في قناة داخل سيرفر Discord.',
      copyError: 'تعذر النسخ تلقائيًا. حدّد الأمر وانسخه يدويًا.',
      openImage: 'عرض الصورة',
      steps: [
        {
          icon: 'invite',
          title: 'أضف Argus إلى سيرفرك',
          description: 'استخدم رابط التفويض الرسمي من Discord واختر سيرفرًا تملك صلاحية إضافة التطبيقات إليه.',
          detail: 'أضف البوت فقط إلى السيرفرات التي تديرها. قد يعرض Discord الصلاحيات المطلوبة لمراجعتها قبل التأكيد.'
        },
        {
          icon: 'permissions',
          title: 'راجع الصلاحيات وترتيب الرتب',
          description: 'ضع رتبة بوت Argus أعلى رتب الأعضاء والمشرفين التي يحتاج إلى إدارتها.',
          detail: 'تشمل الصلاحيات الأساسية عرض سجل التدقيق وإدارة الرتب والقنوات والإشراف على الأعضاء وإرسال الرسائل والتضمينات. تلزم صلاحيتا الطرد والحظر وإدارة السيرفر لإجراءات الاحتواء والإغلاق المرتبطة بهما. امنح فقط ما تنوي استخدامه. تعرض الصورة الرتب التي ينشئها الإعداد؛ ارفع رتبة البوت فوق الرتب التي يحتاج إلى إدارتها.',
          images: [
            {
              src: '/setup-guide/setup-roles.png',
              alt: 'قائمة رتب Discord وتظهر فيها Quarantined وVerified وUnverified وMember وArgus Admin.',
              caption: 'الرتب التي يجهزها Argus'
            }
          ]
        },
        {
          icon: 'configure',
          title: 'شغّل /argus-setup',
          description: 'يشغّل مسؤول السيرفر أمر Slash هذا مرة واحدة من داخل سيرفر Discord.',
          detail: 'اختر أمر Argus من قائمة أوامر Slash في Discord وشغّله. ينشئ الإعداد أو يربط قنوات العمليات الخاصة، ويجهز رتب الحالة ومنطقة تحقق منفصلة، ويحفظ روابط القنوات في إعدادات السيرفر. كما ينشئ رتبة Argus Admin بصلاحية Administrator، لكنه لا يمنحها لأي شخص تلقائيًا. راجعها وراجع رتبة Quarantined بعد الإعداد.',
          command: '/argus-setup',
          images: [
            {
              src: '/setup-guide/setup-command.png',
              alt: 'قائمة أوامر Discord وتظهر فيها /argus-setup.',
              caption: 'اختر /argus-setup من قائمة أوامر Discord'
            },
            {
              src: '/setup-guide/argus-channels.png',
              alt: 'فئة Argus System في Discord وتظهر قنوات argus-logs وsecurity-alerts وsilent-tracking وappeals-review.',
              caption: 'قنوات عمليات Argus الخاصة'
            }
          ]
        },
        {
          icon: 'verify',
          title: 'انشر لوحة التحقق إذا رغبت',
          description: 'يجهز الإعداد قناة التحقق ورتبها، لكن نشر زر التحقق للأعضاء خطوة منفصلة.',
          detail: 'ينشئ الإعداد فئة منفصلة باسم SECURITY & VERIFICATION وبداخلها قناة #verify. شغّل /argus-verification panel لنشر لوحة الزر ثنائية اللغة أو تحديثها فيها. يثبت التحقق إكمال تفاعل داخل Discord فقط، ولا يثبت الهوية الحقيقية.',
          command: '/argus-verification panel',
          images: [
            {
              src: '/setup-guide/verification-channel.png',
              alt: 'قائمة قنوات Discord وتظهر فئة SECURITY & VERIFICATION وقناة verify.',
              caption: 'قناة تحقق منفصلة'
            }
          ]
        },
        {
          icon: 'health',
          title: 'افحص الجاهزية واختبر بحذر',
          description: 'شغّل /argus health لمراجعة الإعدادات والصلاحيات وقواعد AutoMod.',
          detail: 'راجع تقرير الصحة لمعرفة الصلاحيات أو الإعدادات الناقصة. ابدأ بالمراقبة والتنبيهات، وفعّل الإجراءات الأقوى عن قصد. رصد الغارات ينبه المشرفين ولا يغلق السيرفر تلقائيًا.',
          command: '/argus health'
        }
      ],
      needsTitle: 'قبل البدء',
      needs: [
        'تحتاج إلى صلاحية Administrator لتشغيل /argus-setup.',
        'يجب أن يكون Argus متصلًا وأن تكون أوامر Slash متاحة في السيرفر.',
        'تحتاج الميزات المرتبطة بقاعدة البيانات إلى أن تكون خدمة البوت واتصال قاعدة بياناتها سليمين.',
        'إذا أظهر الإعداد أخطاء صلاحيات أو ترتيب رتب، أصلحها في Discord ثم أعد تشغيل /argus-setup؛ يستطيع العثور على موارد Argus الموجودة وإصلاحها.'
      ],
      warningTitle: 'امنح البوت الوصول الذي تحتاجه فقط',
      warning: 'لن تعمل بعض الحمايات دون صلاحيات Discord المناسبة. لا تضع رتبة Argus أسفل الرتب التي يجب أن يديرها. ينشئ الإعداد مساحة عمليات خاصة؛ راجع مستوى ظهورها وصلاحيات قنواتها بعد التجهيز.'
    },
    privacy: {
      eyebrow: 'كيف تُستخدم البيانات',
      title: 'فحص أمني دون أرشيف للرسائل.',
      intro: 'يفحص Argus نص الرسائل في الذاكرة فقط للعثور على روابط HTTP/HTTPS، ولا يحفظ نص الرسالة في قاعدة بياناته. ويحتفظ ببعض البيانات الأمنية المحدودة لمراجعة الحوادث والانضمامات المشبوهة.',
      promise: 'لا يُكتب محتوى الرسالة ضمن سجلات قاعدة بيانات Argus.',
      cards: [
        {
          icon: 'scan',
          title: 'ما الذي يحدث لنص الرسالة؟',
          description: 'يفحص البوت الرسائل الجديدة وتعديلاتها داخل السيرفر عند احتوائها على رابط. يستخرج حتى 10 روابط ويفحصها داخل العملية؛ لا توجد ميزة لأرشفة المحادثات.',
          points: [
            'تُحذف بيانات اعتماد الرابط ومعاملات الاستعلام والجزء بعد # قبل فحص السمعة.',
            'يسجل حدث الرابط المؤكد النطاق ومصدر الكشف وفئته ونتيجة الإجراء ومعرّفات Discord اللازمة، لا نص الرسالة ولا الرابط كاملًا.',
            'قد يتعذر حذف الرسالة بسبب صلاحيات Discord أو ظروفها؛ ويسجل الحدث نتيجة محاولة الحذف.'
          ]
        },
        {
          icon: 'external',
          title: 'فحص خارجي اختياري لسمعة الروابط',
          description: 'تعمل الفحوص المحلية أولًا. وإذا ضُبطت بيانات Google Safe Browsing، فقد يُرسل الرابط بعد تنقيته (دون بيانات الاعتماد أو معاملات الاستعلام أو الجزء) إلى Google لفحص سمعته.',
          points: [
            'تُستثنى روابط CDN الخاصة بـ Discord من فحص السمعة الخارجي.',
            'من دون بيانات الخدمة، يعمل الفحص بالمصادر المحلية وتكون التغطية أقل.',
            'تعالج الخدمات الخارجية الروابط المرسلة وفق شروطها وممارسات الخصوصية الخاصة بها.'
          ]
        },
        {
          icon: 'member',
          title: 'سجلات مخاطر الأعضاء',
          description: 'عند رصد انضمام مشبوه، قد يحفظ البوت معرّف السيرفر والعضو ودرجة الخطر وأسبابها والحالة وتوقيت المراقبة لدعم مراجعة المشرفين.',
          points: [
            'نافذة المراقبة الافتراضية 48 ساعة، ويمكن ضبطها بين 12 و168 ساعة.',
            'هذه مدة المراقبة النشطة؛ ولا تعني أن كل سجل منتهٍ يُحذف فورًا من قاعدة البيانات.',
            'تُضبط مراجعة المشرفين والتحقق لكل سيرفر، ودرجة الخطر وحدها لا تثبت ارتكاب مخالفة.'
          ]
        },
        {
          icon: 'database',
          title: 'السجلات الأمنية والدعوات والنسخ',
          description: 'قد تتضمن سجلات الحوادث معرّفات منفذ وهدف الحدث، وملخصه وبيانات أمنية؛ وفي حوادث الروابط يُحفظ النطاق ونتيجة الإجراء.',
          points: [
            'تحذف أحداث الأمن الأقدم من 90 يومًا تلقائيًا افتراضيًا، ويمكن تغيير مدة الاحتفاظ من إعدادات السيرفر.',
            'تُنظف بيانات تتبع الدعوات بعد 30 يومًا.',
            'تظل النسخ محفوظة حتى حذفها أو إزالتها وفق سياسة الاحتفاظ المضبوطة. ولا تحتوي على الرسائل أو قائمة الأعضاء أو أسرار Webhooks.'
          ]
        }
      ],
      noteTitle: 'إعدادات السيرفر بيد مسؤوليه',
      note: 'يختار كل سيرفر تفعيل الحماية والتحقق وفحص الروابط الخارجي وإعدادات السجلات المناسبة. ينبغي للمشرفين توضيح ذلك للأعضاء وضبط صلاحيات الوصول إلى السجلات والنسخ الاحتياطية.'
    },
    footer: 'Argus · أمان سيرفرات Discord',
    login: 'تسجيل الدخول',
    dashboardButton: 'افتح لوحة التحكم',
    featuresLink: 'الميزات',
    privacyLink: 'الخصوصية',
    setupLink: 'دليل الإعداد'
  }
};
