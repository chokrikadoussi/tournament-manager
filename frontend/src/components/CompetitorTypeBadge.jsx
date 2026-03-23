import {Badge} from "@/components/ui/badge.jsx";

const config = {
  PLAYER: {label: 'Joueur', className: 'bg-blue-50 text-blue-700'},
  TEAM:   {label: 'Équipe', className: 'bg-green-50 text-green-700'},
};

const CompetitorTypeBadge = ({type}) => {
  const {label, className} = config[type] || {label: type, className: ''};
  return <Badge className={className}>{label}</Badge>;
};

export default CompetitorTypeBadge;
