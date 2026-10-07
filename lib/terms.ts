export const TERMS_TITLE = 'Termos de Uso e Política de Privacidade';
export const TERMS_BRAND = 'TattooGo MK';
export const TERMS_VERSION = '3.0';
export const TERMS_UPDATED_AT = '2026-01-01';

export interface TermsClause {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

/**
 * Fonte única de verdade para os Termos de Uso e Política de Privacidade.
 * Consumido pelo onboarding (cadastro/termos) e pela aba de Configurações do
 * Perfil, garantindo que o texto exibido no primeiro acesso seja exatamente o
 * mesmo acessível depois pela engrenagem de configurações.
 */
export const TERMS_SECTIONS: TermsClause[] = [
  {
    id: 'aceitacao',
    title: '1. Aceitação e Objeto',
    paragraphs: [
      `Os presentes Termos de Uso e Política de Privacidade regulam o acesso e a utilização do ecossistema ${TERMS_BRAND} ("Plataforma"), marketplace que conecta clientes, tatuadores autônomos e estúdios de tatuagem.`,
      'Ao se cadastrar, navegar, contratar ou ofertar serviços, o usuário declara ter lido, compreendido e aceito integralmente estas cláusulas, bem como a Política de Privacidade e o processamento de dados sob a LGPD.',
      `A ${TERMS_BRAND} atua exclusivamente como intermediadora tecnológica. A execução física da tatuagem, a avaliação clínica prévia, a assepsia e o resultado artístico são de responsabilidade exclusiva do profissional e/ou do estúdio contratado.`,
    ],
  },
  {
    id: 'elegibilidade',
    title: '2. Elegibilidade, Idade Mínima e Responsáveis Legais',
    paragraphs: [
      'É terminantemente proibido o cadastro e o uso da Plataforma por menores de 14 (quatorze) anos de idade. Constatado o cadastro de criança ou adolescente com menos de 14 anos, a conta será imediatamente suspensa e excluída, sem prejuízo das medidas legais cabíveis.',
      'Para usuários com idade entre 15 (quinze) e 17 (dezessete) anos incompletos, o cadastro e qualquer contratação de procedimento somente serão permitidos com o consentimento e a supervisão expressa de um responsável legal, que deverá:',
      'O responsável legal responde solidariamente por todas as obrigações, informações e condutas do menor na Plataforma, nos termos do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).',
      'A realização de procedimento de tatuagem em menor de 18 anos está sujeita, ainda, às restrições e exigências da legislação estadual e municipal aplicável, incluindo eventual necessidade de autorização escrita e presença do responsável no momento do atendimento.',
    ],
    bullets: [
      'Declarar, sob as penas da lei, sua qualidade de responsável legal;',
      'Fornecer nome completo e CPF válidos, aceitando a verificação de documentos;',
      'Autorizar expressamente o uso da Plataforma e de seus dados pelo menor;',
      'Acompanhar e autorizar de forma inequívoca cada agendamento.',
    ],
  },
  {
    id: 'marketplace',
    title: '3. Regras do Marketplace e Padrões Elite',
    paragraphs: [
      `A ${TERMS_BRAND} reúne profissionais e estúdios que aderem a padrões elevados de qualidade ("Padrões Elite"). O selo Elite está condicionado à verificação de identidade, registro profissional, conformidade sanitária e histórico de avaliações.`,
      'Para preservar a confiança do ecossistema, é vedado:',
      'A Plataforma pode aprovar, recusar, suspender ou remover perfis, portfólios, imagens e ofertas que violem estes Termos, os Padrões Elite, as regras sanitárias ou a legislação vigente.',
    ],
    bullets: [
      'Negociar, orçar ou cobrar fora da Plataforma (cobranças paralelas);',
      'Divulgar portfólio com imagens de terceiros sem autorização ou que induzam a erro;',
      'Atuar sem documentação sanitária e profissional regular;',
      'Utilizar a marca, o selo Elite ou o nome da Plataforma sem autorização, ou de forma enganosa.',
    ],
  },
  {
    id: 'financeiro',
    title: '4. Agendamento, Calção e Financeiro',
    paragraphs: [
      'O agendamento é confirmado somente após a retenção da calção de 25% (vinte e cinco por cento) do valor do serviço, que tem natureza de sinal e garantia de comparecimento.',
      'O valor cobrado do cliente é calculado exclusivamente pela Plataforma. A interface repassa de forma transparente a taxa do gateway quando o pagamento for realizado por cartão de crédito, mantendo-se o valor exato quando a opção for PIX.',
      'O repasse aos profissionais/estúdios (split) é realizado sobre o valor líquido original do serviço, ignorando acréscimos de taxa de cartão, na proporção vigente: Autônomo (90/9/1) ou Estúdio (88/8/3/1).',
      'O status do agendamento só é alterado de "pendente" para "pago" após a confirmação de sucesso do gateway de pagamento. A Plataforma utiliza chaves de idempotência para impedir cobranças duplicadas em oscilações de rede.',
    ],
  },
  {
    id: 'cancelamento',
    title: '5. Cancelamento, Reagendamento e Reembolso',
    paragraphs: [
      'O cancelamento pelo cliente exige autenticação reforçada (e-mail, senha e verificação OTP de 6 dígitos).',
      'O cancelamento deve ser solicitado com antecedência mínima de 3 (três) dias da data agendada. Solicitações fora do prazo podem acarretar retenção total ou parcial da calção, a critério das regras do profissional e da análise da Plataforma.',
      'Reagendamentos seguem a disponibilidade do profissional e permanecem sujeitos à política de prazo acima.',
      'Reembolsos, quando devidos, serão processados pelo mesmo meio de pagamento utilizado, nos prazos do gateway e da instituição financeira.',
    ],
  },
  {
    id: 'conduta',
    title: '6. Conduta, Chat e Moderação',
    paragraphs: [
      'O chat da Plataforma é monitorado por Inteligência Artificial para coibir fraudes, assédio e negociações fora da Plataforma.',
      'É proibido:',
      'O descumprimento destas regras pode resultar em advertência, remoção de conteúdo, suspensão temporária ou banimento definitivo, conforme a gravidade.',
    ],
    bullets: [
      'Enviar links externos, chaves PIX, dados bancários ou meios de pagamento de terceiros;',
      'Utilizar linguagem ofensiva, discriminatória, ameaçadora ou de assédio;',
      'Solicitar ou negociar pagamento por fora da Plataforma;',
      'Compartilhar dados pessoais de terceiros sem consentimento.',
    ],
  },
  {
    id: 'kyc',
    title: '7. Verificação de Documentos Pessoais e Segurança Sanitária',
    paragraphs: [
      'Tatuadores e estúdios declaram e garantem que os dados fornecidos (CPF/CNPJ, documentos sanitários, alvarás, diplomas e certificações) são verdadeiros, válidos e atualizados.',
      'A documentação poderá ser verificada pela Plataforma. Informações falsas, adulteradas ou vencidas levam à suspensão imediata do perfil e ao bloqueio de repasses pendentes.',
      'Materiais, ambiente e boas práticas de biossegurança são de responsabilidade exclusiva do profissional e/ou do estúdio, que deve seguir as normas da vigilância sanitária.',
    ],
  },
  {
    id: 'lgpd',
    title: '8. Proteção de Dados e Privacidade (LGPD)',
    paragraphs: [
      'Os dados pessoais são tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e demais normas aplicáveis. O tratamento ocorre para viabilizar o cadastro, a conexão entre as partes, a segurança, a prevenção a fraudes e o cumprimento de obrigações legais.',
      'A Plataforma adota medidas técnicas e organizacionais de segurança, incluindo criptografia, controle de acesso e mascaramento de dados sensíveis (CPF, e-mail e dados bancários) nas interfaces aplicáveis.',
      'O titular pode exercer os direitos de confirmação, acesso, correção, anonimização, portabilidade, eliminação e revogação de consentimento por meio dos canais oficiais de atendimento, observados os prazos legais.',
      'Dados podem ser compartilhados com prestadores essenciais (gateway de pagamento, verificação de identidade e provedores de infraestrutura), sempre limitados à finalidade e com salvaguardas contratuais.',
    ],
  },
  {
    id: 'propriedade',
    title: '9. Propriedade Intelectual e Conteúdo',
    paragraphs: [
      'O artista mantém a titularidade de suas obras. Ao publicar na Plataforma, concede licença não exclusiva para exibição, divulgação e armazenamento das imagens no âmbito do serviço.',
      'É vedado reproduzir, copiar ou explorar conteúdo de terceiros sem autorização, bem como utilizar a identidade visual da Plataforma de forma indevida.',
    ],
  },
  {
    id: 'conta',
    title: '10. Suspensão, Banimento e Exclusão de Conta',
    paragraphs: [
      'A Plataforma poderá suspender ou encerrar contas que violem estes Termos, a legislação vigente ou comprometam a segurança do ecossistema, garantido o contraditório quando cabível.',
      'O usuário pode solicitar a exclusão da conta. A desativação oculta o perfil, mas determinados registros poderão ser mantidos pelo prazo legal e para prevenção a fraudes.',
      'A violação de cláusulas financeiras, a negociação fora da Plataforma e o uso de dados falsos constituem infrações graves, sujeitas a banimento imediato.',
    ],
  },
  {
    id: 'gerais',
    title: '11. Disposições Gerais',
    paragraphs: [
      'Estes Termos podem ser atualizados a qualquer momento. A versão vigente será sempre exibida nesta Plataforma e o uso continuado implica concordância com a nova redação.',
      'Eventual tolerância quanto ao descumprimento não constitui renúncia ou novação.',
      'Fica eleito o foro do domicílio do consumidor para dirimir controvérsias, quando aplicável a legislação consumerista.',
      `Ao marcar "Aceito os Termos", o usuário confirma que leu integralmente e concorda com todas as cláusulas acima (versão ${TERMS_VERSION}).`,
    ],
  },
];

/**
 * Representação em texto puro dos termos, mantida para compatibilidade com
 * consumidores que renderizam uma string (ex.: exports, logs ou fallback).
 */
export const TERMS_TEXT = [
  `${TERMS_TITLE.toUpperCase()} ${TERMS_BRAND} (versão ${TERMS_VERSION})`,
  '',
  ...TERMS_SECTIONS.flatMap((section) => [
    section.title.toUpperCase(),
    ...section.paragraphs,
    ...(section.bullets ? section.bullets.map((bullet) => `- ${bullet}`) : []),
    '',
  ]),
].join('\n');
