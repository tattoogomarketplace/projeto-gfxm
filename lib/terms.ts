import { BRAND_MARKETPLACE, BRAND_NAME } from '@/lib/i18n/brands';
import type { Locale } from '@/lib/i18n/types';

export const TERMS_BRAND = `${BRAND_NAME} (${BRAND_MARKETPLACE})`;
export const TERMS_UPDATED_AT = '2026-06-01';

export interface TermsClause {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface TermsDocument {
  title: string;
  updatedAt: string;
  sections: TermsClause[];
}

/**
 * Fonte única de verdade para os Termos de Uso e Política de Privacidade.
 * O conteúdo é resolvido dinamicamente pelo idioma ativo do usuário, com
 * `pt-BR` como canônico e fallbacks estruturais em inglês e espanhol para os
 * demais idiomas suportados.
 */
export const PT_BR: TermsDocument = {
  title: 'Termos de Uso e Política de Privacidade',
  updatedAt: TERMS_UPDATED_AT,
  sections: [
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
        'O cancelamento deve ser solicitado preferencialmente com antecedência mínima de 3 (três) dias da data agendada. Solicitações realizadas em prazo inferior a 3 (três) dias deverão ser tratadas diretamente com o suporte ao cliente, e o cancelamento e o reembolso regular serão processados corretamente. Advertimos, contudo, que 3 (três) ou mais ocorrências de cancelamentos com curto prazo de antecedência sujeitam a conta à suspensão, e 5 (cinco) ou mais ocorrências recorrentes sujeitam a conta ao banimento permanente.',
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
      id: 'documentos-pessoais',
      title: '7. Verificação de Documentos Pessoais e Segurança Sanitária',
      paragraphs: [
        'Tatuadores e estúdios declaram e garantem que os dados fornecidos (CPF/CNPJ, documentos sanitários, alvarás, diplomas e certificações) são verdadeiros, válidos e atualizados.',
        'Para viabilizar a verificação de identidade por CPF e a recuperação de conta, a Plataforma poderá solicitar o envio de documentos pessoais e prova de vida. Esses arquivos são armazenados de forma cifrada, com acesso restrito, e utilizados exclusivamente para validação de identidade, recuperação de conta e prevenção a fraudes.',
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
        'O tratamento de dados de verificação de identidade (CPF, documentos pessoais e prova de vida) observa as bases legais de cumprimento de obrigação legal, execução de contrato e legítimo interesse para prevenção a fraudes, com retenção limitada ao necessário e descarte seguro após o prazo legal.',
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
      id: 'seguranca-identidade',
      title: '11. Segurança da Conta, Recuperação de Identidade e Bloqueio de Nome de Usuário',
      paragraphs: [
        'A verificação de CPF é obrigatória para tatuadores, estúdios e demais perfis que ofertam serviços, assegurando que cada identidade corresponda a um titular único e verificável.',
        'Em processos de recuperação de identidade ou disputas de titularidade, a Plataforma poderá solicitar o envio de documentos e prova de vida. Os dados são tratados de forma confidencial, cifrados em repouso e em trânsito, e acessados apenas por equipe autorizada sob dever de sigilo.',
        'A Plataforma reserva nomes de usuário (usernames) verificados para prevenir usurpação de identidade, fraude e falsidade ideológica. Nomes de usuário podem ser bloqueados, reservados ou liberados conforme política antifraude, garantindo exclusividade e segurança da marca pessoal do titular.',
      ],
      bullets: [
        'Dados de verificação de identidade e documentos enviados são usados exclusivamente para validação, recuperação de conta e prevenção a fraudes, jamais para fins publicitários;',
        'Documentos de identidade são armazenados cifrados e excluídos com segurança após o prazo legal de retenção;',
        'Nomes de usuário bloqueados por impersonação ou fraude não são liberados sem análise de segurança.',
      ],
    },
    {
      id: 'gerais',
      title: '12. Disposições Gerais',
      paragraphs: [
        'Estes Termos podem ser atualizados a qualquer momento. A versão vigente será sempre exibida nesta Plataforma e o uso continuado implica concordância com a nova redação.',
        'Eventual tolerância quanto ao descumprimento não constitui renúncia ou novação.',
        'Fica eleito o foro do domicílio do consumidor para dirimir controvérsias, quando aplicável a legislação consumerista.',
        'Ao marcar "Aceito os Termos", o usuário confirma que leu integralmente e concorda com todas as cláusulas acima.',
      ],
    },
  ],
};

export const EN: TermsDocument = {
  title: 'Terms of Use and Privacy Policy',
  updatedAt: TERMS_UPDATED_AT,
  sections: [
    {
      id: 'aceitacao',
      title: '1. Acceptance and Purpose',
      paragraphs: [
        `These Terms of Use and Privacy Policy govern access to and use of the ${TERMS_BRAND} ecosystem ("Platform"), a marketplace connecting clients, independent tattoo artists and tattoo studios.`,
        'By registering, browsing, hiring or offering services, the user declares that they have read, understood and fully accepted these clauses, as well as the Privacy Policy and data processing under applicable data protection law.',
        `${TERMS_BRAND} acts solely as a technology intermediary. The physical execution of the tattoo, prior clinical assessment, asepsis and the artistic result are the sole responsibility of the contracted professional and/or studio.`,
      ],
    },
    {
      id: 'elegibilidade',
      title: '2. Eligibility, Minimum Age and Legal Guardians',
      paragraphs: [
        'Registration and use of the Platform by anyone under 14 (fourteen) years of age is strictly prohibited. If an account belonging to a child under 14 is found, it will be immediately suspended and deleted, without prejudice to applicable legal measures.',
        'For users aged between 15 (fifteen) and 17 (seventeen) years incomplete, registration and any service hiring will only be allowed with the express consent and supervision of a legal guardian, who must:',
        'The legal guardian is jointly liable for all obligations, information and conduct of the minor on the Platform, under the Child and Adolescent Statute (Law No. 8,069/1990).',
        'Tattooing a minor under 18 is also subject to the restrictions and requirements of applicable state and municipal legislation, including any requirement for written authorization and the guardian\'s presence at the appointment.',
      ],
      bullets: [
        'Declare, under penalty of law, their status as legal guardian;',
        'Provide a valid full name and CPF, accepting document verification;',
        'Expressly authorize the minor\'s use of the Platform and their data;',
        'Follow and unequivocally authorize each appointment.',
      ],
    },
    {
      id: 'marketplace',
      title: '3. Marketplace Rules and Elite Standards',
      paragraphs: [
        `${TERMS_BRAND} brings together professionals and studios that adhere to high quality standards ("Elite Standards"). The Elite badge is subject to identity verification, professional registration, health compliance and review history.`,
        'To preserve the trust of the ecosystem, it is forbidden to:',
        'The Platform may approve, refuse, suspend or remove profiles, portfolios, images and offers that violate these Terms, the Elite Standards, health rules or current legislation.',
      ],
      bullets: [
        'Negotiate, quote or charge outside the Platform (parallel billing);',
        'Publish portfolios with third-party images without authorization or that mislead;',
        'Operate without regular health and professional documentation;',
        'Use the brand, the Elite badge or the Platform name without authorization or deceptively.',
      ],
    },
    {
      id: 'financeiro',
      title: '4. Booking, Deposit and Payments',
      paragraphs: [
        'The booking is confirmed only after retention of a 25% (twenty-five percent) deposit of the service value, which serves as a sign and guarantee of attendance.',
        'The amount charged to the client is calculated exclusively by the Platform. The interface transparently passes on the gateway fee when payment is made by credit card, keeping the exact amount when the option is PIX.',
        'Payouts to professionals/studios (split) are made on the original net service value, ignoring card fee additions, under the current proportion: Independent (90/9/1) or Studio (88/8/3/1).',
        'The booking status only changes from "pending" to "paid" after confirmation of payment gateway success. The Platform uses idempotency keys to prevent duplicate charges during network fluctuations.',
      ],
    },
    {
      id: 'cancelamento',
      title: '5. Cancellation, Rescheduling and Refunds',
      paragraphs: [
        'Client cancellation requires reinforced authentication (email, password and 6-digit OTP verification).',
        'Cancellation should preferably be requested at least 3 (three) days before the scheduled date. Requests made less than 3 (three) days in advance must be handled directly with customer support, and regular cancellation and refunds will be processed correctly. We warn, however, that 3 (three) or more short-notice cancellations subject the account to suspension, and 5 (five) or more recurring occurrences subject the account to permanent banning.',
        'Rescheduling follows the professional\'s availability and remains subject to the notice policy above.',
        'Refunds, when due, will be processed through the same payment method used, within the deadlines of the gateway and the financial institution.',
      ],
    },
    {
      id: 'conduta',
      title: '6. Conduct, Chat and Moderation',
      paragraphs: [
        'The Platform chat is monitored by Artificial Intelligence to curb fraud, harassment and negotiations outside the Platform.',
        'It is forbidden to:',
        'Failure to comply with these rules may result in a warning, content removal, temporary suspension or permanent banning, depending on severity.',
      ],
      bullets: [
        'Send external links, PIX keys, bank details or third-party payment methods;',
        'Use offensive, discriminatory, threatening or harassing language;',
        'Request or negotiate payment outside the Platform;',
        'Share third-party personal data without consent.',
      ],
    },
    {
      id: 'documentos-pessoais',
      title: '7. Personal Document Verification and Health Safety',
      paragraphs: [
        'Tattoo artists and studios declare and warrant that the data provided (CPF/CNPJ, health documents, licenses, diplomas and certifications) is true, valid and up to date.',
        'To enable CPF-based identity verification and account recovery, the Platform may request the submission of personal documents and a liveness check. These files are stored encrypted, with restricted access, and used exclusively for identity validation, account recovery and fraud prevention.',
        'Documentation may be verified by the Platform. False, tampered or expired information leads to immediate profile suspension and blocking of pending payouts.',
        'Materials, environment and biosafety best practices are the sole responsibility of the professional and/or studio, who must follow health surveillance regulations.',
      ],
    },
    {
      id: 'lgpd',
      title: '8. Data Protection and Privacy',
      paragraphs: [
        'Personal data is processed in accordance with applicable data protection law. Processing is carried out to enable registration, connection between parties, security, fraud prevention and compliance with legal obligations.',
        'The Platform adopts technical and organizational security measures, including encryption, access control and masking of sensitive data (CPF, email and bank details) in applicable interfaces.',
        'Processing of identity verification data (CPF, personal documents and liveness check) relies on the legal bases of compliance with a legal obligation, contract performance and legitimate interest in fraud prevention, with retention limited to what is necessary and secure disposal after the legal period.',
        'The data subject may exercise their rights of confirmation, access, correction, anonymization, portability, deletion and consent withdrawal through official support channels, subject to legal deadlines.',
        'Data may be shared with essential providers (payment gateway, identity verification and infrastructure providers), always limited to the purpose and with contractual safeguards.',
      ],
    },
    {
      id: 'propriedade',
      title: '9. Intellectual Property and Content',
      paragraphs: [
        'The artist retains ownership of their works. By publishing on the Platform, they grant a non-exclusive license to display, disclose and store the images within the scope of the service.',
        'It is forbidden to reproduce, copy or exploit third-party content without authorization, as well as to misuse the Platform\'s visual identity.',
      ],
    },
    {
      id: 'conta',
      title: '10. Suspension, Banning and Account Deletion',
      paragraphs: [
        'The Platform may suspend or terminate accounts that violate these Terms, current legislation or compromise the security of the ecosystem, ensuring the right to defend when applicable.',
        'The user may request account deletion. Deactivation hides the profile, but certain records may be kept for the legal period and for fraud prevention.',
        'Violation of financial clauses, negotiation outside the Platform and the use of false data constitute serious infractions, subject to immediate banning.',
      ],
    },
    {
      id: 'seguranca-identidade',
      title: '11. Account Security, Identity Recovery and Username Locks',
      paragraphs: [
        'CPF verification is mandatory for tattoo artists, studios and other profiles that offer services, ensuring that each identity corresponds to a unique, verifiable holder.',
        'In identity recovery processes or ownership disputes, the Platform may request the submission of documents and a liveness check. The data is treated confidentially, encrypted at rest and in transit, and accessed only by authorized staff under a duty of confidentiality.',
        'The Platform reserves verified usernames to prevent identity usurpation, fraud and impersonation. Usernames may be locked, reserved or released according to anti-fraud policy, ensuring exclusivity and security of the holder\'s personal brand.',
      ],
      bullets: [
        'Identity verification data and submitted documents are used exclusively for validation, account recovery and fraud prevention, never for advertising purposes;',
        'Identity documents are stored encrypted and securely deleted after the legal retention period;',
        'Usernames locked for impersonation or fraud are not released without a security review.',
      ],
    },
    {
      id: 'gerais',
      title: '12. General Provisions',
      paragraphs: [
        'These Terms may be updated at any time. The current version will always be displayed on this Platform and continued use implies agreement with the new wording.',
        'Any tolerance regarding non-compliance does not constitute waiver or novation.',
        'The courts of the consumer\'s domicile are elected to settle disputes, when consumer legislation applies.',
        'By checking "I accept the Terms", the user confirms that they have fully read and agree to all clauses above.',
      ],
    },
  ],
};

export const ES: TermsDocument = {
  title: 'Términos de Uso y Política de Privacidad',
  updatedAt: TERMS_UPDATED_AT,
  sections: [
    {
      id: 'aceitacao',
      title: '1. Aceptación y Objeto',
      paragraphs: [
        `Los presentes Términos de Uso y Política de Privacidad regulan el acceso y el uso del ecosistema ${TERMS_BRAND} ("Plataforma"), un marketplace que conecta clientes, tatuadores autónomos y estudios de tatuaje.`,
        'Al registrarse, navegar, contratar u ofrecer servicios, el usuario declara haber leído, comprendido y aceptado íntegramente estas cláusulas, así como la Política de Privacidad y el tratamiento de datos conforme a la legislación de protección de datos.',
        `${TERMS_BRAND} actúa exclusivamente como intermediaria tecnológica. La ejecución física del tatuaje, la evaluación clínica previa, la asepsia y el resultado artístico son responsabilidad exclusiva del profesional y/o del estudio contratado.`,
      ],
    },
    {
      id: 'elegibilidade',
      title: '2. Elegibilidad, Edad Mínima y Responsables Legales',
      paragraphs: [
        'Queda terminantemente prohibido el registro y el uso de la Plataforma por menores de 14 (catorce) años. Constatado el registro de un menor de 14 años, la cuenta será inmediatamente suspendida y eliminada, sin perjuicio de las medidas legales aplicables.',
        'Para usuarios con edad entre 15 (quince) y 17 (diecisiete) años incompletos, el registro y cualquier contratación de procedimiento solo se permitirán con el consentimiento y la supervisión expresa de un responsable legal, que deberá:',
        'El responsable legal responde solidariamente por todas las obligaciones, informaciones y conductas del menor en la Plataforma.',
        'La realización de un procedimiento de tatuaje en un menor de 18 años está sujeta, además, a las restricciones y exigencias de la legislación estatal y municipal aplicable, incluida la eventual necesidad de autorización escrita y presencia del responsable en el momento de la atención.',
      ],
      bullets: [
        'Declarar, bajo pena de ley, su condición de responsable legal;',
        'Proporcionar nombre completo y CPF válidos, aceptando la verificación de documentos;',
        'Autorizar expresamente el uso de la Plataforma y de sus datos por el menor;',
        'Acompañar y autorizar de forma inequívoca cada cita.',
      ],
    },
    {
      id: 'marketplace',
      title: '3. Reglas del Marketplace y Estándares Elite',
      paragraphs: [
        `${TERMS_BRAND} reúne profesionales y estudios que cumplen altos estándares de calidad ("Estándares Elite"). El sello Elite está condicionado a la verificación de identidad, registro profesional, conformidad sanitaria e historial de evaluaciones.`,
        'Para preservar la confianza del ecosistema, queda prohibido:',
        'La Plataforma puede aprobar, rechazar, suspender o eliminar perfiles, portafolios, imágenes y ofertas que violen estos Términos, los Estándares Elite, las reglas sanitarias o la legislación vigente.',
      ],
      bullets: [
        'Negociar, presupuestar o cobrar fuera de la Plataforma (cobros paralelos);',
        'Publicar portafolios con imágenes de terceros sin autorización o que induzcan a error;',
        'Actuar sin documentación sanitaria y profesional regular;',
        'Utilizar la marca, el sello Elite o el nombre de la Plataforma sin autorización o de forma engañosa.',
      ],
    },
    {
      id: 'financeiro',
      title: '4. Cita, Depósito y Financiero',
      paragraphs: [
        'La cita se confirma solo tras la retención del depósito del 25% (veinticinco por ciento) del valor del servicio, que tiene naturaleza de señal y garantía de comparecencia.',
        'El valor cobrado al cliente es calculado exclusivamente por la Plataforma. La interfaz transfiere de forma transparente la tarifa del gateway cuando el pago se realiza con tarjeta de crédito, manteniéndose el valor exacto cuando la opción sea PIX.',
        'El reparto a los profesionales/estudios (split) se realiza sobre el valor neto original del servicio, ignorando los recargos de tarifa de tarjeta, en la proporción vigente: Autónomo (90/9/1) o Estudio (88/8/3/1).',
        'El estado de la cita solo cambia de "pendiente" a "pagado" tras la confirmación de éxito del gateway de pago. La Plataforma utiliza claves de idempotencia para impedir cobros duplicados en oscilaciones de red.',
      ],
    },
    {
      id: 'cancelamento',
      title: '5. Cancelación, Reprogramación y Reembolso',
      paragraphs: [
        'La cancelación por parte del cliente exige autenticación reforzada (correo, contraseña y verificación OTP de 6 dígitos).',
        'La cancelación debe solicitarse preferentemente con una antelación mínima de 3 (tres) días de la fecha agendada. Las solicitudes realizadas con menos de 3 (tres) días deberán tratarse directamente con el soporte al cliente. Advertimos que 3 (tres) o más cancelaciones con poca antelación sujetan la cuenta a suspensión, y 5 (cinco) o más ocurrencias recurrentes sujetan la cuenta a suspensión permanente.',
        'Las reprogramaciones siguen la disponibilidad del profesional y permanecen sujetas a la política de plazo anterior.',
        'Los reembolsos, cuando correspondan, se procesarán por el mismo medio de pago utilizado, en los plazos del gateway y de la institución financiera.',
      ],
    },
    {
      id: 'conduta',
      title: '6. Conducta, Chat y Moderación',
      paragraphs: [
        'El chat de la Plataforma es monitoreado por Inteligencia Artificial para frenar fraudes, acoso y negociaciones fuera de la Plataforma.',
        'Queda prohibido:',
        'El incumplimiento de estas reglas puede resultar en advertencia, eliminación de contenido, suspensión temporal o suspensión definitiva, según la gravedad.',
      ],
      bullets: [
        'Enviar enlaces externos, claves PIX, datos bancarios o medios de pago de terceros;',
        'Utilizar lenguaje ofensivo, discriminatorio, amenazador o de acoso;',
        'Solicitar o negociar pago fuera de la Plataforma;',
        'Compartir datos personales de terceros sin consentimiento.',
      ],
    },
    {
      id: 'documentos-pessoais',
      title: '7. Verificación de Documentos Personales y Seguridad Sanitaria',
      paragraphs: [
        'Los tatuadores y estudios declaran y garantizan que los datos proporcionados (CPF/CNPJ, documentos sanitarios, licencias, diplomas y certificaciones) son verdaderos, válidos y actualizados.',
        'Para viabilizar la verificación de identidad por CPF y la recuperación de cuenta, la Plataforma podrá solicitar el envío de documentos personales y prueba de vida. Estos archivos se almacenan cifrados, con acceso restringido, y se utilizan exclusivamente para validación de identidad, recuperación de cuenta y prevención de fraudes.',
        'La documentación podrá ser verificada por la Plataforma. Informaciones falsas, adulteradas o vencidas conllevan la suspensión inmediata del perfil y el bloqueo de repartos pendientes.',
        'Los materiales, el ambiente y las buenas prácticas de bioseguridad son responsabilidad exclusiva del profesional y/o del estudio, que debe seguir las normas de la vigilancia sanitaria.',
      ],
    },
    {
      id: 'lgpd',
      title: '8. Protección de Datos y Privacidad',
      paragraphs: [
        'Los datos personales se tratan de conformidad con la legislación de protección de datos aplicable. El tratamiento se realiza para viabilizar el registro, la conexión entre las partes, la seguridad, la prevención de fraudes y el cumplimiento de obligaciones legales.',
        'La Plataforma adopta medidas técnicas y organizativas de seguridad, incluidas cifrado, control de acceso y enmascaramiento de datos sensibles (CPF, correo y datos bancarios) en las interfaces aplicables.',
        'El tratamiento de datos de verificación de identidad (CPF, documentos personales y prueba de vida) se ampara en las bases legales de cumplimiento de obligación legal, ejecución de contrato e interés legítimo en la prevención de fraudes, con retención limitada a lo necesario y descarte seguro tras el plazo legal.',
        'El titular puede ejercer los derechos de confirmación, acceso, corrección, anonimización, portabilidad, eliminación y revocación de consentimiento a través de los canales oficiales de atención, observados los plazos legales.',
        'Los datos pueden compartirse con proveedores esenciales (gateway de pago, verificación de identidad y proveedores de infraestructura), siempre limitados a la finalidad y con salvaguardas contractuales.',
      ],
    },
    {
      id: 'propriedade',
      title: '9. Propiedad Intelectual y Contenido',
      paragraphs: [
        'El artista mantiene la titularidad de sus obras. Al publicar en la Plataforma, concede una licencia no exclusiva para exhibir, divulgar y almacenar las imágenes en el ámbito del servicio.',
        'Queda prohibido reproducir, copiar o explotar contenido de terceros sin autorización, así como utilizar indebidamente la identidad visual de la Plataforma.',
      ],
    },
    {
      id: 'conta',
      title: '10. Suspensión, Expulsión y Eliminación de Cuenta',
      paragraphs: [
        'La Plataforma podrá suspender o cerrar cuentas que violen estos Términos, la legislación vigente o comprometan la seguridad del ecosistema, garantizado el derecho de defensa cuando corresponda.',
        'El usuario puede solicitar la eliminación de la cuenta. La desactivación oculta el perfil, pero determinados registros podrán mantenerse por el plazo legal y para prevención de fraudes.',
        'La violación de cláusulas financieras, la negociación fuera de la Plataforma y el uso de datos falsos constituyen infracciones graves, sujetas a expulsión inmediata.',
      ],
    },
    {
      id: 'seguranca-identidade',
      title: '11. Seguridad de la Cuenta, Recuperación de Identidad y Bloqueo de Nombre de Usuario',
      paragraphs: [
        'La verificación de CPF es obligatoria para tatuadores, estudios y demás perfiles que ofrecen servicios, asegurando que cada identidad corresponda a un titular único y verificable.',
        'En procesos de recuperación de identidad o disputas de titularidad, la Plataforma podrá solicitar el envío de documentos y prueba de vida. Los datos se tratan de forma confidencial, cifrados en reposo y en tránsito, y se acceden únicamente por personal autorizado bajo deber de secreto.',
        'La Plataforma reserva nombres de usuario verificados para prevenir la usurpación de identidad, el fraude y la suplantación. Los nombres de usuario pueden bloquearse, reservarse o liberarse según la política antifraude, garantizando exclusividad y seguridad de la marca personal del titular.',
      ],
      bullets: [
        'Los datos de verificación de identidad y los documentos enviados se utilizan exclusivamente para validación, recuperación de cuenta y prevención de fraudes, nunca con fines publicitarios;',
        'Los documentos de identidad se almacenan cifrados y se eliminan de forma segura tras el plazo legal de retención;',
        'Los nombres de usuario bloqueados por suplantación o fraude no se liberan sin una revisión de seguridad.',
      ],
    },
    {
      id: 'gerais',
      title: '12. Disposiciones Generales',
      paragraphs: [
        'Estos Términos pueden actualizarse en cualquier momento. La versión vigente será siempre mostrada en esta Plataforma y el uso continuado implica conformidad con la nueva redacción.',
        'Cualquier tolerancia respecto al incumplimiento no constituye renuncia o novación.',
        'Se elige el fuero del domicilio del consumidor para dirimir controversias, cuando sea aplicable la legislación de consumo.',
        'Al marcar "Acepto los Términos", el usuario confirma que ha leído íntegramente y acepta todas las cláusulas anteriores.',
      ],
    },
  ],
};

const TERMS_DOCUMENTS: Partial<Record<Locale, TermsDocument>> = {
  'pt-BR': PT_BR,
  'pt-PT': PT_BR,
  en: EN,
  es: ES,
};

/** Resolve o documento de termos para o idioma ativo, com fallback em inglês. */
export function getTermsDocument(locale: Locale | string): TermsDocument {
  const normalized = String(locale ?? '').toLowerCase();
  if (normalized.startsWith('pt')) return PT_BR;
  if (normalized.startsWith('es')) return ES;
  const direct = TERMS_DOCUMENTS[normalized as Locale];
  return direct ?? EN;
}

/** Compatibilidade: título canônico em pt-BR. */
export const TERMS_TITLE = PT_BR.title;

/** Compatibilidade: cláusulas canônicas em pt-BR. */
export const TERMS_SECTIONS = PT_BR.sections;

/**
 * Representação em texto puro (pt-BR) dos termos, mantida para compatibilidade
 * com consumidores que renderizam uma string (ex.: exports, logs ou fallback).
 */
export const TERMS_TEXT = [
  `${TERMS_TITLE.toUpperCase()} ${TERMS_BRAND}`,
  '',
  ...TERMS_SECTIONS.flatMap((section) => [
    section.title.toUpperCase(),
    ...section.paragraphs,
    ...(section.bullets ? section.bullets.map((bullet) => `- ${bullet}`) : []),
    '',
  ]),
].join('\n');
