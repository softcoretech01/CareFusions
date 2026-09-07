interface PatientNameLinkProps {
  name: string;
  uhid: string;
  onClick: (uhid: string) => void;
}

export const PatientNameLink = ({ name, uhid, onClick }: PatientNameLinkProps) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (uhid) onClick(uhid);
      }}
      className="text-left font-semibold text-primary hover:text-primary/75 underline underline-offset-2 decoration-primary/40 hover:decoration-primary/80 transition-all duration-150 cursor-pointer"
      title={`View profile of ${name}`}
    >
      {name || '-'}
    </button>
  );
};

export default PatientNameLink;
