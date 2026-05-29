import { QcLhuSections } from '../../components/qc/lhu/QcLhuSections';
import { useQcLhuPage } from '../../components/qc/lhu/useQcLhuPage';

export function QcLhuPage({ initialLhuNumber = '' }) {
  const page = useQcLhuPage({ initialLhuNumber });

  return <QcLhuSections {...page} />;
}
