import { Badge } from '@/components/ui/badge.jsx';

const config = {
  DRAFT:       { label: 'Brouillon',   className: '' },
  OPEN:        { label: 'Ouverte',     className: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: 'En cours',   className: 'bg-orange-50 text-orange-700' },
  COMPLETED:   { label: 'Terminée',   className: 'bg-green-50 text-green-700' },
  CANCELLED:   { label: 'Annulée',    className: 'bg-red-50 text-red-700' },
};

const CategoryStatusBadge = ({ status }) => {
  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge className={className}>{label}</Badge>;
};

export default CategoryStatusBadge;
