export const GeoFilter = ({ onChange }: { onChange: (val: string) => void }) => (
  <select 
    className="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-lg text-sm focus:border-orange-500 mb-6"
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="">Todas as regiões</option>
    <option value="Sao Paulo">São Paulo</option>
    <option value="Rio de Janeiro">Rio de Janeiro</option>
  </select>
);
