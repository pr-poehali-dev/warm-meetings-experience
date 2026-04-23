import { useAdmin } from "@/hooks/useAdmin";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminTabs from "@/components/admin/AdminTabs";
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
import AdminUsers from "@/components/admin/AdminUsers";
import AdminBaths from "@/components/admin/AdminBaths";
import AdminMasters from "@/components/admin/AdminMasters";
import AdminEventModeration from "@/components/admin/AdminEventModeration";


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
        return <AdminRoles onViewChange={setCurrentView} />;
      case "blog":
        return <AdminBlog />;
      case "users":
        return <AdminUsers />;
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
      case "baths":
        return <AdminBaths />;
      case "masters":
        return <AdminMasters />;
      case "moderation":
        return <AdminEventModeration />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <AdminTabs
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewEvent={resetFormData}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full min-w-0">
        {renderContent()}
      </main>
    </div>
  );
}