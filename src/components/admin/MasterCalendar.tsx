import Icon from "@/components/ui/icon";
import CalendarWeekGrid from "./calendar/CalendarWeekGrid";
import { SlotCreateDialog, BlockCreateDialog, TemplateApplyDialog } from "./calendar/CalendarDialogs";
import SlotDetailDialog from "./calendar/SlotDetailDialog";
import CalendarHeader from "./calendar/CalendarHeader";
import CalendarStatsPanel from "./calendar/CalendarStatsPanel";
import { useCalendarData } from "./calendar/useCalendarData";

const MasterCalendar = () => {
  const {
    viewMode,
    setViewMode,
    weekStart,
    loading,
    weekDays,
    hours,
    stats,
    services,
    templates,
    selectedTemplate,

    isSlotDialogOpen,
    setIsSlotDialogOpen,
    isBlockDialogOpen,
    setIsBlockDialogOpen,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    isSlotDetailOpen,
    setIsSlotDetailOpen,

    selectedSlot,
    slotBookings,

    slotForm,
    setSlotForm,
    blockForm,
    setBlockForm,
    templateForm,
    setTemplateForm,

    saving,

    goToPrevWeek,
    goToNextWeek,
    goToToday,

    getSlotsForDay,
    getBookingsForSlot,
    isDayBlocked,

    handleSlotClick,
    handleCreateSlot,
    handleDeleteSlot,
    handleCreateBlock,
    handleApplyTemplate,
    handleBookingAction,
    handleDeleteBlock,
  } = useCalendarData();

  return (
    <div className="min-h-screen bg-gray-50">
      <CalendarHeader
        weekStart={weekStart}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onOpenSlotDialog={() => setIsSlotDialogOpen(true)}
        onOpenTemplateDialog={() => setIsTemplateDialogOpen(true)}
        onOpenBlockDialog={() => setIsBlockDialogOpen(true)}
      />

      <CalendarStatsPanel stats={stats} />

      {viewMode === "week" ? (
        <CalendarWeekGrid
          weekDays={weekDays}
          hours={hours}
          loading={loading}
          getSlotsForDay={getSlotsForDay}
          getBookingsForSlot={getBookingsForSlot}
          isDayBlocked={isDayBlocked}
          onSlotClick={handleSlotClick}
          onDeleteBlock={handleDeleteBlock}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Icon name="Calendar" size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Месячный вид в разработке</p>
          <p className="text-gray-400 text-sm mt-1">Переключитесь на недельный вид для работы с расписанием</p>
        </div>
      )}

      <SlotCreateDialog
        open={isSlotDialogOpen}
        onOpenChange={setIsSlotDialogOpen}
        form={slotForm}
        onFormChange={setSlotForm}
        services={services}
        saving={saving}
        onSave={handleCreateSlot}
      />

      <BlockCreateDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        form={blockForm}
        onFormChange={setBlockForm}
        saving={saving}
        onSave={handleCreateBlock}
      />

      <TemplateApplyDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        form={templateForm}
        onFormChange={setTemplateForm}
        templates={templates}
        selectedTemplate={selectedTemplate}
        saving={saving}
        onApply={handleApplyTemplate}
      />

      <SlotDetailDialog
        open={isSlotDetailOpen}
        onOpenChange={setIsSlotDetailOpen}
        slot={selectedSlot}
        bookings={slotBookings}
        saving={saving}
        onBookingAction={handleBookingAction}
        onDeleteSlot={handleDeleteSlot}
      />
    </div>
  );
};

export default MasterCalendar;
