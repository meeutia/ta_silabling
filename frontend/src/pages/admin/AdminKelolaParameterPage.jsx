import {
  BookOpen,
  Package,
  TestTube2,
  Truck,
} from 'lucide-react';
import { ConfirmDeleteModal } from '../../components/admin/parameter/AdminKelolaParameterFormControls';
import { ManagePaketParameterModal } from '../../components/admin/parameter/ManagePaketParameterModal';
import { PaketModal } from '../../components/admin/parameter/PaketModal';
import { ParameterMetodeModal } from '../../components/admin/parameter/ParameterMetodeModal';
import { RegulasiModal } from '../../components/admin/parameter/RegulasiModal';
import { TarifPengambilanModal } from '../../components/admin/parameter/TarifPengambilanModal';
import { AdminKelolaParameterTabs } from '../../components/admin/parameter/AdminKelolaParameterTabs';
import { useAdminKelolaParameter } from '../../components/admin/parameter/useAdminKelolaParameter';
import { ToastNotification } from '../../components/common/ToastNotification';

const PARAMETER_TABS = [
  {
    key: 'parameter_metode',
    label: 'Parameter & Metode Uji',
    icon: TestTube2,
  },
  {
    key: 'regulasi',
    label: 'Regulasi',
    icon: BookOpen,
  },
  {
    key: 'paket_baku_mutu',
    label: 'Paket Baku Mutu',
    icon: Package,
  },
  {
    key: 'tarif_pengambilan',
    label: 'Tarif Pengambilan',
    icon: Truck,
  },
];

export function AdminKelolaParameterPage() {
  const {
    activeTab,
    isLoading,
    isModalLoading,
    searchQuery,
    searchPlaceholder,
    filterStatus,
    currentFilterOptions,
    currentRowsCount,
    addButtonLabel,
    rowsByTab,
    toast,
    isModalOpen,
    modalType,
    selectedItem,
    formData,
    confirmDelete,
    paketParamForm,
    editingPaketParam,
    paketParameters,
    parametersOption,
    methodsOption,
    kategoriParameterOptions,
    regulasiData,
    jenisSampelOptions,
    handleChangeTab,
    handleOpenModal,
    handleCloseModal,
    handleFormChange,
    handleSubmit,
    handleAddCurrentTab,
    handleKelolaPaket,
    handleToggleMasterStatus,
    handlePaketParamFormChange,
    handleAddPaketParameter,
    handleEditPaketParamChange,
    handleStartEditPaketParameter,
    handleUpdatePaketParameter,
    openDeleteConfirm,
    handleConfirmDelete,
    setSearchQuery,
    setFilterStatus,
    setConfirmDelete,
    setEditingPaketParam,
  } = useAdminKelolaParameter();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Kelola Parameter Uji
            </h1>
            <p className="text-sm text-gray-600">
              Manajemen parameter pengujian, regulasi baku mutu, dan paket baku mutu laboratorium.
            </p>
          </div>
        </div>

        <AdminKelolaParameterTabs
          activeTab={activeTab}
          tabs={PARAMETER_TABS}
          isLoading={isLoading}
          searchQuery={searchQuery}
          searchPlaceholder={searchPlaceholder}
          filterStatus={filterStatus}
          filterOptions={currentFilterOptions}
          rowsCount={currentRowsCount}
          addButtonLabel={addButtonLabel}
          rowsByTab={rowsByTab}
          onChangeTab={handleChangeTab}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilterStatus}
          onAdd={handleAddCurrentTab}
          onOpenModal={handleOpenModal}
          onDeleteConfirm={openDeleteConfirm}
          onManagePaket={handleKelolaPaket}
          onToggleStatus={handleToggleMasterStatus}
        />

        <ToastNotification toast={toast} position="bottom" compact />

        {isModalOpen && (modalType === 'add_param_metode' || modalType === 'edit_param_metode') && (
          <ParameterMetodeModal
            selectedItem={selectedItem}
            formData={formData}
            parametersOption={parametersOption}
            methodsOption={methodsOption}
            kategoriParameterOptions={kategoriParameterOptions}
            onClose={handleCloseModal}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
          />
        )}

        {isModalOpen && (modalType === 'add_regulasi' || modalType === 'edit_regulasi') && (
          <RegulasiModal
            selectedItem={selectedItem}
            formData={formData}
            onClose={handleCloseModal}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
          />
        )}

        {isModalOpen && (modalType === 'add_paket' || modalType === 'edit_paket') && (
          <PaketModal
            selectedItem={selectedItem}
            formData={formData}
            regulasiData={regulasiData}
            jenisSampelOptions={jenisSampelOptions}
            onClose={handleCloseModal}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
          />
        )}

        {isModalOpen && modalType === 'manage_paket_param' && (
          <ManagePaketParameterModal
            selectedItem={selectedItem}
            paketParameters={paketParameters}
            parametersOption={parametersOption}
            isModalLoading={isModalLoading}
            paketParamForm={paketParamForm}
            editingPaketParam={editingPaketParam}
            onClose={handleCloseModal}
            onAddChange={handlePaketParamFormChange}
            onAddSubmit={handleAddPaketParameter}
            onEditChange={handleEditPaketParamChange}
            onStartEdit={handleStartEditPaketParameter}
            onCancelEdit={() => setEditingPaketParam(null)}
            onUpdateSubmit={handleUpdatePaketParameter}
            onDelete={(item) => openDeleteConfirm('paket_param', item)}
          />
        )}

        {isModalOpen && (modalType === 'add_tarif' || modalType === 'edit_tarif') && (
          <TarifPengambilanModal
            selectedItem={selectedItem}
            formData={formData}
            onClose={handleCloseModal}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          confirmDelete={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
