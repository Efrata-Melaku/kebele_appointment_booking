import { useNavigate } from 'react-router';
import { Shield, Users, UserCircle } from 'lucide-react';

export function RoleSelector() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      title: 'Admin',
      description: 'Manage staff, services, and system settings',
      icon: Shield,
      color: 'bg-blue-500',
      path: '/admin'
    },
    {
      id: 'staff',
      title: 'Staff',
      description: 'View and manage assigned appointments',
      icon: Users,
      color: 'bg-green-500',
      path: '/staff'
    },
    {
      id: 'user',
      title: 'Resident',
      description: 'Book and manage your appointments',
      icon: UserCircle,
      color: 'bg-purple-500',
      path: '/user'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-3 text-gray-800">Kebele Appointment Management System</h1>
          <p className="text-gray-600">Select your role to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className={`${role.color} w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl mb-2 text-gray-800">{role.title}</h3>
                <p className="text-gray-600 text-sm">{role.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
