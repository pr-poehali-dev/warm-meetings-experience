import { useAdmin } from "@/hooks/useAdmin";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminEventsList from "@/components/admin/AdminEventsList";
import AdminEventForm from "@/components/admin/AdminEventForm";
import AdminPackages from "@/components/admin/AdminPackages";
import AdminAddons from "@/components/admin/AdminAddons";
import AdminBookings from "@/components/admin/AdminBookings";
import AdminServiceAreas from "@/components/admin/AdminServiceAreas";
import AdminMultipliers from "@/components/admin/AdminMultipliers";
import AdminHolidays from "@/components/admin/AdminHolidays";
import AdminPromoCodes from "@/components/admin/AdminPromoCodes";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminAvailability from "@/components/admin/AdminAvailability";
import AdminEventSignups from "@/components/admin/AdminEventSignups";
import AdminRoles from "@/components/admin/AdminRoles";
import AdminBlog from "@/components/admin/AdminBlog";

export default function Admin() {
  const {
    token,
    setToken,
    currentView,
    setCurrentView,
    events,
    formData,
    setFormData,
    loading,
    handleSubmit,
    handleEdit,
    handleDuplicate,
    handleRepeat,
    handleDelete,
    handleToggleVisibility,
    handleLogout,
    resetFormData,
  } = useAdmin();

  if (!token) {
    return <AdminLogin onLoginSuccess={setToken} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case "overview":
        return (
          <AdminOverview
            events={events}
            onViewChange={setCurrentView}
            onEditEvent={handleEdit}
          />
        );
      case "list":
        return (
          <AdminEventsList
            events={events}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onRepeat={handleRepeat}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
            onNewEvent={() => {
              resetFormData();
              setCurrentView("add");
            }}
            repeatLoading={loading}
          />
        );
      case "add":
        return (
          <AdminEventForm
            formData={formData}
            loading={loading}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => setCurrentView("list")}
          />
        );
      case "event-signups":
        return <AdminEventSignups />;
      case "roles":
        return <AdminRoles />;
      case "blog":
        return <AdminBlog />;
      case "packages":
        return <AdminPackages />;
      case "addons":
        return <AdminAddons />;
      case "bookings":
        return <AdminBookings />;
      case "service-areas":
        return <AdminServiceAreas />;
      case "multipliers":
        return <AdminMultipliers />;
      case "holidays":
        return <AdminHolidays />;
      case "promo-codes":
        return <AdminPromoCodes />;
      case "settings":
        return <AdminSettings />;
      case "availability":
        return <AdminAvailability />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewEvent={resetFormData}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        {renderContent()}
      </main>
    </div>
  );
}