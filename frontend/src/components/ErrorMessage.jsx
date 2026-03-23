const ErrorMessage = ({message}) => {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
};

export default ErrorMessage;
