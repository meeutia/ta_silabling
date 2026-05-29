import { StatusHistorySections } from '../../components/pelanggan/history/StatusHistorySections';
import { useStatusHistoryPage } from '../../components/pelanggan/history/useStatusHistoryPage';

export function PelangganRiwayatPage({
  onViewDetail,
  authToken,
  onSessionExpired,
  paymentReturnInfo,
  onPaymentReturnConsumed,
}) {
  const page = useStatusHistoryPage({
    authToken,
    onSessionExpired,
    onViewDetail,
    paymentReturnInfo,
    onPaymentReturnConsumed,
  });

  return <StatusHistorySections {...page} />;
}
