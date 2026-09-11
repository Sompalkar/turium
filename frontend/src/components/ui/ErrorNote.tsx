interface Props {
  message: string;
}

export function ErrorNote({ message }: Props) {
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
