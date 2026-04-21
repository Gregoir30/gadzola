import { UserManagement } from "./AdminCollecteurs";

export default function AdminClients() {
  return (
    <UserManagement
      role="client"
      title="Clients"
      subtitle="Liste des clients enregistrés sur la plateforme Gadzola."
    />
  );
}
