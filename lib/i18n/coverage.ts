import type { MessageDictionary } from '@/lib/i18n/types';

export type ExtraMessages = Pick<
  MessageDictionary,
  | 'chat.quotes'
  | 'chat.emptyQuotes'
  | 'chat.emptyQuotesHint'
  | 'chat.filterAria'
  | 'chat.directAria'
  | 'chat.quotesAria'
  | 'chat.newQuoteRequest'
  | 'chat.newConversation'
  | 'profile.evolution'
  | 'profile.becomeArtist'
  | 'profile.becomeArtistSubtitle'
  | 'profile.openStudio'
  | 'profile.openStudioSubtitle'
  | 'profile.personalDocuments'
  | 'profile.personalDocumentsSubtitle'
  | 'account.management'
  | 'account.managementSubtitle'
  | 'account.deactivate'
  | 'account.deactivateSubtitle'
  | 'account.delete'
  | 'account.deleteSubtitle'
  | 'gallery.title'
  | 'gallery.subtitle'
  | 'gallery.explore'
  | 'home.journey'
  | 'home.appointments'
>;

export const EXTRA_PT_BR: ExtraMessages = {
  'chat.quotes': 'Orçamentos',
  'chat.emptyQuotes': 'Nenhum orçamento ainda.',
  'chat.emptyQuotesHint': 'Peça um orçamento a partir da galeria de inspirações.',
  'chat.filterAria': 'Filtrar conversas por categoria',
  'chat.directAria': 'Conversas diretas',
  'chat.quotesAria': 'Orçamentos e solicitações',
  'chat.newQuoteRequest': 'Nova solicitação de orçamento',
  'chat.newConversation': 'Nova conversa',
  'profile.evolution': 'Evolução de Perfil',
  'profile.becomeArtist': 'Quero me tornar Tatuador',
  'profile.becomeArtistSubtitle':
    'Abra sua bancada, envie os Documentos Pessoais e publique o portfólio',
  'profile.openStudio': 'Abrir/Registrar um Estúdio',
  'profile.openStudioSubtitle': 'Homologue o ateliê com CNPJ e gerencie artistas',
  'profile.personalDocuments': 'Documentos Pessoais',
  'profile.personalDocumentsSubtitle': 'Envie credenciais sanitárias para liberar a bancada',
  'account.management': 'Gerenciamento de Conta',
  'account.managementSubtitle':
    'Pause a conta ou agende a exclusão definitiva com 90 dias de carência.',
  'account.deactivate': 'Desativar temporariamente',
  'account.deactivateSubtitle': 'Pause a conta e reative depois com o mesmo e-mail',
  'account.delete': 'Excluir definitivamente',
  'account.deleteSubtitle': '90 dias de carência antes da exclusão permanente',
  'gallery.title': 'Galeria de inspirações',
  'gallery.subtitle': 'Filtre por estilo, parte do corpo e cicatrização',
  'gallery.explore': 'Explore artes de tatuadores verificados',
  'home.journey': 'Minha Jornada',
  'home.appointments': 'Seus Agendamentos',
};

export const EXTRA_EN: ExtraMessages = {
  'chat.quotes': 'Quotes',
  'chat.emptyQuotes': 'No quotes yet.',
  'chat.emptyQuotesHint': 'Request a quote from the inspiration gallery.',
  'chat.filterAria': 'Filter conversations by category',
  'chat.directAria': 'Direct conversations',
  'chat.quotesAria': 'Quotes and requests',
  'chat.newQuoteRequest': 'New quote request',
  'chat.newConversation': 'New conversation',
  'profile.evolution': 'Profile Evolution',
  'profile.becomeArtist': 'I want to become a Tattoo Artist',
  'profile.becomeArtistSubtitle':
    'Open your studio, submit Personal Documents and publish your portfolio',
  'profile.openStudio': 'Open/Register a Studio',
  'profile.openStudioSubtitle': 'Verify the studio with a tax ID and manage artists',
  'profile.personalDocuments': 'Personal Documents',
  'profile.personalDocumentsSubtitle': 'Submit sanitary credentials to unlock your studio',
  'account.management': 'Account Management',
  'account.managementSubtitle':
    'Pause the account or schedule permanent deletion with a 90-day grace period.',
  'account.deactivate': 'Deactivate temporarily',
  'account.deactivateSubtitle': 'Pause the account and reactivate later with the same email',
  'account.delete': 'Delete permanently',
  'account.deleteSubtitle': '90-day grace period before permanent deletion',
  'gallery.title': 'Inspiration gallery',
  'gallery.subtitle': 'Filter by style, body part and healing',
  'gallery.explore': 'Explore art from verified tattoo artists',
  'home.journey': 'My Journey',
  'home.appointments': 'Your Appointments',
};

export const EXTRA_ES: ExtraMessages = {
  'chat.quotes': 'Presupuestos',
  'chat.emptyQuotes': 'Aún no hay presupuestos.',
  'chat.emptyQuotesHint': 'Pide un presupuesto desde la galería de inspiraciones.',
  'chat.filterAria': 'Filtrar conversaciones por categoría',
  'chat.directAria': 'Conversaciones directas',
  'chat.quotesAria': 'Presupuestos y solicitudes',
  'chat.newQuoteRequest': 'Nueva solicitud de presupuesto',
  'chat.newConversation': 'Nueva conversación',
  'profile.evolution': 'Evolución de Perfil',
  'profile.becomeArtist': 'Quiero ser Tatuador',
  'profile.becomeArtistSubtitle':
    'Abre tu mesa, envía los Documentos Personales y publica el portafolio',
  'profile.openStudio': 'Abrir/Registrar un Estudio',
  'profile.openStudioSubtitle': 'Homologa el estudio con CIF y gestiona artistas',
  'profile.personalDocuments': 'Documentos Personales',
  'profile.personalDocumentsSubtitle': 'Envía credenciales sanitarias para liberar la mesa',
  'account.management': 'Gestión de Cuenta',
  'account.managementSubtitle':
    'Pausa la cuenta o programa la eliminación definitiva con 90 días de gracia.',
  'account.deactivate': 'Desactivar temporalmente',
  'account.deactivateSubtitle': 'Pausa la cuenta y reáctivala después con el mismo correo',
  'account.delete': 'Eliminar definitivamente',
  'account.deleteSubtitle': '90 días de gracia antes de la eliminación permanente',
  'gallery.title': 'Galería de inspiraciones',
  'gallery.subtitle': 'Filtra por estilo, parte del cuerpo y cicatrización',
  'gallery.explore': 'Explora artes de tatuadores verificados',
  'home.journey': 'Mi Trayecto',
  'home.appointments': 'Tus Citas',
};

export const EXTRA_PT_PT: ExtraMessages = {
  'chat.quotes': 'Orçamentos',
  'chat.emptyQuotes': 'Ainda não há orçamentos.',
  'chat.emptyQuotesHint': 'Peça um orçamento a partir da galeria de inspirações.',
  'chat.filterAria': 'Filtrar conversas por categoria',
  'chat.directAria': 'Conversas diretas',
  'chat.quotesAria': 'Orçamentos e pedidos',
  'chat.newQuoteRequest': 'Novo pedido de orçamento',
  'chat.newConversation': 'Nova conversa',
  'profile.evolution': 'Evolução de Perfil',
  'profile.becomeArtist': 'Quero tornar-me Tatuador',
  'profile.becomeArtistSubtitle':
    'Abra a sua banca, envie os Documentos Pessoais e publique o portefólio',
  'profile.openStudio': 'Abrir/Registar um Estúdio',
  'profile.openStudioSubtitle': 'Homologue o ateliê com NIF e gira artistas',
  'profile.personalDocuments': 'Documentos Pessoais',
  'profile.personalDocumentsSubtitle': 'Envie credenciais sanitárias para libertar a banca',
  'account.management': 'Gestão de Conta',
  'account.managementSubtitle':
    'Pause a conta ou agende a exclusão definitiva com 90 dias de carência.',
  'account.deactivate': 'Desativar temporariamente',
  'account.deactivateSubtitle': 'Pause a conta e reative depois com o mesmo e-mail',
  'account.delete': 'Eliminar definitivamente',
  'account.deleteSubtitle': '90 dias de carência antes da exclusão permanente',
  'gallery.title': 'Galeria de inspirações',
  'gallery.subtitle': 'Filtre por estilo, parte do corpo e cicatrização',
  'gallery.explore': 'Explore artes de tatuadores verificados',
  'home.journey': 'A Minha Jornada',
  'home.appointments': 'Os Seus Agendamentos',
};

export const EXTRA_FR: ExtraMessages = {
  'chat.quotes': 'Devis',
  'chat.emptyQuotes': 'Aucun devis pour le moment.',
  'chat.emptyQuotesHint': 'Demandez un devis depuis la galerie d’inspirations.',
  'chat.filterAria': 'Filtrer les conversations par catégorie',
  'chat.directAria': 'Conversations directes',
  'chat.quotesAria': 'Devis et demandes',
  'chat.newQuoteRequest': 'Nouvelle demande de devis',
  'chat.newConversation': 'Nouvelle conversation',
  'profile.evolution': 'Évolution du profil',
  'profile.becomeArtist': 'Je veux devenir tatoueur',
  'profile.becomeArtistSubtitle':
    'Ouvrez votre atelier, envoyez les documents personnels et publiez le portfolio',
  'profile.openStudio': 'Ouvrir/Enregistrer un studio',
  'profile.openStudioSubtitle': 'Homologuez l’atelier avec un SIRET et gérez les artistes',
  'profile.personalDocuments': 'Documents personnels',
  'profile.personalDocumentsSubtitle':
    'Envoyez les justificatifs sanitaires pour débloquer l’atelier',
  'account.management': 'Gestion du compte',
  'account.managementSubtitle':
    'Mettez le compte en pause ou planifiez la suppression définitive avec 90 jours de délai.',
  'account.deactivate': 'Désactiver temporairement',
  'account.deactivateSubtitle': 'Mettez le compte en pause et réactivez-le plus tard avec le même e-mail',
  'account.delete': 'Supprimer définitivement',
  'account.deleteSubtitle': '90 jours de délai avant la suppression permanente',
  'gallery.title': 'Galerie d’inspirations',
  'gallery.subtitle': 'Filtrer par style, partie du corps et cicatrisation',
  'gallery.explore': 'Explorez les œuvres de tatoueurs vérifiés',
  'home.journey': 'Mon parcours',
  'home.appointments': 'Vos rendez-vous',
};

export const EXTRA_DE: ExtraMessages = {
  'chat.quotes': 'Angebote',
  'chat.emptyQuotes': 'Noch keine Angebote.',
  'chat.emptyQuotesHint': 'Fordern Sie ein Angebot in der Inspirationsgalerie an.',
  'chat.filterAria': 'Unterhaltungen nach Kategorie filtern',
  'chat.directAria': 'Direkte Unterhaltungen',
  'chat.quotesAria': 'Angebote und Anfragen',
  'chat.newQuoteRequest': 'Neue Angebotsanfrage',
  'chat.newConversation': 'Neue Unterhaltung',
  'profile.evolution': 'Profilentwicklung',
  'profile.becomeArtist': 'Ich möchte Tätowierer werden',
  'profile.becomeArtistSubtitle':
    'Öffnen Sie Ihren Platz, senden Sie persönliche Dokumente und veröffentlichen Sie das Portfolio',
  'profile.openStudio': 'Studio eröffnen/registrieren',
  'profile.openStudioSubtitle': 'Homologieren Sie das Atelier mit Steuernummer und verwalten Sie Künstler',
  'profile.personalDocuments': 'Persönliche Dokumente',
  'profile.personalDocumentsSubtitle':
    'Senden Sie sanitäre Nachweise, um den Arbeitsplatz freizuschalten',
  'account.management': 'Kontoverwaltung',
  'account.managementSubtitle':
    'Pausieren Sie das Konto oder planen Sie die endgültige Löschung mit 90 Tagen Frist.',
  'account.deactivate': 'Vorübergehend deaktivieren',
  'account.deactivateSubtitle': 'Pausieren Sie das Konto und reaktivieren Sie es später mit derselben E-Mail',
  'account.delete': 'Endgültig löschen',
  'account.deleteSubtitle': '90 Tage Frist vor der dauerhaften Löschung',
  'gallery.title': 'Inspirationsgalerie',
  'gallery.subtitle': 'Nach Stil, Körperteil und Heilung filtern',
  'gallery.explore': 'Entdecken Sie Werke verifizierter Tätowierer',
  'home.journey': 'Meine Reise',
  'home.appointments': 'Ihre Termine',
};

export const EXTRA_IT: ExtraMessages = {
  'chat.quotes': 'Preventivi',
  'chat.emptyQuotes': 'Nessun preventivo ancora.',
  'chat.emptyQuotesHint': 'Richiedi un preventivo dalla galleria di ispirazioni.',
  'chat.filterAria': 'Filtra le conversazioni per categoria',
  'chat.directAria': 'Conversazioni dirette',
  'chat.quotesAria': 'Preventivi e richieste',
  'chat.newQuoteRequest': 'Nuova richiesta di preventivo',
  'chat.newConversation': 'Nuova conversazione',
  'profile.evolution': 'Evoluzione del profilo',
  'profile.becomeArtist': 'Voglio diventare tatuatore',
  'profile.becomeArtistSubtitle':
    'Apri il tuo banco, invia i documenti personali e pubblica il portfolio',
  'profile.openStudio': 'Apri/Registra uno studio',
  'profile.openStudioSubtitle': 'Omologa l’atelier con P. IVA e gestisci gli artisti',
  'profile.personalDocuments': 'Documenti personali',
  'profile.personalDocumentsSubtitle': 'Invia credenziali sanitarie per sbloccare il banco',
  'account.management': 'Gestione account',
  'account.managementSubtitle':
    'Metti in pausa l’account o programma l’eliminazione definitiva con 90 giorni di attesa.',
  'account.deactivate': 'Disattiva temporaneamente',
  'account.deactivateSubtitle': 'Metti in pausa l’account e riattivalo dopo con la stessa e-mail',
  'account.delete': 'Elimina definitivamente',
  'account.deleteSubtitle': '90 giorni di attesa prima dell’eliminazione permanente',
  'gallery.title': 'Galleria di ispirazioni',
  'gallery.subtitle': 'Filtra per stile, parte del corpo e cicatrizzazione',
  'gallery.explore': 'Esplora le opere di tatuatori verificati',
  'home.journey': 'Il mio percorso',
  'home.appointments': 'I tuoi appuntamenti',
};

export const EXTRA_JA: ExtraMessages = {
  'chat.quotes': '見積もり',
  'chat.emptyQuotes': 'まだ見積もりはありません。',
  'chat.emptyQuotesHint': 'インスピレーションギャラリーから見積もりを依頼してください。',
  'chat.filterAria': 'カテゴリで会話を絞り込む',
  'chat.directAria': '直接の会話',
  'chat.quotesAria': '見積もりとリクエスト',
  'chat.newQuoteRequest': '新しい見積もりリクエスト',
  'chat.newConversation': '新しい会話',
  'profile.evolution': 'プロフィールの進化',
  'profile.becomeArtist': 'タトゥーアーティストになりたい',
  'profile.becomeArtistSubtitle':
    'ブースを開き、個人書類を提出してポートフォリオを公開します',
  'profile.openStudio': 'スタジオを開設/登録',
  'profile.openStudioSubtitle': '税番号でアトリエを認証し、アーティストを管理します',
  'profile.personalDocuments': '個人書類',
  'profile.personalDocumentsSubtitle': '衛生証明を提出してブースを解放します',
  'account.management': 'アカウント管理',
  'account.managementSubtitle':
    'アカウントを一時停止するか、90日間の猶予後に完全削除を予約します。',
  'account.deactivate': '一時的に無効化',
  'account.deactivateSubtitle': 'アカウントを一時停止し、同じメールで後から再開できます',
  'account.delete': '完全に削除',
  'account.deleteSubtitle': '完全削除まで90日間の猶予があります',
  'gallery.title': 'インスピレーションギャラリー',
  'gallery.subtitle': 'スタイル、部位、治癒状態で絞り込む',
  'gallery.explore': '認証済みアーティストの作品を探す',
  'home.journey': 'マイジャーニー',
  'home.appointments': '予約一覧',
};

export const EXTRA_ZH: ExtraMessages = {
  'chat.quotes': '报价',
  'chat.emptyQuotes': '还没有报价。',
  'chat.emptyQuotesHint': '从图库灵感中申请报价。',
  'chat.filterAria': '按类别筛选对话',
  'chat.directAria': '直接对话',
  'chat.quotesAria': '报价与请求',
  'chat.newQuoteRequest': '新的报价请求',
  'chat.newConversation': '新对话',
  'profile.evolution': '资料升级',
  'profile.becomeArtist': '我想成为纹身师',
  'profile.becomeArtistSubtitle': '开设工位、提交个人文件并发布作品集',
  'profile.openStudio': '开设/注册工作室',
  'profile.openStudioSubtitle': '使用税号认证工作室并管理艺术家',
  'profile.personalDocuments': '个人文件',
  'profile.personalDocumentsSubtitle': '提交卫生资质以解锁工位',
  'account.management': '账户管理',
  'account.managementSubtitle': '暂停账户或安排 90 天宽限期后的永久删除。',
  'account.deactivate': '暂时停用',
  'account.deactivateSubtitle': '暂停账户，之后可用同一邮箱重新激活',
  'account.delete': '永久删除',
  'account.deleteSubtitle': '永久删除前有 90 天宽限期',
  'gallery.title': '灵感图库',
  'gallery.subtitle': '按风格、部位和愈合状态筛选',
  'gallery.explore': '探索已认证纹身师的作品',
  'home.journey': '我的旅程',
  'home.appointments': '您的预约',
};

export const EXTRA_KO: ExtraMessages = {
  'chat.quotes': '견적',
  'chat.emptyQuotes': '아직 견적이 없습니다.',
  'chat.emptyQuotesHint': '영감 갤러리에서 견적을 요청하세요.',
  'chat.filterAria': '카테고리별 대화 필터',
  'chat.directAria': '직접 대화',
  'chat.quotesAria': '견적 및 요청',
  'chat.newQuoteRequest': '새 견적 요청',
  'chat.newConversation': '새 대화',
  'profile.evolution': '프로필 발전',
  'profile.becomeArtist': '타투 아티스트가 되고 싶어요',
  'profile.becomeArtistSubtitle': '작업대를 열고 개인 서류를 제출한 뒤 포트폴리오를 게시하세요',
  'profile.openStudio': '스튜디오 개설/등록',
  'profile.openStudioSubtitle': '사업자 등록으로 스튜디오를 인증하고 아티스트를 관리하세요',
  'profile.personalDocuments': '개인 서류',
  'profile.personalDocumentsSubtitle': '위생 자격 서류를 제출하여 작업대를 해제하세요',
  'account.management': '계정 관리',
  'account.managementSubtitle': '계정을 일시 중지하거나 90일 유예 후 영구 삭제를 예약하세요.',
  'account.deactivate': '일시적으로 비활성화',
  'account.deactivateSubtitle': '계정을 일시 중지하고 같은 이메일로 나중에 다시 활성화하세요',
  'account.delete': '영구 삭제',
  'account.deleteSubtitle': '영구 삭제 전 90일 유예 기간',
  'gallery.title': '영감 갤러리',
  'gallery.subtitle': '스타일, 부위, 치유 상태로 필터',
  'gallery.explore': '인증된 타투 아티스트의 작품을 둘러보세요',
  'home.journey': '나의 여정',
  'home.appointments': '내 예약',
};

export const EXTRA_AR: ExtraMessages = {
  'chat.quotes': 'عروض الأسعار',
  'chat.emptyQuotes': 'لا توجد عروض أسعار بعد.',
  'chat.emptyQuotesHint': 'اطلب عرض سعر من معرض الإلهام.',
  'chat.filterAria': 'تصفية المحادثات حسب الفئة',
  'chat.directAria': 'محادثات مباشرة',
  'chat.quotesAria': 'عروض الأسعار والطلبات',
  'chat.newQuoteRequest': 'طلب عرض سعر جديد',
  'chat.newConversation': 'محادثة جديدة',
  'profile.evolution': 'تطور الملف الشخصي',
  'profile.becomeArtist': 'أريد أن أصبح وشّامًا',
  'profile.becomeArtistSubtitle':
    'افتح مقعدك وأرسل المستندات الشخصية وانشر المعرض',
  'profile.openStudio': 'فتح/تسجيل استوديو',
  'profile.openStudioSubtitle': 'وثّق المشغل برقم ضريبي وأدر الفنانين',
  'profile.personalDocuments': 'المستندات الشخصية',
  'profile.personalDocumentsSubtitle': 'أرسل الشهادات الصحية لفتح المقعد',
  'account.management': 'إدارة الحساب',
  'account.managementSubtitle':
    'أوقف الحساب مؤقتًا أو جدول الحذف النهائي مع مهلة 90 يومًا.',
  'account.deactivate': 'تعطيل مؤقت',
  'account.deactivateSubtitle': 'أوقف الحساب وأعد تفعيله لاحقًا بنفس البريد',
  'account.delete': 'حذف نهائي',
  'account.deleteSubtitle': 'مهلة 90 يومًا قبل الحذف الدائم',
  'gallery.title': 'معرض الإلهام',
  'gallery.subtitle': 'صفِّ حسب الأسلوب ومنطقة الجسم والالتئام',
  'gallery.explore': 'استكشف أعمال الوشّامين المعتمدين',
  'home.journey': 'رحلتي',
  'home.appointments': 'مواعيدك',
};

export const EXTRA_RU: ExtraMessages = {
  'chat.quotes': 'Сметы',
  'chat.emptyQuotes': 'Пока нет смет.',
  'chat.emptyQuotesHint': 'Запросите смету в галерее вдохновения.',
  'chat.filterAria': 'Фильтровать беседы по категории',
  'chat.directAria': 'Прямые беседы',
  'chat.quotesAria': 'Сметы и заявки',
  'chat.newQuoteRequest': 'Новый запрос сметы',
  'chat.newConversation': 'Новая беседа',
  'profile.evolution': 'Развитие профиля',
  'profile.becomeArtist': 'Хочу стать тату-мастером',
  'profile.becomeArtistSubtitle':
    'Откройте место, отправьте личные документы и опубликуйте портфолио',
  'profile.openStudio': 'Открыть/зарегистрировать студию',
  'profile.openStudioSubtitle': 'Подтвердите ателье по ИНН и управляйте мастерами',
  'profile.personalDocuments': 'Личные документы',
  'profile.personalDocumentsSubtitle': 'Отправьте санитарные документы, чтобы открыть место',
  'account.management': 'Управление аккаунтом',
  'account.managementSubtitle':
    'Приостановите аккаунт или запланируйте окончательное удаление с отсрочкой 90 дней.',
  'account.deactivate': 'Временно деактивировать',
  'account.deactivateSubtitle': 'Приостановите аккаунт и вернитесь позже с тем же e-mail',
  'account.delete': 'Удалить навсегда',
  'account.deleteSubtitle': '90 дней отсрочки до окончательного удаления',
  'gallery.title': 'Галерея вдохновения',
  'gallery.subtitle': 'Фильтр по стилю, части тела и заживлению',
  'gallery.explore': 'Смотрите работы проверенных мастеров',
  'home.journey': 'Мой путь',
  'home.appointments': 'Ваши записи',
};

export const EXTRA_HI: ExtraMessages = {
  'chat.quotes': 'कोटेशन',
  'chat.emptyQuotes': 'अभी कोई कोटेशन नहीं।',
  'chat.emptyQuotesHint': 'प्रेरणा गैलरी से कोटेशन का अनुरोध करें।',
  'chat.filterAria': 'श्रेणी के अनुसार बातचीत फ़िल्टर करें',
  'chat.directAria': 'सीधी बातचीत',
  'chat.quotesAria': 'कोटेशन और अनुरोध',
  'chat.newQuoteRequest': 'नया कोटेशन अनुरोध',
  'chat.newConversation': 'नई बातचीत',
  'profile.evolution': 'प्रोफ़ाइल विकास',
  'profile.becomeArtist': 'मैं टैटू कलाकार बनना चाहता हूँ',
  'profile.becomeArtistSubtitle':
    'अपना स्थान खोलें, व्यक्तिगत दस्तावेज़ भेजें और पोर्टफोलियो प्रकाशित करें',
  'profile.openStudio': 'स्टूडियो खोलें/पंजीकृत करें',
  'profile.openStudioSubtitle': 'टैक्स आईडी से स्टूडियो सत्यापित करें और कलाकारों का प्रबंधन करें',
  'profile.personalDocuments': 'व्यक्तिगत दस्तावेज़',
  'profile.personalDocumentsSubtitle': 'स्थान खोलने के लिए स्वास्थ्य प्रमाण पत्र भेजें',
  'account.management': 'खाता प्रबंधन',
  'account.managementSubtitle':
    'खाता रोकें या 90 दिनों की छूट अवधि के साथ स्थायी हटाने का शेड्यूल करें।',
  'account.deactivate': 'अस्थायी रूप से निष्क्रिय करें',
  'account.deactivateSubtitle': 'खाता रोकें और बाद में उसी ईमेल से फिर सक्रिय करें',
  'account.delete': 'स्थायी रूप से हटाएं',
  'account.deleteSubtitle': 'स्थायी हटाने से पहले 90 दिन की छूट अवधि',
  'gallery.title': 'प्रेरणा गैलरी',
  'gallery.subtitle': 'शैली, शरीर के हिस्से और हीलिंग से फ़िल्टर करें',
  'gallery.explore': 'सत्यापित टैटू कलाकारों की कला देखें',
  'home.journey': 'मेरी यात्रा',
  'home.appointments': 'आपकी अपॉइंटमेंट',
};

export const EXTRA_NL: ExtraMessages = {
  'chat.quotes': 'Offertes',
  'chat.emptyQuotes': 'Nog geen offertes.',
  'chat.emptyQuotesHint': 'Vraag een offerte aan vanuit de inspiratiegalerij.',
  'chat.filterAria': 'Gesprekken filteren op categorie',
  'chat.directAria': 'Directe gesprekken',
  'chat.quotesAria': 'Offertes en aanvragen',
  'chat.newQuoteRequest': 'Nieuwe offerteaanvraag',
  'chat.newConversation': 'Nieuw gesprek',
  'profile.evolution': 'Profielevolutie',
  'profile.becomeArtist': 'Ik wil tatoeëerder worden',
  'profile.becomeArtistSubtitle':
    'Open je werkplek, stuur persoonlijke documenten en publiceer je portfolio',
  'profile.openStudio': 'Studio openen/registreren',
  'profile.openStudioSubtitle': 'Homologeer het atelier met btw-nummer en beheer artiesten',
  'profile.personalDocuments': 'Persoonlijke documenten',
  'profile.personalDocumentsSubtitle': 'Stuur sanitaire gegevens om de werkplek vrij te geven',
  'account.management': 'Accountbeheer',
  'account.managementSubtitle':
    'Pauzeer het account of plan definitieve verwijdering met 90 dagen bedenktijd.',
  'account.deactivate': 'Tijdelijk deactiveren',
  'account.deactivateSubtitle': 'Pauzeer het account en activeer later opnieuw met hetzelfde e-mailadres',
  'account.delete': 'Definitief verwijderen',
  'account.deleteSubtitle': '90 dagen bedenktijd vóór permanente verwijdering',
  'gallery.title': 'Inspiratiegalerij',
  'gallery.subtitle': 'Filter op stijl, lichaamsdeel en genezing',
  'gallery.explore': 'Ontdek werken van geverifieerde tatoeëerders',
  'home.journey': 'Mijn reis',
  'home.appointments': 'Je afspraken',
};

export const EXTRA_TR: ExtraMessages = {
  'chat.quotes': 'Teklifler',
  'chat.emptyQuotes': 'Henüz teklif yok.',
  'chat.emptyQuotesHint': 'İlham galerisinden teklif isteyin.',
  'chat.filterAria': 'Konuşmaları kategoriye göre filtrele',
  'chat.directAria': 'Doğrudan konuşmalar',
  'chat.quotesAria': 'Teklifler ve istekler',
  'chat.newQuoteRequest': 'Yeni teklif isteği',
  'chat.newConversation': 'Yeni konuşma',
  'profile.evolution': 'Profil gelişimi',
  'profile.becomeArtist': 'Dövme sanatçısı olmak istiyorum',
  'profile.becomeArtistSubtitle':
    'Tezgahınızı açın, kişisel belgeler gönderin ve portföyü yayınlayın',
  'profile.openStudio': 'Stüdyo aç/kaydet',
  'profile.openStudioSubtitle': 'Atölyeyi vergi numarasıyla doğrulayın ve sanatçıları yönetin',
  'profile.personalDocuments': 'Kişisel belgeler',
  'profile.personalDocumentsSubtitle': 'Tezgahı açmak için sağlık belgelerini gönderin',
  'account.management': 'Hesap yönetimi',
  'account.managementSubtitle':
    'Hesabı duraklatın veya 90 günlük bekleme süresiyle kalıcı silmeyi planlayın.',
  'account.deactivate': 'Geçici olarak devre dışı bırak',
  'account.deactivateSubtitle': 'Hesabı duraklatın ve sonra aynı e-posta ile yeniden etkinleştirin',
  'account.delete': 'Kalıcı olarak sil',
  'account.deleteSubtitle': 'Kalıcı silmeden önce 90 günlük bekleme süresi',
  'gallery.title': 'İlham galerisi',
  'gallery.subtitle': 'Stil, vücut bölgesi ve iyileşmeye göre filtreleyin',
  'gallery.explore': 'Doğrulanmış dövme sanatçılarının işlerini keşfedin',
  'home.journey': 'Yolculuğum',
  'home.appointments': 'Randevularınız',
};

export const EXTRA_PL: ExtraMessages = {
  'chat.quotes': 'Wyceny',
  'chat.emptyQuotes': 'Brak wycen.',
  'chat.emptyQuotesHint': 'Poproś o wycenę z galerii inspiracji.',
  'chat.filterAria': 'Filtruj rozmowy według kategorii',
  'chat.directAria': 'Rozmowy bezpośrednie',
  'chat.quotesAria': 'Wyceny i zgłoszenia',
  'chat.newQuoteRequest': 'Nowa prośba o wycenę',
  'chat.newConversation': 'Nowa rozmowa',
  'profile.evolution': 'Rozwój profilu',
  'profile.becomeArtist': 'Chcę zostać tatuażystą',
  'profile.becomeArtistSubtitle':
    'Otwórz stanowisko, wyślij dokumenty osobiste i opublikuj portfolio',
  'profile.openStudio': 'Otwórz/zarejestruj studio',
  'profile.openStudioSubtitle': 'Zatwierdź atelier numerem NIP i zarządzaj artystami',
  'profile.personalDocuments': 'Dokumenty osobiste',
  'profile.personalDocumentsSubtitle': 'Wyślij dokumenty sanitarne, aby odblokować stanowisko',
  'account.management': 'Zarządzanie kontem',
  'account.managementSubtitle':
    'Wstrzymaj konto lub zaplanuj trwałe usunięcie z 90-dniowym okresem karencji.',
  'account.deactivate': 'Dezaktywuj tymczasowo',
  'account.deactivateSubtitle': 'Wstrzymaj konto i aktywuj je później tym samym e-mailem',
  'account.delete': 'Usuń trwale',
  'account.deleteSubtitle': '90 dni karencji przed trwałym usunięciem',
  'gallery.title': 'Galeria inspiracji',
  'gallery.subtitle': 'Filtruj według stylu, części ciała i gojenia',
  'gallery.explore': 'Odkrywaj prace zweryfikowanych tatuażystów',
  'home.journey': 'Moja podróż',
  'home.appointments': 'Twoje wizyty',
};

/**
 * Vocabulário das telas reconstruídas (Home Discover, Agenda Timeline e
 * Estatísticas de Perfil). Mantido fora de `ExtraMessages` para não exigir
 * tradução dos 16 idiomas; os locales não primários herdam o inglês via
 * `withFallback`, enquanto PT-BR, EN e ES fornecem as três vozes oficiais.
 */
export type DiscoveryMessages = Pick<
  MessageDictionary,
  | 'home.discover'
  | 'home.discoverSubtitle'
  | 'home.featuredArtists'
  | 'home.trendingStyles'
  | 'home.viewAll'
  | 'home.noFeaturedArtists'
  | 'home.noTrendingStyles'
  | 'agenda.timeline'
  | 'agenda.timelineSubtitle'
  | 'agenda.stagesPreview'
  | 'agenda.statusAwaitingPayment'
  | 'agenda.statusConfirmed'
  | 'agenda.statusActionRequired'
  | 'agenda.statusActionRequiredHint'
  | 'agenda.statusCompleted'
  | 'agenda.statusCanceled'
  | 'agenda.empty'
  | 'agenda.emptyHint'
  | 'agenda.session'
  | 'agenda.signDocument'
  | 'agenda.payDeposit'
  | 'profile.sessions'
  | 'profile.favorites'
  | 'profile.completed'
  | 'profile.verified'
>;

export const DISCOVERY_PT_BR: DiscoveryMessages = {
  'home.discover': 'Descubra sua próxima arte',
  'home.discoverSubtitle': 'Artistas verificados, estilos em alta e inspirações para a sua pele.',
  'home.featuredArtists': 'Artistas em Destaque',
  'home.trendingStyles': 'Estilos em Alta',
  'home.viewAll': 'Ver tudo',
  'home.noFeaturedArtists': 'Novos artistas chegam em breve.',
  'home.noTrendingStyles': 'Explore os estilos direto na galeria.',
  'agenda.timeline': 'Linha do Tempo',
  'agenda.timelineSubtitle': 'Acompanhe cada etapa da sua sessão.',
  'agenda.stagesPreview': 'Etapas da sua jornada',
  'agenda.statusAwaitingPayment': 'Aguardando Pagamento',
  'agenda.statusConfirmed': 'Confirmado',
  'agenda.statusActionRequired': 'Ação Necessária',
  'agenda.statusActionRequiredHint': 'Assine o documento para liberar a sessão.',
  'agenda.statusCompleted': 'Concluído',
  'agenda.statusCanceled': 'Cancelado',
  'agenda.empty': 'Nenhuma sessão na linha do tempo.',
  'agenda.emptyHint': 'Sua próxima obra-prima começa com um agendamento.',
  'agenda.session': 'Sessão de tatuagem',
  'agenda.signDocument': 'Assinar Documento',
  'agenda.payDeposit': 'Pagar sinal',
  'profile.sessions': 'Sessões',
  'profile.favorites': 'Favoritos',
  'profile.completed': 'Concluídas',
  'profile.verified': 'Perfil verificado',
};

export const DISCOVERY_EN: DiscoveryMessages = {
  'home.discover': 'Discover your next piece',
  'home.discoverSubtitle': 'Verified artists, trending styles and inspiration for your skin.',
  'home.featuredArtists': 'Featured Artists',
  'home.trendingStyles': 'Trending Styles',
  'home.viewAll': 'View all',
  'home.noFeaturedArtists': 'New artists are coming soon.',
  'home.noTrendingStyles': 'Explore styles right in the gallery.',
  'agenda.timeline': 'Timeline',
  'agenda.timelineSubtitle': 'Track every step of your session.',
  'agenda.stagesPreview': 'Your journey stages',
  'agenda.statusAwaitingPayment': 'Awaiting Payment',
  'agenda.statusConfirmed': 'Confirmed',
  'agenda.statusActionRequired': 'Action Required',
  'agenda.statusActionRequiredHint': 'Sign the document to unlock the session.',
  'agenda.statusCompleted': 'Completed',
  'agenda.statusCanceled': 'Canceled',
  'agenda.empty': 'No sessions on the timeline yet.',
  'agenda.emptyHint': 'Your next masterpiece starts with a booking.',
  'agenda.session': 'Tattoo session',
  'agenda.signDocument': 'Sign Document',
  'agenda.payDeposit': 'Pay deposit',
  'profile.sessions': 'Sessions',
  'profile.favorites': 'Favorites',
  'profile.completed': 'Completed',
  'profile.verified': 'Verified profile',
};

export const DISCOVERY_ES: DiscoveryMessages = {
  'home.discover': 'Descubre tu próximo arte',
  'home.discoverSubtitle': 'Artistas verificados, estilos en tendencia e inspiración para tu piel.',
  'home.featuredArtists': 'Artistas Destacados',
  'home.trendingStyles': 'Estilos en Tendencia',
  'home.viewAll': 'Ver todo',
  'home.noFeaturedArtists': 'Pronto llegarán nuevos artistas.',
  'home.noTrendingStyles': 'Explora los estilos en la galería.',
  'agenda.timeline': 'Cronología',
  'agenda.timelineSubtitle': 'Sigue cada etapa de tu sesión.',
  'agenda.stagesPreview': 'Las etapas de tu viaje',
  'agenda.statusAwaitingPayment': 'Esperando Pago',
  'agenda.statusConfirmed': 'Confirmado',
  'agenda.statusActionRequired': 'Acción Necesaria',
  'agenda.statusActionRequiredHint': 'Firma el documento para liberar la sesión.',
  'agenda.statusCompleted': 'Completado',
  'agenda.statusCanceled': 'Cancelado',
  'agenda.empty': 'Aún no hay sesiones en la cronología.',
  'agenda.emptyHint': 'Tu próxima obra maestra empieza con una cita.',
  'agenda.session': 'Sesión de tatuaje',
  'agenda.signDocument': 'Firmar Documento',
  'agenda.payDeposit': 'Pagar señal',
  'profile.sessions': 'Sesiones',
  'profile.favorites': 'Favoritos',
  'profile.completed': 'Completadas',
  'profile.verified': 'Perfil verificado',
};
