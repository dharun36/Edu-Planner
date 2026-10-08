import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { teacherApi, StudentProgress } from '../../api/teacher';
import { Search, Users, Network, Loader2 } from 'lucide-react';

export default function StudentViewer() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const data = await teacherApi.getStudents();
        setStudents(data);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filtered = students.filter(s => 
    s.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA]" />
            Students Directory
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">Manage and monitor student learning plans and performance.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
          <input 
            type="text"
            placeholder="Search students..." 
            className="w-full bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-md pl-9 pr-3 py-2 text-xs text-[#0A0A0A] dark:text-[#FAFAFA] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#0A0A0A] dark:focus:border-[#FAFAFA]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-white dark:bg-[#171717] border border-[#E5E5E5] dark:border-[#262626] overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-[#0A0A0A] dark:text-[#FAFAFA] animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F5] dark:bg-[#202020] border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Skills</th>
                  <th className="px-5 py-3.5">Avg Score</th>
                  <th className="px-5 py-3.5">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#262626]">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-[#F5F5F5]/60 dark:hover:bg-[#202020]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E5E5E5] dark:bg-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA] flex items-center justify-center font-semibold text-xs shrink-0">
                          {s.user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA]">{s.user.full_name}</p>
                          <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">{s.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#525252] dark:text-[#A3A3A3]">
                      <div className="flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-[#737373]" />
                        <span>{s.skills_assessed} Assessed</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E5E5E5] dark:bg-[#262626] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0A0A0A] dark:bg-[#FAFAFA] rounded-full" 
                            style={{ width: `${s.average_score}%` }} 
                          />
                        </div>
                        <span className="font-medium font-mono text-[11px] text-[#0A0A0A] dark:text-[#FAFAFA]">{s.average_score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#737373] dark:text-[#A3A3A3]">
                      {s.last_active ? new Date(s.last_active).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-xs text-[#737373]">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
