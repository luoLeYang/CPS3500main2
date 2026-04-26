'use client';

import { useEffect, useState } from 'react';

interface AdminPanelProps {
  currentUser: any;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [effectiveProposals, setEffectiveProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, proposalsRes] = await Promise.all([
        fetch('/api/users').then((r) => r.json()).catch(() => []),
        fetch('/api/proposals?status=approved').then((r) => r.json()).catch(() => []),
      ]);

      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const approved = Array.isArray(proposalsRes) ? proposalsRes : [];

      const studentsInDorm = allUsers.filter(
        (u: any) => u.role === 'resident' && (!currentUser?.dormId || u.dormId === currentUser.dormId)
      );

      setStudents(studentsInDorm);
      setEffectiveProposals(approved);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-lg p-6">Loading admin data...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Information</h2>
        {students.length === 0 ? (
          <p className="text-gray-500">No student records found for the current dorm.</p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-semibold text-gray-800">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Effective Dorm Proposals</h2>
        {effectiveProposals.length === 0 ? (
          <p className="text-gray-500">No approved proposals yet.</p>
        ) : (
          <div className="space-y-4">
            {effectiveProposals.map((proposal) => (
              <div key={proposal.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">{proposal.title}</p>
                <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                <p className="text-xs text-green-700 mt-2">Status: approved (effective)</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
