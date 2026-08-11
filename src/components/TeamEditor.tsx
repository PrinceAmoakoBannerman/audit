import type { TeamMember } from '../types/audit';
import { makeId } from '../utils/formatters';

interface TeamEditorProps {
  team: TeamMember[];
  onChange: (team: TeamMember[]) => void;
}

export default function TeamEditor({ team, onChange }: TeamEditorProps) {
  const update = (id: string, patch: Partial<TeamMember>) => {
    onChange(team.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const remove = (id: string) => onChange(team.filter((m) => m.id !== id));
  const add = () => onChange([...team, { id: makeId('member'), name: '', position: '', role: 'Member' }]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Team Composition</h2>
        <button type="button" onClick={add} className="btn-secondary text-xs">
          + Add Member
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={m.name}
                    onChange={(e) => update(m.id, { name: e.target.value })}
                    placeholder="Full name"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={m.position}
                    onChange={(e) => update(m.id, { position: e.target.value })}
                    placeholder="e.g. Snr. Electrical Engineer"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={m.role}
                    onChange={(e) => update(m.id, { role: e.target.value })}
                  >
                    <option value="Leader">Leader</option>
                    <option value="Member">Member</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => remove(m.id)} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
