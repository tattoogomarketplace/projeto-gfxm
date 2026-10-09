import type { Locale, MessageDictionary } from '@/lib/i18n/types';

/**
 * TATTOOGO MK — AGENDA DO ESTÚDIO E RECEBIMENTOS
 *
 * Camada isolada de mensagens da visão do tatuador/estúdio. Vive num único
 * módulo `Partial<MessageDictionary>` para manter os 16 idiomas tipados sem
 * inflar os dicionários centrais. Resolução em `t()` cai para EN/PT-BR quando
 * uma locale não define a chave.
 *
 * Blindagem de marca: `TattooGo MK` / `TattooGo Marketplace` nunca passam por
 * aqui — permanecem literais e intocáveis.
 */
export type StudioAgendaMessages = Pick<
  MessageDictionary,
  | 'agenda.today'
  | 'agenda.upcoming'
  | 'agenda.depositHeld'
  | 'agenda.depositPaid'
  | 'agenda.validateSession'
  | 'agenda.scanToken'
  | 'agenda.tokenSheetHint'
  | 'payments.receivable'
  | 'payments.depositsSecured'
  | 'payments.passHint'
>;

export const STUDIO_AGENDA_MESSAGES: Record<Locale, StudioAgendaMessages> = {
  'pt-BR': {
    'agenda.today': 'Hoje',
    'agenda.upcoming': 'Próximos',
    'agenda.depositHeld': 'Sinal Retido',
    'agenda.depositPaid': 'Sinal Pago',
    'agenda.validateSession': 'Validar Sessão',
    'agenda.scanToken': 'Escanear Token',
    'agenda.tokenSheetHint': 'Confirme o token do cliente para validar a sessão de hoje.',
    'payments.receivable': 'Valores a Receber',
    'payments.depositsSecured': 'Sinais Garantidos',
    'payments.passHint': 'Validação criptográfica das sessões. Em breve.',
  },
  'pt-PT': {
    'agenda.today': 'Hoje',
    'agenda.upcoming': 'Próximas',
    'agenda.depositHeld': 'Sinal Retido',
    'agenda.depositPaid': 'Sinal Pago',
    'agenda.validateSession': 'Validar Sessão',
    'agenda.scanToken': 'Digitalizar Token',
    'agenda.tokenSheetHint': 'Confirme o token do cliente para validar a sessão de hoje.',
    'payments.receivable': 'Valores a Receber',
    'payments.depositsSecured': 'Sinais Garantidos',
    'payments.passHint': 'Validação criptográfica das sessões. Brevemente.',
  },
  en: {
    'agenda.today': 'Today',
    'agenda.upcoming': 'Upcoming',
    'agenda.depositHeld': 'Deposit Held',
    'agenda.depositPaid': 'Deposit Paid',
    'agenda.validateSession': 'Validate Session',
    'agenda.scanToken': 'Scan Token',
    'agenda.tokenSheetHint': "Confirm the client token to validate today's session.",
    'payments.receivable': 'Amounts Receivable',
    'payments.depositsSecured': 'Secured Deposits',
    'payments.passHint': 'Cryptographic session validation. Coming soon.',
  },
  es: {
    'agenda.today': 'Hoy',
    'agenda.upcoming': 'Próximas',
    'agenda.depositHeld': 'Señal Retenida',
    'agenda.depositPaid': 'Señal Pagada',
    'agenda.validateSession': 'Validar Sesión',
    'agenda.scanToken': 'Escanear Token',
    'agenda.tokenSheetHint': 'Confirma el token del cliente para validar la sesión de hoy.',
    'payments.receivable': 'Importes por Cobrar',
    'payments.depositsSecured': 'Señales Garantizadas',
    'payments.passHint': 'Validación criptográfica de las sesiones. Próximamente.',
  },
  fr: {
    'agenda.today': "Aujourd'hui",
    'agenda.upcoming': 'À venir',
    'agenda.depositHeld': 'Acompte retenu',
    'agenda.depositPaid': 'Acompte payé',
    'agenda.validateSession': 'Valider la séance',
    'agenda.scanToken': 'Scanner le jeton',
    'agenda.tokenSheetHint': "Confirmez le jeton du client pour valider la séance du jour.",
    'payments.receivable': 'Montants à recevoir',
    'payments.depositsSecured': 'Acomptes sécurisés',
    'payments.passHint': 'Validation cryptographique des séances. Bientôt disponible.',
  },
  de: {
    'agenda.today': 'Heute',
    'agenda.upcoming': 'Anstehend',
    'agenda.depositHeld': 'Anzahlung einbehalten',
    'agenda.depositPaid': 'Anzahlung bezahlt',
    'agenda.validateSession': 'Sitzung validieren',
    'agenda.scanToken': 'Token scannen',
    'agenda.tokenSheetHint': 'Bestätige das Kunden-Token, um die heutige Sitzung zu validieren.',
    'payments.receivable': 'Forderungen',
    'payments.depositsSecured': 'Gesicherte Anzahlungen',
    'payments.passHint': 'Kryptografische Validierung der Sitzungen. Bald verfügbar.',
  },
  it: {
    'agenda.today': 'Oggi',
    'agenda.upcoming': 'In arrivo',
    'agenda.depositHeld': 'Acconto trattenuto',
    'agenda.depositPaid': 'Acconto pagato',
    'agenda.validateSession': 'Valida sessione',
    'agenda.scanToken': 'Scansiona token',
    'agenda.tokenSheetHint': 'Conferma il token del cliente per validare la sessione di oggi.',
    'payments.receivable': 'Importi da ricevere',
    'payments.depositsSecured': 'Acconti garantiti',
    'payments.passHint': 'Validazione crittografica delle sessioni. In arrivo.',
  },
  ja: {
    'agenda.today': '今日',
    'agenda.upcoming': '今後の予定',
    'agenda.depositHeld': 'デポジット保留中',
    'agenda.depositPaid': 'デポジット支払い済み',
    'agenda.validateSession': 'セッションを承認',
    'agenda.scanToken': 'トークンをスキャン',
    'agenda.tokenSheetHint': '本日のセッションを承認するには顧客トークンを確認してください。',
    'payments.receivable': '受取予定額',
    'payments.depositsSecured': '確保済みデポジット',
    'payments.passHint': 'セッションの暗号検証。近日公開。',
  },
  zh: {
    'agenda.today': '今天',
    'agenda.upcoming': '即将开始',
    'agenda.depositHeld': '定金已托管',
    'agenda.depositPaid': '定金已支付',
    'agenda.validateSession': '验证会话',
    'agenda.scanToken': '扫描令牌',
    'agenda.tokenSheetHint': '请确认客户令牌以验证今天的会话。',
    'payments.receivable': '应收金额',
    'payments.depositsSecured': '已保障定金',
    'payments.passHint': '会话的加密验证。敬请期待。',
  },
  ko: {
    'agenda.today': '오늘',
    'agenda.upcoming': '예정',
    'agenda.depositHeld': '예치금 보관 중',
    'agenda.depositPaid': '예치금 결제됨',
    'agenda.validateSession': '세션 검증',
    'agenda.scanToken': '토큰 스캔',
    'agenda.tokenSheetHint': '오늘 세션을 검증하려면 고객 토큰을 확인하세요.',
    'payments.receivable': '받을 금액',
    'payments.depositsSecured': '보장된 예치금',
    'payments.passHint': '세션의 암호화 검증. 곧 출시됩니다.',
  },
  ar: {
    'agenda.today': 'اليوم',
    'agenda.upcoming': 'القادمة',
    'agenda.depositHeld': 'تم حجز العربون',
    'agenda.depositPaid': 'تم دفع العربون',
    'agenda.validateSession': 'التحقق من الجلسة',
    'agenda.scanToken': 'مسح الرمز',
    'agenda.tokenSheetHint': 'أكد رمز العميل للتحقق من جلسة اليوم.',
    'payments.receivable': 'المبالغ المستحقة',
    'payments.depositsSecured': 'عرابين مضمونة',
    'payments.passHint': 'التحقق المشفر من الجلسات. قريباً.',
  },
  ru: {
    'agenda.today': 'Сегодня',
    'agenda.upcoming': 'Предстоящие',
    'agenda.depositHeld': 'Депозит удержан',
    'agenda.depositPaid': 'Депозит оплачен',
    'agenda.validateSession': 'Подтвердить сеанс',
    'agenda.scanToken': 'Сканировать токен',
    'agenda.tokenSheetHint': 'Подтвердите токен клиента, чтобы проверить сегодняшний сеанс.',
    'payments.receivable': 'К получению',
    'payments.depositsSecured': 'Гарантированные депозиты',
    'payments.passHint': 'Криптографическая проверка сеансов. Скоро.',
  },
  hi: {
    'agenda.today': 'आज',
    'agenda.upcoming': 'आगामी',
    'agenda.depositHeld': 'जमा राशि रोकी गई',
    'agenda.depositPaid': 'जमा राशि का भुगतान हो गया',
    'agenda.validateSession': 'सत्र सत्यापित करें',
    'agenda.scanToken': 'टोकन स्कैन करें',
    'agenda.tokenSheetHint': 'आज के सत्र को सत्यापित करने के लिए ग्राहक टोकन की पुष्टि करें।',
    'payments.receivable': 'प्राप्य राशि',
    'payments.depositsSecured': 'सुरक्षित जमा',
    'payments.passHint': 'सत्रों का क्रिप्टोग्राफ़िक सत्यापन। जल्द आ रहा है।',
  },
  nl: {
    'agenda.today': 'Vandaag',
    'agenda.upcoming': 'Aankomend',
    'agenda.depositHeld': 'Aanbetaling vastgehouden',
    'agenda.depositPaid': 'Aanbetaling betaald',
    'agenda.validateSession': 'Sessie valideren',
    'agenda.scanToken': 'Token scannen',
    'agenda.tokenSheetHint': 'Bevestig het klanttoken om de sessie van vandaag te valideren.',
    'payments.receivable': 'Te ontvangen bedragen',
    'payments.depositsSecured': 'Gegarandeerde aanbetalingen',
    'payments.passHint': 'Cryptografische sessievalidatie. Binnenkort.',
  },
  tr: {
    'agenda.today': 'Bugün',
    'agenda.upcoming': 'Yaklaşan',
    'agenda.depositHeld': 'Kapora tutuldu',
    'agenda.depositPaid': 'Kapora ödendi',
    'agenda.validateSession': 'Oturumu doğrula',
    'agenda.scanToken': 'Token tara',
    'agenda.tokenSheetHint': 'Bugünkü oturumu doğrulamak için müşteri tokenını onaylayın.',
    'payments.receivable': 'Alacak tutarı',
    'payments.depositsSecured': 'Güvence altına alınan kaporolar',
    'payments.passHint': 'Oturumların kriptografik doğrulaması. Yakında.',
  },
  pl: {
    'agenda.today': 'Dziś',
    'agenda.upcoming': 'Nadchodzące',
    'agenda.depositHeld': 'Zaliczka zatrzymana',
    'agenda.depositPaid': 'Zaliczka opłacona',
    'agenda.validateSession': 'Zatwierdź sesję',
    'agenda.scanToken': 'Zeskanuj token',
    'agenda.tokenSheetHint': 'Potwierdź token klienta, aby zatwierdzić dzisiejszą sesję.',
    'payments.receivable': 'Kwoty do otrzymania',
    'payments.depositsSecured': 'Zabezpieczone zaliczki',
    'payments.passHint': 'Kryptograficzna weryfikacja sesji. Wkrótce.',
  },
};
