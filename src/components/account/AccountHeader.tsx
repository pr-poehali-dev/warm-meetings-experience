import CabinetHeader from "@/components/CabinetHeader";

interface AccountHeaderProps {
  handleLogout: () => void;
}

export default function AccountHeader({ handleLogout }: AccountHeaderProps) {
  return (
    <CabinetHeader
      icon="User"
      title="Личный кабинет"
      onLogout={handleLogout}
    />
  );
}
