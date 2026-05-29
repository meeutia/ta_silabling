import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../../api/httpClient';
import { penyeliaPenugasanApi } from '../../../api/penyeliaPenugasanApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  getSubkontrakRowKey,
  getTodayInputValue,
  isValidResultExpression,
} from './penyeliaPenugasanUtils';

export function usePenyeliaSubkontrakResults({ onAfterSave } = {}) {
  const [subkontrakRows, setSubkontrakRows] = useState([]);
  const [loadingSubkontrak, setLoadingSubkontrak] = useState(true);
  const [subkontrakDrafts, setSubkontrakDrafts] = useState({});
  const [selectedSubkontrakGroup, setSelectedSubkontrakGroup] = useState(null);
  const [savingSubkontrak, setSavingSubkontrak] = useState(false);

  const fetchSubkontrakRows = useCallback(async () => {
    setLoadingSubkontrak(true);

    try {
      const rows = await penyeliaPenugasanApi.getSubkontrakItems();
      setSubkontrakRows(rows || []);

      const draftMap = {};

      (rows || []).forEach((row) => {
        const key = getSubkontrakRowKey(row);

        draftMap[key] = {
          hasil: row.hasil || '',
          tanggal_terima_hasil:
            row.tanggal_terima_hasil ||
            row.tanggalTerimaHasil ||
            getTodayInputValue(),
        };
      });

      setSubkontrakDrafts(draftMap);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal terhubung ke server saat memuat subkontrak.'));
    } finally {
      setLoadingSubkontrak(false);
    }
  }, []);

  useEffect(() => {
    fetchSubkontrakRows();
  }, [fetchSubkontrakRows]);

  const groupedSubkontrakRows = useMemo(() => {
    const map = new Map();

    subkontrakRows.forEach((row) => {
      const idFpplParameterMetode =
        row.id_fppl_parameter_metode || row.idFpplParameterMetode;

      if (!idFpplParameterMetode) return;

      if (!map.has(idFpplParameterMetode)) {
        map.set(idFpplParameterMetode, {
          id: idFpplParameterMetode,
          kodeLka: row.kode_lka || row.kodeLka || null,
          idPenugasanDetail:
            row.id_penugasan_detail || row.idPenugasanDetail || null,
          parameter: row.nama_parameter || row.namaParameter || '-',
          metode: row.nama_metode || row.namaMetode || '-',
          acuanMetode: row.acuan_metode || row.acuanMetode || '-',
          pelanggan: row.pelanggan || '-',
          jenisSampel: row.jenis_sampel || row.jenisSampel || '-',
          rows: [],
        });
      }

      map.get(idFpplParameterMetode).rows.push(row);
    });

    return Array.from(map.values())
      .map((group) => {
        const sortedRows = [...group.rows].sort((a, b) => {
          const keyA = getSubkontrakRowKey(a);
          const keyB = getSubkontrakRowKey(b);
          const draftA = subkontrakDrafts[keyA] || {};
          const draftB = subkontrakDrafts[keyB] || {};
          const filledA = Boolean(String(draftA.hasil || a.hasil || '').trim());
          const filledB = Boolean(String(draftB.hasil || b.hasil || '').trim());

          if (filledA !== filledB) return filledA ? 1 : -1;

          return String(a.no_sampel || a.noSampel || '').localeCompare(
            String(b.no_sampel || b.noSampel || ''),
            'id',
            { numeric: true, sensitivity: 'base' }
          );
        });

        const totalSampel = sortedRows.length;

        const totalHasil = sortedRows.filter((row) => {
          const key = getSubkontrakRowKey(row);
          const draft = subkontrakDrafts[key] || {};

          return String(draft.hasil || row.hasil || '').trim();
        }).length;

        let statusRingkas = 'Belum Diisi';

        if (totalHasil > 0 && totalHasil < totalSampel) {
          statusRingkas = 'Sebagian Diisi';
        }

        if (totalSampel > 0 && totalHasil === totalSampel) {
          statusRingkas = 'Selesai';
        }

        return {
          ...group,
          rows: sortedRows,
          totalSampel,
          totalHasil,
          nomorSampelList: sortedRows
            .map((row) => row.no_sampel || row.noSampel)
            .filter(Boolean),
          statusRingkas,
        };
      })
      .sort((a, b) => {
        const missingA = a.totalSampel - a.totalHasil;
        const missingB = b.totalSampel - b.totalHasil;

        if (missingA !== missingB) return missingB - missingA;
        if (a.totalHasil !== b.totalHasil) return a.totalHasil - b.totalHasil;

        return String(a.parameter || '').localeCompare(String(b.parameter || ''), 'id', {
          sensitivity: 'base',
        });
      });
  }, [subkontrakRows, subkontrakDrafts]);

  const hasPersistedSubkontrakResult = (row = {}) =>
    Boolean(String(row.hasil || row.hasil_pengujian || '').trim());

  const handleChangeSubkontrakDraft = (row, field, value) => {
    if (hasPersistedSubkontrakResult(row)) return;

    const key = getSubkontrakRowKey(row);

    setSubkontrakDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const handleOpenSubkontrakDetail = (group) => {
    setSelectedSubkontrakGroup(group);
  };

  const handleCloseSubkontrakDetail = () => {
    setSelectedSubkontrakGroup(null);
  };

  const handleSaveSelectedSubkontrakResults = async () => {
    if (!selectedSubkontrakGroup) return;

    const payloadResults = selectedSubkontrakGroup.rows
      .filter((row) => !hasPersistedSubkontrakResult(row))
      .map((row) => {
        const key = getSubkontrakRowKey(row);
        const draft = subkontrakDrafts[key] || {};

        return {
          id_fppl_parameter_metode:
            row.id_fppl_parameter_metode || row.idFpplParameterMetode,
          no_sampel: row.no_sampel || row.noSampel,
          hasil: draft.hasil || '',
          tanggal_terima_hasil: draft.tanggal_terima_hasil || null,
        };
      });

    if (payloadResults.length === 0) {
      showWarning('Semua hasil subkontrak pada modal ini sudah pernah disubmit.');
      return;
    }

    const missingResult = payloadResults.find(
      (item) => !String(item.hasil || '').trim()
    );

    if (missingResult) {
      showWarning(`Hasil untuk sampel ${missingResult.no_sampel} wajib diisi.`);
      return;
    }

    const invalidResult = payloadResults.find(
      (item) => !isValidResultExpression(item.hasil)
    );

    if (invalidResult) {
      showWarning(
        `Hasil untuk sampel ${invalidResult.no_sampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`
      );
      return;
    }

    setSavingSubkontrak(true);

    try {
      const data = await penyeliaPenugasanApi.saveSubkontrakResults(payloadResults);

      showSuccess(data.message || 'Hasil subkontrak berhasil disimpan.');

      await fetchSubkontrakRows();
      await onAfterSave?.();

      setSelectedSubkontrakGroup(null);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal terhubung ke server.'));
    } finally {
      setSavingSubkontrak(false);
    }
  };

  return {
    loadingSubkontrak,
    groupedSubkontrakRows,
    selectedSubkontrakGroup,
    handleOpenSubkontrakDetail,
    handleCloseSubkontrakDetail,
    getSubkontrakRowKey,
    subkontrakDrafts,
    handleChangeSubkontrakDraft,
    getTodayInputValue,
    handleSaveSelectedSubkontrakResults,
    savingSubkontrak,
  };
}
