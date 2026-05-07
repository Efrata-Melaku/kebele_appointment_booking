import { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';

export function HouseownerRecords() {
  const [searchTerm, setSearchTerm] = useState('');

  const residents = [
    { id: 1, name: 'Abebe Kebede', idNumber: 'KB-2024-001', phone: '+251-91-123-4567', address: 'Addis Ababa, Bole', registered: '2024-01-15', appointments: 5 },
    { id: 2, name: 'Tigist Haile', idNumber: 'KB-2024-002', phone: '+251-91-234-5678', address: 'Addis Ababa, Kirkos', registered: '2024-01-20', appointments: 3 },
    { id: 3, name: 'Mulugeta Assefa', idNumber: 'KB-2024-003', phone: '+251-91-345-6789', address: 'Addis Ababa, Arada', registered: '2024-02-01', appointments: 7 },
    { id: 4, name: 'Sara Mohammed', idNumber: 'KB-2024-004', phone: '+251-91-456-7890', address: 'Addis Ababa, Yeka', registered: '2024-02-10', appointments: 2 },
    { id: 5, name: 'Yohannes Desta', idNumber: 'KB-2024-005', phone: '+251-91-567-8901', address: 'Addis Ababa, Nifas Silk', registered: '2024-02-15', appointments: 4 },
  ];

  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-800">Houseowner Records</h2>
        <p className="text-gray-600 text-sm">View and manage registered residents</p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID number, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Name</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">ID Number</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Phone</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Address</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Registered</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Appointments</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No residents found
                  </td>
                </tr>
              ) : (
                filteredResidents.map((resident) => (
                  <tr key={resident.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-800">{resident.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{resident.idNumber}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{resident.phone}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{resident.address}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{resident.registered}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{resident.appointments}</td>
                    <td className="py-4 px-6">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Showing {filteredResidents.length} of {residents.length} residents</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Previous
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">1</button>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">2</button>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
