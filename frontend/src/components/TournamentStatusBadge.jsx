import {Badge} from "@/components/ui/badge.jsx";

const config = {
  DRAFT:       {label: 'Brouillon',            className: ''},
  OPEN:        {label: 'Inscription en cours',  className: 'bg-blue-50 text-blue-700'},
  IN_PROGRESS: {label: 'En cours',             className: 'bg-orange-50 text-orange-700'},
  COMPLETED:   {label: 'Terminé',              className: 'bg-green-50 text-green-700'},
  CANCELLED:   {label: 'Annulé',               className: 'bg-red-50 text-red-700'},
};

const TournamentStatusBadge = ({status}) => {
  const {label, className} = config[status] || {label: status, className: ''};
  return <Badge className={className}>{label}</Badge>;
};

export default TournamentStatusBadge;
