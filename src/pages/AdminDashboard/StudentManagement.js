import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBan, HiOutlineTrash, HiOutlineKey } from 'react-icons/hi';
import { listStudents, suspendStudent, deleteStudent } from '../../services/studentService';
import { sendPasswordReset } from '../../services/authService';
import './AdminTables.css';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (s) => { setLoading(true); listStudents({ search: s }).then(setStudents).finally(() => setLoading(false)); };
  useEffect(() => load(''), []);

  const handleSuspend = async (s) => {
    try { await suspendStudent(s.id, !s.suspended); toast.success(s.suspended ? 'Account reinstated' : 'Account suspended'); load(search); } catch (err) { toast.error(err.message); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student account?')) return;
    try { await deleteStudent(id); toast.success('Deleted'); load(search); } catch (err) { toast.error(err.message); }
  };
  const handleReset = async (email) => {
    try { await sendPasswordReset(email); toast.success('Password reset email sent'); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="admin-header"><h1>Student management</h1></div>
      <div className="admin-toolbar">
        <input className="input" placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
      </div>
      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="card admin-table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>University</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.first_name} {s.last_name}</td>
                  <td>{s.email}</td>
                  <td>{s.university}</td>
                  <td><span className="chip">{s.suspended ? 'Suspended' : 'Active'}</span></td>
                  <td className="admin-table__actions">
                    <button onClick={() => handleReset(s.email)} aria-label="Reset password"><HiOutlineKey /></button>
                    <button onClick={() => handleSuspend(s)} aria-label="Suspend"><HiOutlineBan /></button>
                    <button onClick={() => handleDelete(s.id)} aria-label="Delete"><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
