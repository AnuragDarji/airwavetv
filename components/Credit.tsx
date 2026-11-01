export default function Credit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm font-medium text-muted ${className}`}>
      Made by <span className="grad-text font-extrabold">Anurag</span>
    </p>
  );
}
