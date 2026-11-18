import { Badge } from '@/components/ui/badge';
import {
  cn,
  PAYMENT_STATUS_META,
  REGISTRATION_STATUS_META,
} from '@/lib/utils';
import type { PaymentStatus, PlayerRegistrationStatus } from '@/types/database';

export function RegistrationStatusBadge({ status }: { status: PlayerRegistrationStatus }) {
  const meta = REGISTRATION_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn('font-semibold', meta.className)}>
      {meta.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn('font-semibold', meta.className)}>
      {meta.label}
    </Badge>
  );
}
