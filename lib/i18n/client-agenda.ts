import type { Locale, MessageDictionary } from '@/lib/i18n/types';

/**
 * TATTOOGO MK — ESTADO ATIVO DO CLIENTE (AGENDA + PAGAMENTOS)
 *
 * Camada isolada de mensagens do "estado ativo" da linha do tempo do cliente:
 * o card de sessão em curso, o detalhamento do sinal de 25% e os CTAs
 * contextuais ("Assinar Termo de Responsabilidade" e "Pagar Sinal (25%)").
 *
 * Vive num único módulo `Partial<MessageDictionary>` para manter os 16 idiomas
 * tipados sem inflar os dicionários centrais. Resolução em `t()` cai para
 * EN/PT-BR quando uma locale não define a chave.
 *
 * Blindagem de marca: `TattooGo MK` / `TattooGo Marketplace` / `TattooGo Pass`
 * permanecem literais e intocáveis — nunca passam por aqui.
 */
export type ClientAgendaMessages = Pick<
  MessageDictionary,
  | 'clientAgenda.activeSession'
  | 'clientAgenda.artist'
  | 'clientAgenda.schedule'
  | 'clientAgenda.total'
  | 'clientAgenda.depositLabel'
  | 'clientAgenda.signTerm'
  | 'clientAgenda.payDeposit'
  | 'clientAgenda.signing'
  | 'clientAgenda.paying'
>;

export const CLIENT_AGENDA_MESSAGES: Record<Locale, ClientAgendaMessages> = {
  'pt-BR': {
    'clientAgenda.activeSession': 'Sessão Ativa',
    'clientAgenda.artist': 'Artista',
    'clientAgenda.schedule': 'Data e Hora',
    'clientAgenda.total': 'Valor Total',
    'clientAgenda.depositLabel': 'Sinal de 25%',
    'clientAgenda.signTerm': 'Assinar Termo de Responsabilidade',
    'clientAgenda.payDeposit': 'Pagar Sinal (25%)',
    'clientAgenda.signing': 'Assinando…',
    'clientAgenda.paying': 'Gerando Pagamento…',
  },
  'pt-PT': {
    'clientAgenda.activeSession': 'Sessão Ativa',
    'clientAgenda.artist': 'Artista',
    'clientAgenda.schedule': 'Data e Hora',
    'clientAgenda.total': 'Valor Total',
    'clientAgenda.depositLabel': 'Sinal de 25%',
    'clientAgenda.signTerm': 'Assinar Termo de Responsabilidade',
    'clientAgenda.payDeposit': 'Pagar Sinal (25%)',
    'clientAgenda.signing': 'A assinar…',
    'clientAgenda.paying': 'A gerar pagamento…',
  },
  en: {
    'clientAgenda.activeSession': 'Active Session',
    'clientAgenda.artist': 'Artist',
    'clientAgenda.schedule': 'Date & Time',
    'clientAgenda.total': 'Total Amount',
    'clientAgenda.depositLabel': '25% Deposit',
    'clientAgenda.signTerm': 'Sign Liability Waiver',
    'clientAgenda.payDeposit': 'Pay Deposit (25%)',
    'clientAgenda.signing': 'Signing…',
    'clientAgenda.paying': 'Generating Payment…',
  },
  es: {
    'clientAgenda.activeSession': 'Sesión Activa',
    'clientAgenda.artist': 'Artista',
    'clientAgenda.schedule': 'Fecha y Hora',
    'clientAgenda.total': 'Importe Total',
    'clientAgenda.depositLabel': 'Señal del 25%',
    'clientAgenda.signTerm': 'Firmar Exención de Responsabilidad',
    'clientAgenda.payDeposit': 'Pagar Señal (25%)',
    'clientAgenda.signing': 'Firmando…',
    'clientAgenda.paying': 'Generando Pago…',
  },
  fr: {
    'clientAgenda.activeSession': 'Séance active',
    'clientAgenda.artist': 'Artiste',
    'clientAgenda.schedule': 'Date et heure',
    'clientAgenda.total': 'Montant total',
    'clientAgenda.depositLabel': 'Acompte de 25 %',
    'clientAgenda.signTerm': 'Signer la décharge de responsabilité',
    'clientAgenda.payDeposit': 'Payer l’acompte (25 %)',
    'clientAgenda.signing': 'Signature…',
    'clientAgenda.paying': 'Génération du paiement…',
  },
  de: {
    'clientAgenda.activeSession': 'Aktive Sitzung',
    'clientAgenda.artist': 'Künstler',
    'clientAgenda.schedule': 'Datum und Uhrzeit',
    'clientAgenda.total': 'Gesamtbetrag',
    'clientAgenda.depositLabel': '25 % Anzahlung',
    'clientAgenda.signTerm': 'Haftungsausschluss unterschreiben',
    'clientAgenda.payDeposit': 'Anzahlung zahlen (25 %)',
    'clientAgenda.signing': 'Wird unterschrieben…',
    'clientAgenda.paying': 'Zahlung wird erstellt…',
  },
  it: {
    'clientAgenda.activeSession': 'Sessione attiva',
    'clientAgenda.artist': 'Artista',
    'clientAgenda.schedule': 'Data e ora',
    'clientAgenda.total': 'Importo totale',
    'clientAgenda.depositLabel': 'Acconto del 25%',
    'clientAgenda.signTerm': 'Firma la liberatoria di responsabilità',
    'clientAgenda.payDeposit': 'Paga acconto (25%)',
    'clientAgenda.signing': 'Firma in corso…',
    'clientAgenda.paying': 'Generazione pagamento…',
  },
  ja: {
    'clientAgenda.activeSession': 'アクティブなセッション',
    'clientAgenda.artist': 'アーティスト',
    'clientAgenda.schedule': '日時',
    'clientAgenda.total': '合計金額',
    'clientAgenda.depositLabel': '25%の手付金',
    'clientAgenda.signTerm': '免責同意書に署名',
    'clientAgenda.payDeposit': '手付金を支払う（25%）',
    'clientAgenda.signing': '署名中…',
    'clientAgenda.paying': '支払いを生成中…',
  },
  zh: {
    'clientAgenda.activeSession': '进行中的会话',
    'clientAgenda.artist': '艺术家',
    'clientAgenda.schedule': '日期与时间',
    'clientAgenda.total': '总金额',
    'clientAgenda.depositLabel': '25% 定金',
    'clientAgenda.signTerm': '签署责任豁免书',
    'clientAgenda.payDeposit': '支付定金（25%）',
    'clientAgenda.signing': '签署中…',
    'clientAgenda.paying': '正在生成付款…',
  },
  ko: {
    'clientAgenda.activeSession': '진행 중인 세션',
    'clientAgenda.artist': '아티스트',
    'clientAgenda.schedule': '날짜 및 시간',
    'clientAgenda.total': '총 금액',
    'clientAgenda.depositLabel': '25% 예치금',
    'clientAgenda.signTerm': '책임 면제서 서명',
    'clientAgenda.payDeposit': '예치금 결제 (25%)',
    'clientAgenda.signing': '서명 중…',
    'clientAgenda.paying': '결제 생성 중…',
  },
  ar: {
    'clientAgenda.activeSession': 'جلسة نشطة',
    'clientAgenda.artist': 'الفنان',
    'clientAgenda.schedule': 'التاريخ والوقت',
    'clientAgenda.total': 'المبلغ الإجمالي',
    'clientAgenda.depositLabel': 'عربون 25%',
    'clientAgenda.signTerm': 'توقيع إخلاء المسؤولية',
    'clientAgenda.payDeposit': 'دفع العربون (25%)',
    'clientAgenda.signing': 'جارٍ التوقيع…',
    'clientAgenda.paying': 'جارٍ إنشاء الدفع…',
  },
  ru: {
    'clientAgenda.activeSession': 'Активный сеанс',
    'clientAgenda.artist': 'Мастер',
    'clientAgenda.schedule': 'Дата и время',
    'clientAgenda.total': 'Итоговая сумма',
    'clientAgenda.depositLabel': 'Депозит 25 %',
    'clientAgenda.signTerm': 'Подписать отказ от ответственности',
    'clientAgenda.payDeposit': 'Оплатить депозит (25 %)',
    'clientAgenda.signing': 'Подписание…',
    'clientAgenda.paying': 'Создание платежа…',
  },
  hi: {
    'clientAgenda.activeSession': 'सक्रिय सत्र',
    'clientAgenda.artist': 'कलाकार',
    'clientAgenda.schedule': 'दिनांक और समय',
    'clientAgenda.total': 'कुल राशि',
    'clientAgenda.depositLabel': '25% जमा',
    'clientAgenda.signTerm': 'उत्तरदायित्व छूट पर हस्ताक्षर करें',
    'clientAgenda.payDeposit': 'जमा भुगतान करें (25%)',
    'clientAgenda.signing': 'हस्ताक्षर हो रहा है…',
    'clientAgenda.paying': 'भुगतान बनाया जा रहा है…',
  },
  nl: {
    'clientAgenda.activeSession': 'Actieve sessie',
    'clientAgenda.artist': 'Artiest',
    'clientAgenda.schedule': 'Datum en tijd',
    'clientAgenda.total': 'Totaalbedrag',
    'clientAgenda.depositLabel': '25% aanbetaling',
    'clientAgenda.signTerm': 'Aansprakelijkheidsverklaring ondertekenen',
    'clientAgenda.payDeposit': 'Aanbetaling betalen (25%)',
    'clientAgenda.signing': 'Ondertekenen…',
    'clientAgenda.paying': 'Betaling genereren…',
  },
  tr: {
    'clientAgenda.activeSession': 'Aktif Oturum',
    'clientAgenda.artist': 'Sanatçı',
    'clientAgenda.schedule': 'Tarih ve Saat',
    'clientAgenda.total': 'Toplam Tutar',
    'clientAgenda.depositLabel': '%25 Kapora',
    'clientAgenda.signTerm': 'Sorumluluk Feragatnamesini İmzala',
    'clientAgenda.payDeposit': 'Kapora Öde (%25)',
    'clientAgenda.signing': 'İmzalanıyor…',
    'clientAgenda.paying': 'Ödeme oluşturuluyor…',
  },
  pl: {
    'clientAgenda.activeSession': 'Aktywna sesja',
    'clientAgenda.artist': 'Artysta',
    'clientAgenda.schedule': 'Data i godzina',
    'clientAgenda.total': 'Kwota łączna',
    'clientAgenda.depositLabel': 'Zaliczka 25%',
    'clientAgenda.signTerm': 'Podpisz oświadczenie o odpowiedzialności',
    'clientAgenda.payDeposit': 'Zapłać zaliczkę (25%)',
    'clientAgenda.signing': 'Podpisywanie…',
    'clientAgenda.paying': 'Generowanie płatności…',
  },
};
