'use client';

import { ProfessionalKycPanel, type KycStatusValue } from '@/components/features/professional-kyc-panel';

export function DocumentosPessoaisForm({
  userId: _userId,
  status = 'pendente',
  onStatusChange,
}: {
  userId?: string;
  status?: KycStatusValue | string;
  onStatusChange?: (status: KycStatusValue) => void;
}) {
  void _userId;
  return <ProfessionalKycPanel status={status} onStatusChange={onStatusChange} />;
}
